import type { ZodArray, ZodObject, ZodType } from 'zod/v4';
import type {
  AnchorInternalFn,
  KeyLike,
  Linkable,
  LinkableSchema,
  ObjLike,
  StateMetadata,
  StateReferences,
} from './types.js';
import { CONTROLLER_REGISTRY, INIT_REGISTRY, META_REGISTRY, REFERENCE_REGISTRY, STATE_BUSY_LIST } from './registry.js';
import { broadcast, linkable } from './internal.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';
import { isArray } from '@beerush/utils';

/**
 * Creates a getter trap function for a reactive state object.
 *
 * This function generates a Proxy handler that intercepts property access operations
 * on reactive state objects. It handles various scenarios including:
 * - Circular reference detection and resolution
 * - Method binding for Set and Map instances
 * - Recursive state anchoring for nested objects
 * - Subscription linking for reactive dependencies
 * - Schema validation for strict mode compliance
 *
 * @template T - The type of the reactive state object
 * @template S - The type of the schema associated with the state
 * @param init - The initial state object to create a getter for
 * @param options - Optional state references containing configuration and metadata
 * @returns A getter function that handles property access with reactive behavior
 * @throws {Error} When called on a non-reactive state object
 */
export function createGetter<T extends Linkable, S extends LinkableSchema>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const { schema, subscribers, subscriptions } = meta;
  const { link, mutator, configs } = references;

  if (init instanceof Set || init instanceof Map) {
    return (target: ObjLike, prop: KeyLike) => {
      const value = target[prop] as (...args: unknown[]) => unknown;

      if (mutator?.has(value)) {
        return mutator?.get(value);
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    };
  }

  const getter = (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    let value = Reflect.get(target, prop, receiver) as Linkable;

    if (value === init) {
      captureStack.violation.circular(prop, getter);
      return INIT_REGISTRY.get(init) as T;
    }

    if (INIT_REGISTRY.has(value)) {
      value = INIT_REGISTRY.get(value) as Linkable;
    }

    // If the value is an array method, set method, or map method,
    // try to get the method trap from the mutator map.
    if (mutator?.has(value)) {
      return mutator?.get(value);
    }

    if (configs.recursive && !CONTROLLER_REGISTRY.has(value) && linkable(value)) {
      const childSchema = (
        isArray(init)
          ? (schema as never as ZodArray)?.unwrap?.()
          : (schema as never as ZodObject)?.shape?.[prop as string]
      ) as LinkableSchema;

      value = (anchor as AnchorInternalFn)(value as T, { ...configs, schema: childSchema }, meta.root ?? meta, meta);
    }

    // Link if the value is a reactive state and there is an active subscription.
    // Separating this process from creation is necessary to make sure
    // reading an existing state is linked properly.
    if (CONTROLLER_REGISTRY.has(value) && subscribers.size && !subscriptions.has(value)) {
      if (!(configs.recursive === 'flat' && Array.isArray(target))) {
        link(prop, value);
      }
    }

    return value;
  };

  return getter;
}

/**
 * Creates a setter trap function for a reactive state object.
 *
 * This function generates a Proxy handler that intercepts property assignment operations
 * on reactive state objects. It handles various scenarios including:
 * - Schema validation for strict mode compliance
 * - Circular reference detection and prevention
 * - Proper linking and unlinking of nested reactive states
 * - Broadcasting of state changes to subscribers
 * - Immutable state protection
 *
 * @template T - The type of the reactive state object
 * @template S - The type of the schema associated with the state
 * @param init - The initial state object to create a setter for
 * @param options - Optional state references containing configuration and metadata
 * @returns A setter function that handles property assignment with reactive behavior
 * @throws {Error} When called on a non-reactive state object
 */
export function createSetter<T extends Linkable, S extends LinkableSchema>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Set trap factory called on non-reactive state.`);
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const { schema, subscribers, subscriptions } = meta;
  const { unlink, configs } = references;

  const setter = (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    const current = Reflect.get(target, prop, receiver) as Linkable;

    if (current === value) {
      return true;
    }

    if (schema) {
      const childSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

      if (childSchema) {
        const result = childSchema.safeParse(value);

        if (result.success) {
          value = result.data as Linkable;
        } else {
          captureStack.error.validation(
            `Attempted to update property: "${prop as string}" of a state:`,
            result.error,
            configs.strict,
            setter
          );

          return !configs.strict;
        }
      }
    }

    Reflect.set(target, prop, value, receiver);

    if (INIT_REGISTRY.has(current)) {
      const state = INIT_REGISTRY.get(current) as Linkable;

      if (subscriptions.has(state)) {
        unlink(state);
      }
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(
        subscribers,
        target,
        {
          type: 'set',
          prev: current,
          keys: [prop as string],
          value: target[prop],
        },
        meta.id
      );
    }

    return true;
  };

  return setter;
}

/**
 * Creates a remover trap function for a reactive state object.
 *
 * This function generates a Proxy handler that intercepts property deletion operations
 * on reactive state objects. It handles various scenarios including:
 * - Schema validation for strict mode compliance (ensuring deleted properties can accept undefined)
 * - Proper unlinking of nested reactive states when deleted
 * - Broadcasting of deletion events to subscribers
 * - Circular reference handling
 *
 * @template T - The type of the reactive state object
 * @template S - The type of the schema associated with the state
 * @param init - The initial state object to create a remover for
 * @param options - Optional state references containing configuration and metadata
 * @returns A remover function that handles property deletion with reactive behavior
 * @throws {Error} When called on a non-reactive state object
 */
export function createRemover<T extends Linkable, S extends LinkableSchema>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Delete trap factory called on non-reactive state.`);
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const { schema, subscribers, subscriptions } = meta;
  const { unlink, configs } = references;

  const remover = (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    const childSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

    if (childSchema) {
      const result = childSchema.safeParse(undefined);

      if (!result.success) {
        captureStack.error.validation(
          `Attempted to delete property: "${prop as string}" of a state:`,
          result.error,
          configs.strict,
          remover
        );

        return !configs.strict;
      }
    }

    const current = Reflect.get(target, prop, receiver) as Linkable;

    Reflect.deleteProperty(target, prop);

    if (INIT_REGISTRY.has(current)) {
      const state = INIT_REGISTRY.get(current) as Linkable;

      if (subscriptions.has(state)) {
        unlink(state);
      }
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(subscribers, target, { type: 'delete', prev: current, keys: [prop] }, meta.id);
    }

    return true;
  };

  return remover;
}
