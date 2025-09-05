import type { ZodArray, ZodObject, ZodType } from 'zod/v4';
import type {
  AnchorInternalFn,
  Broadcaster,
  KeyLike,
  Linkable,
  LinkableSchema,
  ObjLike,
  StateChange,
  StateMetadata,
  StateRelation,
  TrapOverrides,
} from './types.js';
import {
  BROADCASTER_REGISTRY,
  CONTROLLER_REGISTRY,
  INIT_REGISTRY,
  META_REGISTRY,
  MUTATOR_REGISTRY,
  RELATION_REGISTRY,
  STATE_BUSY_LIST,
} from './registry.js';
import { linkable } from './internal.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';
import { isArray } from '@beerush/utils';
import { createCollectionGetter } from './collection.js';
import { getObserver } from './observable.js';
import { getDevTool } from './dev.js';
import { ObjectMutations, OBSERVER_KEYS } from './enum.js';

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
export function createGetter<T extends Linkable>(init: T, options?: TrapOverrides) {
  const meta = META_REGISTRY.get(init) as StateMetadata;

  if (!meta) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const devTool = getDevTool();
  const mutator = options?.mutator ?? MUTATOR_REGISTRY.get(init)?.mutatorMap;

  const { link } = RELATION_REGISTRY.get(init) as StateRelation;
  const { schema, observers, subscribers, subscriptions } = meta;
  const { configs } = options ?? meta;

  if (init instanceof Set || init instanceof Map) {
    return createCollectionGetter(init as Set<unknown>, options as never);
  }

  const getter = (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    const observer = getObserver();

    if (configs.observable && observer) {
      const track = observer.assign(init, observers);
      const tracked = track(Array.isArray(init) ? OBSERVER_KEYS.ARRAY_MUTATIONS : prop);

      if (!tracked && devTool?.onTrack) {
        devTool.onTrack(meta, observer, Array.isArray(init) ? OBSERVER_KEYS.ARRAY_MUTATIONS : prop);
      }
    }

    let value = Reflect.get(target, prop, receiver) as Linkable;

    // Trigger the dev tool callback if available.
    devTool?.onGet?.(meta, prop);

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
      return mutator.get(value);
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
export function createSetter<T extends Linkable>(init: T, options?: TrapOverrides) {
  const meta = META_REGISTRY.get(init) as StateMetadata;

  if (!meta) {
    throw new Error(`Set trap factory called on non-reactive state.`);
  }

  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  const { unlink } = RELATION_REGISTRY.get(init) as StateRelation;
  const { schema, subscriptions } = meta;
  const { configs } = options ?? meta;

  const setter = (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    // Make sure to always work with the underlying object (if exist).
    if (anchor.has(value)) value = anchor.get(value);

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
      const event: StateChange = {
        type: ObjectMutations.SET,
        keys: [prop as string],
        prev: current,
        value: target[prop],
      };

      broadcaster.emit(event, prop);
      broadcaster.broadcast(target, event, meta.id);

      // Trigger the dev tool callback if available.
      devTool?.onSet?.(meta, prop, value);
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
export function createRemover<T extends Linkable>(init: T, options?: TrapOverrides) {
  const meta = META_REGISTRY.get(init) as StateMetadata;

  if (!meta) {
    throw new Error(`Delete trap factory called on non-reactive state.`);
  }

  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  const { unlink } = RELATION_REGISTRY.get(init) as StateRelation;
  const { schema, subscriptions } = meta;
  const { configs } = options ?? meta;

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
      const event: StateChange = {
        type: ObjectMutations.DELETE,
        prev: current,
        keys: [prop],
      };

      broadcaster.emit(event, prop);
      broadcaster.broadcast(target, event, meta.id);

      // Trigger the dev tool callback if available.
      devTool?.onDelete?.(meta, prop);
    }

    return true;
  };

  return remover;
}
