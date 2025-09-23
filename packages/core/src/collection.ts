import { linkable } from './internal.js';
import {
  BROADCASTER_REGISTRY,
  CONTROLLER_REGISTRY,
  INIT_REGISTRY,
  META_REGISTRY,
  MUTATOR_REGISTRY,
  RELATION_REGISTRY,
  STATE_BUSY_LIST,
} from './registry.js';
import type {
  AnchorInternalFn,
  Broadcaster,
  KeyLike,
  Linkable,
  MethodLike,
  StateBaseOptions,
  StateChange,
  StateLinkFn,
  StateMetadata,
  StateMutator,
  StateRelation,
  TrapOverrides,
} from './types.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';
import { COLLECTION_MUTATION_KEYS } from './constant.js';
import { getObserver, track } from './observable.js';
import { getDevTool } from './dev.js';
import { MapMutations, OBSERVER_KEYS, SetMutations } from './enum.js';

const mockReturn = {
  set(map: Map<unknown, unknown>) {
    return map;
  },
  add(set: Set<unknown>) {
    return set;
  },
  delete(map: Map<unknown, unknown>) {
    return map;
  },
  clear() {
    return undefined;
  },
};

export function createCollectionGetter<T extends Set<unknown> | Map<KeyLike, unknown>>(
  init: T,
  options?: TrapOverrides
) {
  const meta = META_REGISTRY.get(init) as StateMetadata;

  if (!meta) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const devTool = getDevTool();
  const mutator = options?.mutator ?? MUTATOR_REGISTRY.get(init)?.mutatorMap;

  const { link } = RELATION_REGISTRY.get(init) as StateRelation;
  const { observers } = meta;
  const { configs } = options ?? meta;

  return ((target, prop, receiver?) => {
    const observer = getObserver();

    if (configs.observable && !COLLECTION_MUTATION_KEYS.has(prop as never)) {
      track(init, observers, OBSERVER_KEYS.COLLECTION_MUTATIONS);
    }

    if (configs.observable && observer && !COLLECTION_MUTATION_KEYS.has(prop as never)) {
      const track = observer.assign(init, observers);
      const tracked = track(OBSERVER_KEYS.COLLECTION_MUTATIONS);

      if (!tracked && devTool?.onTrack) {
        devTool.onTrack(meta, observer, OBSERVER_KEYS.COLLECTION_MUTATIONS);
      }
    }

    if (prop === 'values' || prop === 'entries') {
      const originMethod = Reflect.get(target, prop, receiver);

      return function* () {
        const iterator = originMethod.apply(init);

        let result = iterator.next();
        while (!result.done) {
          if (prop === 'values') {
            const value = resolveState(result.value as Linkable, configs, meta, link);
            yield value;
          } else {
            const entry = result.value as [KeyLike, Linkable];
            const value = resolveState(entry[1], configs, meta, link, entry[0]);
            yield [entry[0], value];
          }

          result = iterator.next();
        }

        return undefined;
      };
    }

    const value = target[prop as never] as (...args: unknown[]) => unknown;

    if (mutator?.has(value)) {
      return mutator?.get(value);
    }

    if (typeof value === 'function') {
      return value.bind(target);
    }

    return value;
  }) as ProxyHandler<Set<unknown> | Map<string, unknown>>['get'];
}

function resolveState(
  value: Linkable,
  configs: StateBaseOptions,
  meta: StateMetadata,
  link: StateLinkFn,
  key?: KeyLike
) {
  if (!linkable(value)) return value;

  const { subscribers, subscriptions } = meta;

  // Resolve the state.
  if (INIT_REGISTRY.has(value as Linkable)) {
    value = INIT_REGISTRY.get(value) as Linkable;
  }

  // Create the state if it can't be resolved from the previous step.
  if (!CONTROLLER_REGISTRY.has(value as Linkable)) {
    value = (anchor as AnchorInternalFn)(value, { ...configs }, meta.root ?? meta, meta);
  }

  // Link the state if it's not linked and there are subscribers.
  if (key && CONTROLLER_REGISTRY.has(value) && subscribers.size && !subscriptions.has(value)) {
    link(key, value);
  }

  return value;
}

