import { getDevTool } from './dev.js';
import { BatchMutations, StringMutations } from './enum.js';
import { BROADCASTER_REGISTRY, META_REGISTRY, STATE_BUSY_LIST, STATE_REGISTRY } from './registry.js';
import type { Assignable, AssignablePart, Broadcaster, Linkable, StateChange } from './types.js';
import { softEntries, softKeys } from './utils/clone.js';
import { isArray, isDefined, isMap, isSet, isString } from './utils/index.js';

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
export const assign = <T extends Assignable, P extends AssignablePart<T>>(target: T, source: P) => {
  if (!isSafeObject(target) && !isArray(target)) {
    throw new Error('Cannot assign to non-assignable state.');
  }

  if (!isSafeObject(source) && !isArray(source)) {
    throw new Error('Cannot assign using non-object value.');
  }

  const init = STATE_REGISTRY.get(target) as Linkable;
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  const prev: AssignablePart<T> = {};
  const entries = softEntries(source);
  if (!entries.length) return;

  const changes: unknown[] = [];

  for (const [key, val] of softEntries(source)) {
    if (isMap(target)) {
      prev[key as never] = target.get(key) as never;

      if (prev[key as never] !== val) {
        changes.push(key);
      }

      target.set(key, val);
    } else if (isSet(target)) {
      target.add(val);
    } else if (isSafeObject(target) || isArray(target)) {
      prev[key as keyof T] = target[key as keyof T];

      if (prev[key as keyof T] !== val) {
        changes.push(key);
      }

      target[key as never] = val;
    }
  }

  const event = {
    type: BatchMutations.ASSIGN,
    prev,
    keys: [],
    changes,
    value: source,
  } as StateChange;

  broadcaster?.emit(event);
  broadcaster?.broadcast(init, event, meta?.id);

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }

  if (meta && devTool?.onAssign) {
    devTool?.onAssign(meta, source);
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
  if (!isSafeObject(target) && !isArray(target)) {
    throw new Error('Cannot remove from non-assignable state.');
  }

  const init = STATE_REGISTRY.get(target) as Linkable;
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    target = init as T;
    STATE_BUSY_LIST.add(init);
  }

  const prev = {} as AssignablePart<T>;
  const changes: unknown[] = [];

  for (const key of keys) {
    if (isMap(target)) {
      if (target.has(key)) {
        changes.push(key);
      }

      prev[key as never] = target.get(key) as never;
      target.delete(key);
    } else if (isSet(target)) {
      target.delete(key);
    } else if (isSafeObject(target) || isArray(target)) {
      if (typeof target[key] !== 'undefined') {
        changes.push(key);
      }

      prev[key] = target[key];

      if (!isArray(target)) {
        delete target[key];
      }
    }
  }

  if (isArray(target)) {
    if (keys.length === 1) {
      target.splice(keys[0] as never, 1);
    } else {
      const values = [...target];
      target.length = 0;

      values.forEach((v, i) => {
        if (!keys.includes(String(i) as keyof T)) {
          target.push(v);
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

  broadcaster?.emit(event);
  broadcaster?.broadcast(init, event, meta?.id);

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }

  if (meta && devTool?.onRemove) {
    devTool?.onRemove(meta, keys);
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
  if (!isSafeObject(target) && !isArray(target)) {
    throw new Error('Cannot clear non-assignable state.');
  }

  const init = STATE_REGISTRY.get(target) as Linkable;
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }
  let changes: unknown[] = [];

  if (isMap(target)) {
    changes = [...target.keys()];
    target.clear();
  } else if (isSet(target)) {
    target.clear();
  } else if (isArray(target)) {
    changes = Array.from(target.keys());
    target.length = 0;
  } else if (isSafeObject(target)) {
    for (const key of softKeys(target)) {
      changes.push(key);
      delete target[key];
    }
  }

  const event = {
    type: BatchMutations.CLEAR,
    prev: {},
    keys: [],
    changes,
  } as StateChange;

  broadcaster?.emit(event);
  broadcaster?.broadcast(init, event, meta?.id);

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }

  if (meta && devTool?.onClear) {
    devTool?.onClear(meta);
  }
};

/**
 * Merges text to an existing string property in the target object.
 *
 * This function prepends or appends the given value to the existing string property.
 * It handles state management by notifying subscribers of the change.
 *
 * @template T - The type of the target object
 * @template K - The type of the property key
 * @param {T} target - The target object containing the string property
 * @param {K} prop - The property key of the string to modify
 * @param {T[K]} value - The string value to prepend or append
 * @param {boolean} isPrepend - Whether to prepend (true) or append (false) the value
 * @throws {Error} If the target is not a safe object, or if the property is not a string, or if the value is not a string
 */
const mergeText = <T, K extends keyof T>(target: T, prop: K, value: T[K], isPrepend: boolean = false) => {
  if (!isSafeObject(target) && !isArray(target)) {
    throw new Error(`Cannot ${isPrepend ? 'prepend' : 'append'} to non-object target.`);
  }

  const prev = target[prop];

  if (!isString(prev)) {
    throw new Error(`Cannot ${isPrepend ? 'prepend' : 'append'} to non-string property.`);
  }

  if (!isString(value)) {
    throw new Error(`Cannot ${isPrepend ? 'prepend' : 'append'} non-string value.`);
  }

  const { init, meta, devTool, broadcaster } = targetInfo(target as Linkable);

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  target[prop as never] = (isPrepend ? value + prev : prev + value) as never;

  const event = {
    type: isPrepend ? StringMutations.PREPEND : StringMutations.APPEND,
    prev,
    keys: [prop],
    value,
  } as StateChange;

  broadcaster?.emit(event);
  broadcaster?.broadcast(init, event, meta?.id);

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }

  if (meta && isPrepend && devTool?.onPrepend) {
    devTool?.onPrepend(meta, prop, value);
  }

  if (meta && !isPrepend && devTool?.onAppend) {
    devTool?.onAppend(meta, prop, value);
  }
};

/**
 * Appends a string value to an existing string property in the target object.
 *
 * This function appends the given value to the end of the existing string property.
 * It handles state management by notifying subscribers of the change.
 *
 * @template T - The type of the target object
 * @template K - The type of the property key
 * @param {T} target - The target object containing the string property
 * @param {K} prop - The property key of the string to modify
 * @param {T[K]} value - The string value to append
 */
export function append<T, K extends keyof T>(target: T, prop: K, value: T[K]) {
  mergeText(target, prop, value);
}

/**
 * Prepends a string value to an existing string property in the target object.
 *
 * This function prepends the given value to the beginning of the existing string property.
 * It handles state management by notifying subscribers of the change.
 *
 * @template T - The type of the target object
 * @template K - The type of the property key
 * @param {T} target - The target object containing the string property
 * @param {K} prop - The property key of the string to modify
 * @param {T[K]} value - The string value to prepend
 */
export function prepend<T, K extends keyof T>(target: T, prop: K, value: T[K]) {
  mergeText(target, prop, value, true);
}

function targetInfo(target: Linkable) {
  const init = STATE_REGISTRY.get(target) as Linkable;
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  return { init, meta, devTool, broadcaster };
}

function isSafeObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
