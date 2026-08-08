import { anchor } from '../engine/anchor.js';
import { assign } from '../engine/helper.js';
import { INIT_GATEWAY_REGISTRY, STATE_REGISTRY } from '../engine/registry.js';
import { ARRAY_MUTATION_KEYS, ARRAY_MUTATIONS, COLLECTION_MUTATION_KEYS } from '../shared/constant.js';
import { type ArrayMutations, BatchMutations, MapMutations, ObjectMutations, SetMutations } from '../shared/enum.js';
import type {
  ArrayMutation,
  ArrayMutator,
  KeyLike,
  Linkable,
  MapMutator,
  SetMutator,
  StateChange,
  StateGateway,
} from '../types.js';
import { $do } from './observation.js';

export interface Replay {
  <T>(state: T, event: StateChange): void;
  any<T>(state: T, event: StateChange): void;
}

/**
 * Replays a state change event on the given state.
 *
 * This function takes a state object and a state change event, then applies
 * the change described in the event to the state. It handles various types
 * of mutations including object property sets/deletes, map operations,
 * set operations, array mutations, and batch assignments.
 *
 * The function uses a gateway system to perform the actual mutations,
 * ensuring that the appropriate mutator methods are called based on
 * the type of the target object (plain object, Map, Set, or Array).
 *
 * @template T - The type of the state object
 * @param state - The state object to apply the change to
 * @param event - The state change event to replay
 *
 * @internal
 */
export function replayFn<T>(state: T, event: StateChange) {
  $do(() => {
    const { type, prev, value } = event;

    // Walk through the state tree to find the target object.
    const { key, target } = getEventTarget(state, event);
    const init = STATE_REGISTRY.get(target as Linkable) as Linkable;
    const gateway = INIT_GATEWAY_REGISTRY.get(init as Linkable) as StateGateway;

    if (type === ObjectMutations.SET) {
      gateway.setter(target, key, value, target);
    } else if (type === MapMutations.SET) {
      (gateway.mutator as MapMutator<unknown, unknown>).set(key, value);
    } else if (type === SetMutations.ADD) {
      (gateway.mutator as SetMutator<unknown>).add(value);
    } else if (type === ObjectMutations.DELETE) {
      gateway.remover(target, key, target);
    } else if (type === MapMutations.DELETE || type === SetMutations.DELETE) {
      if (target instanceof Map) {
        (gateway.mutator as MapMutator<unknown, unknown>).delete(key);
      } else if (target instanceof Set) {
        (gateway.mutator as SetMutator<unknown>).delete(prev);
      }
    } else if (type === BatchMutations.ASSIGN) {
      // assign(anchor.find(target) as never, value as never);
      assign(target as never, value as never);
    } else if (type === BatchMutations.REPLACE) {
      // assign(anchor.find(target) as never, value as never);
      assign(target as never, value as never, true);
    } else if (type === MapMutations.CLEAR || type === SetMutations.CLEAR) {
      if (target instanceof Map) {
        (gateway.mutator as MapMutator<unknown, unknown>).clear();
      } else if (target instanceof Set) {
        (gateway.mutator as SetMutator<unknown>).clear();
      }
    } else if (ARRAY_MUTATIONS.includes(type as ArrayMutations)) {
      ((gateway.mutator as ArrayMutator<unknown>)[type as ArrayMutation] as (...args: unknown[]) => unknown)(
        ...(value as unknown[])
      );
    }
  });
}

replayFn.any = <T>(state: T, event: StateChange) => {
  $do(() => {
    const { type, prev, value } = event;

    // Walk through the state tree to find the target object.
    const { key, target } = getEventTarget(state, event);

    if (type === ObjectMutations.SET) {
      target[key as never] = value as never;
    } else if (type === MapMutations.SET) {
      (target as Map<unknown, unknown>).set(key, value);
    } else if (type === SetMutations.ADD) {
      (target as Set<unknown>).add(value);
    } else if (type === ObjectMutations.DELETE) {
      delete target[key as never];
    } else if (type === MapMutations.DELETE || type === SetMutations.DELETE) {
      if (target instanceof Map) {
        (target as Map<unknown, unknown>).delete(key);
      } else if (target instanceof Set) {
        (target as Set<unknown>).delete(prev);
      }
    } else if (type === BatchMutations.ASSIGN) {
      assign(target as never, value as never);
    } else if (type === BatchMutations.REPLACE) {
      assign(target as never, value as never, true);
    } else if (type === MapMutations.CLEAR || type === SetMutations.CLEAR) {
      if (target instanceof Map) {
        (target as Map<unknown, unknown>).clear();
      } else if (target instanceof Set) {
        (target as Set<unknown>).clear();
      }
    } else if (ARRAY_MUTATIONS.includes(type as ArrayMutations)) {
      ((target as unknown as ArrayMutator<unknown>)[type as ArrayMutation] as (...args: unknown[]) => unknown)(
        ...(value as unknown[])
      );
    }
  });
};

export const replay = replayFn as Replay;

/**
 * Reverts a state change event on the given state.
 *
 * This function takes a state object and a state change event, then undoes
 * the change described in the event to revert the state back to its previous
 * state. It handles various types of mutations including object property
 * sets/deletes, map operations, set operations, array mutations, and batch assignments.
 *
 * The function uses a gateway system to perform the actual mutations,
 * ensuring that the appropriate mutator methods are called based on
 * the type of the target object (plain object, Map, Set, or Array).
 *
 * @template T - The type of the state object
 * @param state - The state object to revert the change on
 * @param event - The state change event to revert
 */