/**
 * Creates a mutator for a collection (Set or Map) that handles reactive state management.
 *
 * This function wraps collection methods to provide reactive behavior, including:
 * - Automatic linking/unlinking of nested reactive states
 * - Broadcasting of state changes to subscribers
 * - Support for both mutable and immutable modes
 * - Recursive handling of nested collections when configured
 *
 * @template T - The type of the collection (Set or Map)
 * @template S - The schema type for linkable references
 * @param init - The initial collection instance to create a mutator for
 * @param options - Optional state references configuration
 * @returns A WeakMap containing the wrapped mutation methods
 * @throws {Error} When called on a non-reactive state (no references found)
 */
export function createCollectionMutator<T extends Set<Linkable> | Map<string, Linkable>>(
  init: T,
  options?: TrapOverrides
) {
  const meta = META_REGISTRY.get(init) as StateMetadata;

  if (!meta) {
    throw new Error(`Collection trap factory called on non-reactive state.`);
  }

  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  const { subscriptions } = meta;
  const { link, unlink } = RELATION_REGISTRY.get(init) as StateRelation;
  const { configs } = options ?? meta;
  const { deferred, immutable, recursive } = configs;

  const mutator = {} as StateMutator<T>;
  const mutatorMap = new WeakMap<WeakKey, MethodLike>();

  // Map value getter trap.
  if (init instanceof Map && recursive && deferred) {
    const getFn = init.get as (key: string) => unknown;

    const targetFn = (key: string) => {
      const value = getFn.call(init, key) as Linkable;
      return resolveState(value, configs, meta, link, key);
    };

    // Object.assign(init, { get: targetFn });
    mutatorMap.set(init.get, targetFn as MethodLike);
  }

  // Set has trap.
  if (init instanceof Set && recursive && deferred) {
    const hasFn = init.has as (value: unknown) => boolean;
    const targetFn = (value: unknown) => {
      if (anchor.has(value as Linkable)) value = anchor.get(value as Linkable);
      return hasFn.call(init, value);
    };

    mutatorMap.set(init.has, targetFn as MethodLike);
  }

  // Collection iterator traps.
  if (recursive) {
    // Collection forEach trap.
    const forEachFn = (callback: (value: Linkable, key: KeyLike) => void, thisArg?: unknown) => {
      return init.forEach((value, key) => {
        value = resolveState(value, configs, meta, link, key as KeyLike);
        return callback(value, key as KeyLike);
      }, thisArg);
    };

    mutatorMap.set(init.forEach, forEachFn as MethodLike);
  }

  for (const method of ['set', 'add']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;
    if (typeof methodFn !== 'function') continue;

    const targetFn = (keyValue: string, value?: Linkable) => {
      // Make sure to always work with the underlying object (if exist).
      if (anchor.has(keyValue as never)) keyValue = anchor.get(keyValue as never);
      if (anchor.has(value as never)) value = anchor.get(value as never);

      const oldValue = init instanceof Map ? init.get(keyValue) : undefined;
      const newValue = (method === 'set' ? value : keyValue) as Linkable;

      // Escape directly if the Set already have the value, or the Map already have the value.
      // This prevents unnecessary state changes notifications.
      if (init instanceof Set && init.has(newValue)) return INIT_REGISTRY.get(init);
      if (init instanceof Map && oldValue === newValue) return INIT_REGISTRY.get(init);

      methodFn.apply(init, method === 'set' ? [keyValue, newValue] : [newValue]);

      if (INIT_REGISTRY.has(oldValue as Linkable)) {
        const childState = INIT_REGISTRY.get(oldValue as Linkable) as Linkable;

        if (subscriptions.has(childState)) {
          unlink(childState);
        }
      }

      if (!STATE_BUSY_LIST.has(init)) {
        const event: StateChange = {
          type: method === 'set' ? MapMutations.SET : SetMutations.ADD,
          prev: oldValue,
          keys: method === 'set' ? [keyValue] : [],
          value: newValue,
        };

        // Make sure to broadcast to subscribers first because observers might depend on a derived state.
        broadcaster.broadcast(init, event, meta.id);
        broadcaster.emit(event);

        devTool?.onCall?.(meta, method, method === 'set' ? [keyValue, newValue] : [keyValue]);
      }

      // Collection mutation will always return itself for chaining.
      return INIT_REGISTRY.get(init);
    };

    // Object.assign(init, { [method]: targetFn });
    mutatorMap.set(methodFn, targetFn as MethodLike);
    mutator[method as never] = targetFn as never;
  }

  for (const method of ['delete', 'clear']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;
    const targetFn = (keyValue?: unknown) => {
      // Escape early if the Set/Map is empty.
      // This prevents unnecessary state changes notifications.
      if (!init.size) return false;

      const self = init as Set<Linkable> | Map<unknown, Linkable>;

      if (method === 'delete') {
        // Make sure to always work with the underlying object (if exist).
        if (anchor.has(keyValue as Linkable)) keyValue = anchor.get(keyValue as Linkable);

        // Escape early if the Set/Map doesn't have the value.
        // This prevents unnecessary state changes notifications.
        if (!self.has(keyValue as Linkable)) return false;

        const current = (self instanceof Set ? keyValue : self.get(keyValue)) as Linkable;
        const result = methodFn.apply(self, [keyValue]);

        if (INIT_REGISTRY.has(current)) {
          const childState = INIT_REGISTRY.get(current) as Linkable;
          if (subscriptions.has(childState)) {
            unlink(childState as Linkable);
          }
        }

        if (!STATE_BUSY_LIST.has(init)) {
          const event: StateChange = {
            type: self instanceof Map ? MapMutations.DELETE : SetMutations.DELETE,
            prev: current,
            keys: self instanceof Map ? [keyValue as string] : [],
          };

          // Make sure to broadcast to subscribers first because observers might depend on a derived state.
          broadcaster.broadcast(self, event, meta.id);
          broadcaster.emit(event);

          devTool?.onCall?.(meta, method, [keyValue]);
        }

        return result;
      }

      if (method === 'clear') {
        const entries = [...self.entries()];
        const values = entries.map(([, value]) => value);
        const result = methodFn.apply(self, []);

        if (recursive && subscriptions.size) {
          for (const current of values) {
            const childState = INIT_REGISTRY.get(current) as Linkable;

            if (subscriptions.has(childState)) {
              unlink(childState as Linkable);
            }
          }
        }

        if (!STATE_BUSY_LIST.has(init)) {
          const event: StateChange = {
            type: self instanceof Map ? MapMutations.CLEAR : SetMutations.CLEAR,
            prev: self instanceof Map ? entries : values,
            keys: [(self instanceof Map ? entries.map(([key]) => key as KeyLike) : []) as KeyLike[]] as never,
          };

          // Make sure to broadcast to subscribers first because observers might depend on a derived state.
          broadcaster.broadcast(self, event, meta.id);
          broadcaster.emit(event);

          devTool?.onCall?.(meta, method, []);
        }

        return result;
      }
    };

    // Object.assign(init, { [method]: targetFn });
    mutatorMap.set(methodFn, targetFn);
    mutator[method as never] = targetFn as never;
  }

  if (immutable) {
    for (const method of ['set', 'add', 'delete', 'clear']) {
      const methodFn = init[method as never] as (...args: unknown[]) => unknown;

      if (typeof methodFn === 'function') {
        const targetFn = () => {
          captureStack.violation.methodCall(method as never, targetFn);
          return mockReturn[method as keyof typeof mockReturn]?.(init as never);
        };

        mutatorMap.set(methodFn, targetFn);
      }
    }
  }

  return { mutator, mutatorMap };
}

createCollectionMutator.mock = mockReturn;
