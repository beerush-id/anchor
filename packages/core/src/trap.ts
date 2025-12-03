import { anchor } from './anchor.js';
import { createCollectionGetter } from './collection.js';
import { getDevTool } from './dev.js';
import { ObjectMutations, OBSERVER_KEYS } from './enum.js';
import { captureStack } from './exception.js';
import { linkable } from './internal.js';
import { getObserver, track } from './observation.js';
import {
  BROADCASTER_REGISTRY,
  CONTROLLER_REGISTRY,
  INIT_REGISTRY,
  META_REGISTRY,
  MUTATOR_REGISTRY,
  RELATION_REGISTRY,
  STATE_BUSY_LIST,
  STATE_REGISTRY,
} from './registry.js';
import type {
  AnchorInternalFn,
  Broadcaster,
  KeyLike,
  Linkable,
  LinkableSchema,
  ModelArray,
  ModelObject,
  ObjLike,
  ParseResult,
  StateChange,
  StateMetadata,
  StateRelation,
  TrapOverrides,
} from './types.js';
import { isArray } from './utils/index.js';

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

    if (configs.observable) {
      track(init, observers, Array.isArray(init) ? OBSERVER_KEYS.ARRAY_MUTATIONS : prop);
    }

    if (configs.observable && observer) {
      const trackProp = observer.assign(init, observers);
      const tracked = trackProp(Array.isArray(init) ? OBSERVER_KEYS.ARRAY_MUTATIONS : prop);

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

    if (STATE_REGISTRY.has(value)) {
      // Unwrap the value it the init was created with Anchor's state as the value.
      // This to make sure that state always points to the underlying object.
      value = STATE_REGISTRY.get(value) as Linkable;
      Reflect.set(target, prop, value);
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
          ? (schema as never as ModelArray)?.unwrap?.()
          : (schema as never as ModelObject)?.shape?.[prop as string]
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

  return (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    // Make sure to always work with the underlying object (if exist).
    if (anchor.has(value)) value = anchor.get(value);

    const current = Reflect.get(target, prop, receiver) as Linkable;

    if (current === value) {
      return true;
    }

    if (schema) {
      let validation: ParseResult<unknown>;

      const childSchema = (schema as never as ModelObject)?.shape?.[prop as string];

      if (childSchema) {
        validation = childSchema.safeParse(value);
      } else {
        validation = schema.safeParse({ ...init, [prop as string]: value });
      }

      if (validation.success) {
        value = validation.data as Linkable;
      } else {
        broadcaster.catch(validation.error as never, {
          type: ObjectMutations.SET,
          keys: [prop as string],
          prev: current,
          value,
        });

        broadcaster.broadcast(
          target,
          {
            type: ObjectMutations.SET,
            keys: [prop as string],
            prev: current,
            error: validation.error as never,
            value,
          },
          meta.id
        );

        return !configs.strict;
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

      // Make sure to broadcast to subscribers first because observers might depend on a derived state.
      broadcaster.broadcast(target, event, meta.id);
      broadcaster.emit(event, prop);

      // Trigger the dev tool callback if available.
      devTool?.onSet?.(meta, prop, value);
    }

    return true;
  };
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

  return (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    // Escape directly if the property doesn't exist to prevent unnecessary work.
    if (!Object.getOwnPropertyDescriptor(target, prop)) return true;

    const current = Reflect.get(target, prop, receiver) as Linkable;
    const childSchema = (schema as never as ModelObject)?.shape?.[prop as string];

    if (childSchema) {
      const result = childSchema.safeParse(undefined);

      if (!result.success) {
        broadcaster.catch(result.error, {
          type: ObjectMutations.DELETE,
          prev: current,
          keys: [prop as string],
        });

        broadcaster.broadcast(
          init,
          {
            type: ObjectMutations.DELETE,
            prev: current,
            keys: [prop as string],
            error: result.error,
          },
          meta.id
        );

        return !configs.strict;
      }
    }

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

      // Make sure to broadcast to subscribers first because observers might depend on a derived state.
      broadcaster.broadcast(target, event, meta.id);
      broadcaster.emit(event, prop);

      // Trigger the dev tool callback if available.
      devTool?.onDelete?.(meta, prop);
    }

    return true;
  };
}