export function rollback<T>(state: T, event: StateChange) {
  $do(() => {
    const init = STATE_REGISTRY.get(state as Linkable) as Linkable;
    const { type, prev } = event;
    const { key, target } = getEventTarget(init, event);
    const gateway = INIT_GATEWAY_REGISTRY.get(target as Linkable) as StateGateway;

    if (type === ObjectMutations.SET) {
      if (typeof prev === 'undefined') {
        gateway.remover(target, key, target);
      } else {
        gateway.setter(target, key, prev, target);
      }
      target[key as never] = prev as never;
    } else if (type === MapMutations.SET) {
      if (typeof prev === 'undefined') {
        // target.delete(key);
        (gateway.mutator as MapMutator<unknown, unknown>).delete(key);
      } else {
        // target.set(key, prev);
        (gateway.mutator as MapMutator<unknown, unknown>).set(key, prev);
      }
    } else if (type === SetMutations.ADD) {
      (gateway.mutator as SetMutator<unknown>).delete(event.value);
      // (target[key as never] as Set<unknown>).delete(event.value);
    } else if (type === ObjectMutations.DELETE) {
      // (target as ObjLike)[key] = prev;
      gateway?.setter(target, key, prev, target);
    } else if (type === MapMutations.DELETE || type === SetMutations.DELETE) {
      if (target instanceof Map) {
        // target.set(key, prev);
        (gateway.mutator as MapMutator<unknown, unknown>).set(key, prev);
      } else if (target instanceof Set) {
        // (target[key as never] as Set<unknown>).add(prev);
        (gateway.mutator as SetMutator<unknown>).add(prev);
      }
    } else if (type === BatchMutations.ASSIGN) {
      // assign(target as never, prev as never);
      assign(anchor.find(target) as never, prev as never);
    } else if (type === BatchMutations.REPLACE) {
      // assign(target as never, prev as never);
      assign(anchor.find(target) as never, prev as never, true);
    } else if (type === MapMutations.CLEAR || type === SetMutations.CLEAR) {
      if (target instanceof Map) {
        for (const [key, value] of prev as [[unknown, unknown]]) {
          // target.set(key as never, value);
          (gateway.mutator as MapMutator<unknown, unknown>).set(key, value);
        }
      } else if (target instanceof Set) {
        for (const value of prev as [unknown]) {
          // target.add(value);
          (gateway.mutator as SetMutator<unknown>).add(value);
        }
      }
    } else if (ARRAY_MUTATIONS.includes(type as never)) {
      const items = target as unknown[];

      if (type === 'shift') {
        // items.unshift(prev);
        (gateway.mutator as ArrayMutator<unknown>).unshift(prev);
      } else if (type === 'pop') {
        // items.push(prev);
        (gateway.mutator as ArrayMutator<unknown>).push(prev);
      } else if (type === 'push') {
        const initItems = (anchor.get as (item: unknown, silent: boolean) => unknown[])(items, true);
        for (const item of event.value as unknown[]) {
          const index = initItems.indexOf(item);
          if (index >= 0) {
            // items.splice(index, 1);
            (gateway.mutator as ArrayMutator<unknown>).splice(index, 1);
          }
        }
      } else if (type === 'unshift') {
        // items.shift();
        (gateway.mutator as ArrayMutator<unknown>).shift();
      } else {
        // items.splice(0, items.length, ...(prev as unknown[]));
        (gateway.mutator as ArrayMutator<unknown>).splice(0, items.length, ...(prev as unknown[]));
      }
    }
  });
}

/**
 * Retrieves the target object and key for a nested property access.
 *
 * This function is used internally by the history management system to
 * locate the specific object and property that was modified. It takes
 * a state object and a path of keys, then traverses the object hierarchy
 * to find the parent object and the final key.
 *
 * @template T - The type of the state object
 * @param state - The root state object to traverse
 * @param event - The state change event containing information about the modified property
 * @returns An object containing the final key and its parent target object
 *
 * @internal
 */
export function getEventTarget<T>(state: T, event: StateChange) {
  if (!event.keys.length) {
    return { key: '', target: state as Linkable };
  }

  const keys = [...event.keys];
  const key = isBatchMutation(event) ? '' : (keys.pop() as KeyLike);

  const target =
    keys.reduce((parent, key) => {
      return getValue(parent, key) as T;
    }, state) as Linkable;

  return { key, target };
}

function isBatchMutation(event: StateChange) {
  return (
    (ARRAY_MUTATION_KEYS.has(event.type as ArrayMutations) ||
      COLLECTION_MUTATION_KEYS.has(event.type as SetMutations)) &&
    event.type !== MapMutations.SET &&
    event.type !== MapMutations.DELETE
  );
}

/**
 * Retrieves a value from a target object using a specified key.
 *
 * This function is used internally by the history management system to
 * access values in various data structures including Maps and plain objects.
 * It provides a unified interface for value retrieval regardless of the
 * underlying data structure.
 *
 * @template T - The type of the target object
 * @param target - The target object from which to retrieve the value
 * @param key - The key used to access the value
 * @returns The value associated with the key, or undefined if not found
 *
 * @internal
 */
function getValue<T>(target: T, key: KeyLike) {
  if (target instanceof Map) {
    return target.get(key);
  }

  return (target as Record<KeyLike, unknown>)[key];
}
