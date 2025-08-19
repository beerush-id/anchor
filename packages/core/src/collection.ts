import { broadcast, linkable } from './internal.js';
import { CONTROLLER_REGISTRY, INIT_REGISTRY, META_REGISTRY, REFERENCE_REGISTRY, STATE_BUSY_LIST } from './registry.js';
import type {
  AnchorInternalFn,
  KeyLike,
  Linkable,
  LinkableSchema,
  MethodLike,
  SetMutation,
  StateMetadata,
  StateMutation,
  StateReferences,
} from './types.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';

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
export function createCollectionMutator<T extends Set<Linkable> | Map<string, Linkable>, S extends LinkableSchema>(
  init: T,
  options?: StateReferences<T, S>
) {
  const references = (options ?? REFERENCE_REGISTRY.get(init)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const { subscribers, subscriptions } = meta;
  const { link, unlink, configs } = references;
  const { deferred, immutable, recursive } = configs;

  const mutator = new WeakMap<WeakKey, MethodLike>();

  if (init instanceof Map && recursive && deferred) {
    const getFn = init.get as (key: string) => unknown;

    const targetFn = (key: string) => {
      let value = getFn.call(init, key) as Linkable;

      if (INIT_REGISTRY.has(value as Linkable)) {
        value = INIT_REGISTRY.get(value) as Linkable;
      }

      if (!CONTROLLER_REGISTRY.has(value as Linkable) && linkable(value)) {
        value = (anchor as AnchorInternalFn)(value, { ...configs }, meta.root ?? meta, meta);
      }

      if (CONTROLLER_REGISTRY.has(value) && subscribers.size && !subscriptions.has(value)) {
        link(key, value);
      }

      return value;
    };

    // Object.assign(init, { get: targetFn });
    mutator.set(init.get, targetFn as MethodLike);
  }

  if (immutable) {
    for (const method of ['set', 'add', 'delete', 'clear'] as SetMutation[]) {
      const methodFn = init[method as never] as (...args: unknown[]) => unknown;

      if (typeof methodFn === 'function') {
        const targetFn = () => {
          captureStack.violation.methodCall(method, targetFn);
          return mockReturn[method]?.(init as never);
        };

        mutator.set(methodFn, targetFn);
      }
    }

    return mutator;
  }

  for (const method of ['set', 'add']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;
    if (typeof methodFn !== 'function') continue;

    const targetFn = (keyValue: string, value?: Linkable) => {
      const oldValue = init instanceof Map ? init.get(keyValue) : undefined;
      const newValue = (method === 'set' ? value : keyValue) as Linkable;

      methodFn.apply(init, method === 'set' ? [keyValue, newValue] : [newValue]);

      if (INIT_REGISTRY.has(oldValue as Linkable)) {
        const childState = INIT_REGISTRY.get(oldValue as Linkable) as Linkable;

        if (subscriptions.has(childState)) {
          unlink(childState);
        }
      }

      if (!STATE_BUSY_LIST.has(init)) {
        broadcast(
          subscribers,
          init,
          {
            type: method as StateMutation,
            prev: oldValue,
            keys: method === 'set' ? [keyValue] : [],
            value: newValue,
          },
          meta.id
        );
      }

      // Collection mutation will always return itself for chaining.
      return INIT_REGISTRY.get(init);
    };

    // Object.assign(init, { [method]: targetFn });
    mutator.set(methodFn, targetFn as MethodLike);
  }

  for (const method of ['delete', 'clear']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;
    const targetFn = (keyValue?: unknown) => {
      const self = init as Set<Linkable> | Map<unknown, Linkable>;

      if (method === 'delete') {
        const current = (self instanceof Set ? keyValue : self.get(keyValue)) as Linkable;
        const result = methodFn.apply(self, [keyValue]);

        if (INIT_REGISTRY.has(current)) {
          const childState = INIT_REGISTRY.get(current) as Linkable;
          if (subscriptions.has(childState)) {
            unlink(childState as Linkable);
          }
        }

        broadcast(
          subscribers,
          self,
          {
            type: method,
            prev: current,
            keys: self instanceof Map ? [keyValue as string] : [],
          },
          meta.id
        );

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
          broadcast(
            subscribers,
            init,
            {
              type: method,
              prev: self instanceof Map ? entries : values,
              keys: [(self instanceof Map ? entries.map(([key]) => key as KeyLike) : []) as KeyLike[]] as never,
            },
            meta.id
          );
        }

        return result;
      }
    };

    // Object.assign(init, { [method]: targetFn });
    mutator.set(methodFn, targetFn);
  }

  return mutator;
}

createCollectionMutator.mock = mockReturn;
