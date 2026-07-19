import { plugin } from '../extension/plugin.js';
import { BatchMutations } from '../shared/enum.js';
import type { Assignable, AssignablePart, Broadcaster, Linkable, ObjLike, StateChange } from '../types.js';
import { softEntries, softKeys } from '../utils/clone.js';
import { isArray, isDefined, isMap, isSet } from '../utils/index.js';
import { BROADCASTER_REGISTRY, META_REGISTRY, STATE_BUSY_LIST, STATE_REGISTRY } from './registry.js';

/**
 * Assigns a partial state to the given state.
 *
 * This function updates the target state object with values from the source object.
 * It supports objects, arrays, and maps. The function also handles state management
 * by notifying subscribers of the changes.
 *
 * @template T - The type of the target state object
 * @template P - The type of the source partial object
 * @param {T} target - The target state object to be updated
 * @param {P} source - The partial object containing the new values
 * @throws {Error} If the target is not an assignable state or if the source is not an object-like value
 */
export const assign = <T extends Assignable, P extends AssignablePart<T>>(target: T, source: P, replace?: boolean) => {
  const init = (STATE_REGISTRY.get(target) ?? target) as typeof target;
  const sourceInit = (STATE_REGISTRY.get(source) ?? source) as typeof source;

  if (!isSafeObject(init) && !isArray(init)) {
    throw new Error('Cannot assign to non-assignable state.');
  }

  if (!isSafeObject(sourceInit) && !isArray(sourceInit)) {
    throw new Error('Cannot assign using non-object value.');
  }

  const meta = META_REGISTRY.get(init as Linkable);
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  const prev: AssignablePart<T> = {};
  const entries = softEntries(sourceInit);
  if (!entries.length && !replace) return;

  const changes: unknown[] = [];
  const sourceKeys = new Set(entries.map(([k]) => k));

  // In replace mode, delete keys not present in source
  if (replace) {
    const targetKeys = isMap(init) ? init.keys() : softKeys(init as ObjLike);

    for (const key of targetKeys) {
      if (!sourceKeys.has(key as keyof P)) {
        changes.push(key);

        if (isMap(init)) {
          prev[key as never] = init.get(key) as never;
          init.delete(key);
        } else if (isSafeObject(init)) {
          prev[key as keyof T] = init[key as keyof T];
          delete init[key as never];
        }
      }
    }
  }

  for (const [key, val] of entries) {
    if (isMap(init)) {
      prev[key as never] = init.get(key) as never;

      if (prev[key as never] !== val) {
        changes.push(key);
      }

      init.set(key, val);
    } else if (isSet(init)) {
      init.add(val);
    } else if (isSafeObject(init) || isArray(init)) {
      prev[key as keyof T] = init[key as keyof T];

      if (prev[key as keyof T] !== val) {
        changes.push(key);
      }

      init[key as never] = val;
    }
  }

  const event = {
    type: replace ? BatchMutations.REPLACE : BatchMutations.ASSIGN,
    prev,
    keys: [],
    changes,
    value: sourceInit,
  } as StateChange;

  try {
    broadcaster?.emit(event);
    broadcaster?.broadcast(init, event, meta?.id);

    if (meta) {
      plugin.devTool?.onAssign?.(meta, sourceInit);
    }
  } finally {
    if (isDefined(init)) {
      STATE_BUSY_LIST.delete(init);
    }
  }
};

/**
 * Removes the given keys from the given state.
 *
 * This function removes specified keys from the target state object.
 * It supports objects, arrays, and maps. The function also handles state management
 * by notifying subscribers of the changes.
 *
 * @template T - The type of the target state object
 * @param {T} target - The target state object from which keys will be removed
 * @param {...keyof T} keys - The keys to be removed from the target object
 * @throws {Error} If the target is not an assignable state
 */
export const remove = <T extends Assignable>(target: T, ...keys: Array<keyof T>) => {
  const init = (STATE_REGISTRY.get(target) ?? target) as typeof target;

  if (!isSafeObject(init) && !isArray(init)) {
    throw new Error('Cannot remove from non-assignable state.');
  }

  const meta = META_REGISTRY.get(init as Linkable);
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  const prev = {} as AssignablePart<T>;
  const changes: unknown[] = [];

  for (const key of keys) {
    if (isMap(init)) {
      if (init.has(key)) {
        changes.push(key);
      }

      prev[key as never] = init.get(key) as never;
      init.delete(key);
    } else if (isSet(init)) {
      init.delete(key);
    } else if (isSafeObject(init) || isArray(init)) {
      if (typeof init[key] !== 'undefined') {
        changes.push(key);
      }

      prev[key] = init[key];

      if (!isArray(init)) {
        delete init[key];
      }
    }
  }

  if (isArray(init)) {
    if (keys.length === 1) {
      init.splice(keys[0] as never, 1);
    } else {
      const values = [...init];
      init.length = 0;

      values.forEach((v, i) => {
        if (!keys.includes(String(i) as keyof T)) {
          init.push(v);
        }
      });
    }
  }

  const event = {
    type: BatchMutations.REMOVE,
    prev,
    keys: [],
    changes,
    value: keys,
  } as StateChange;

  try {
    broadcaster?.emit(event);
    broadcaster?.broadcast(init, event, meta?.id);

    if (meta) {
      plugin.devTool?.onRemove?.(meta, keys);
    }
  } finally {
    if (isDefined(init)) {
      STATE_BUSY_LIST.delete(init);
    }
  }
};

/**
 * Clears the given state.
 *
 * This function clears the target state object, removing all its contents.
 * It supports objects, arrays, and maps. The function also handles state management
 * by notifying subscribers of the changes.
 *
 * @template T - The type of the target state object
 * @param {T} target - The target state object to be cleared
 * @throws {Error} If the target is not an assignable state
 */
export const clear = <T extends Assignable>(target: T) => {
  const init = (STATE_REGISTRY.get(target) ?? target) as typeof target;

  if (!isSafeObject(init) && !isArray(init)) {
    throw new Error('Cannot clear non-assignable state.');
  }

  const meta = META_REGISTRY.get(init as Linkable);
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }
  let changes: unknown[] = [];

  if (isMap(init)) {
    changes = [...init.keys()];
    init.clear();
  } else if (isSet(init)) {
    init.clear();
  } else if (isArray(init)) {
    changes = Array.from(init.keys());
    init.length = 0;
  } else if (isSafeObject(init)) {
    for (const key of softKeys(init)) {
      changes.push(key);
      delete init[key];
    }
  }

  const event = {
    type: BatchMutations.CLEAR,
    prev: {},
    keys: [],
    changes,
  } as StateChange;

  try {
    broadcaster?.emit(event);
    broadcaster?.broadcast(init, event, meta?.id);

    if (meta) {
      plugin.devTool?.onClear?.(meta);
    }
  } finally {
    if (isDefined(init)) {
      STATE_BUSY_LIST.delete(init);
    }
  }
};

function isSafeObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
