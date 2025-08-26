import type { Linkable, ObjLike } from './types.js';
import {
  CONTROLLER_REGISTRY,
  META_REGISTRY,
  STATE_BUSY_LIST,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
} from './registry.js';
import { isArray, isDefined, isMap, isObjectLike, isSet } from '@beerush/utils';
import { broadcast } from './internal.js';
import { softEntries, softKeys } from './utils/clone.js';
import { getDevTool } from './dev.js';

export type Assignable = ObjLike | Map<unknown, unknown> | Array<unknown>;
export type AssignablePart<T> = Partial<Record<keyof T, T[keyof T]>>;

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
  if ((!isSafeObject(target) && !isArray(target)) || isSet(target)) {
    throw new Error('Cannot assign to non-assignable state.');
  }

  if (!isObjectLike(source)) {
    throw new Error('Cannot assign using non-object value.');
  }

  const init = STATE_REGISTRY.get(target);
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const controller = CONTROLLER_REGISTRY.get(target);
  const subscribers = SUBSCRIBER_REGISTRY.get(target);

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  const prev: AssignablePart<T> = {};

  for (const [key, val] of softEntries(source)) {
    if (isMap(target)) {
      prev[key as never] = target.get(key) as never;
      target.set(key, val);
    } else if (isSafeObject(target) || isArray(target)) {
      prev[key as keyof T] = target[key as keyof T];
      target[key as never] = val;
    }
  }

  if (meta?.observers?.size) {
    for (const observer of meta.observers) {
      observer.onChange({
        type: 'assign',
        prev,
        keys: [],
        value: source,
      });
    }
  }

  if (subscribers?.size) {
    broadcast(
      subscribers,
      init,
      {
        type: 'assign',
        prev,
        keys: [],
        value: source,
      },
      controller?.meta.id
    );
  }

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

  const init = STATE_REGISTRY.get(target);
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const controller = CONTROLLER_REGISTRY.get(target);
  const subscribers = SUBSCRIBER_REGISTRY.get(target);

  if (isDefined(init)) {
    target = init as T;
    STATE_BUSY_LIST.add(init);
  }

  const prev = {} as AssignablePart<T>;

  for (const key of keys) {
    if (isMap(target)) {
      prev[key as never] = target.get(key) as never;
      target.delete(key);
    } else if (isSafeObject(target) || isArray(target)) {
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

  if (meta?.observers?.size) {
    for (const observer of meta.observers) {
      observer.onChange({
        type: 'remove',
        prev,
        keys: [],
        value: keys,
      });
    }
  }

  if (subscribers?.size) {
    broadcast(
      subscribers,
      init,
      {
        type: 'remove',
        prev,
        keys: [],
        value: keys,
      },
      controller?.meta.id
    );
  }

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

  const init = STATE_REGISTRY.get(target);
  const meta = META_REGISTRY.get(init as Linkable);
  const devTool = getDevTool();
  const controller = CONTROLLER_REGISTRY.get(target);
  const subscribers = SUBSCRIBER_REGISTRY.get(target);

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  if (isMap(target)) {
    target.clear();
  } else if (isArray(target)) {
    target.length = 0;
  } else if (isSafeObject(target)) {
    for (const key of softKeys(target)) {
      delete target[key];
    }
  }

  if (meta?.observers?.size) {
    for (const observer of meta.observers) {
      observer.onChange({
        type: 'clear',
        prev: {},
        keys: [],
      });
    }
  }

  if (subscribers?.size) {
    broadcast(
      subscribers,
      init,
      {
        type: 'clear',
        prev: {},
        keys: [],
        value: undefined,
      },
      controller?.meta.id
    );
  }

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }

  if (meta && devTool?.onClear) {
    devTool?.onClear(meta);
  }
};

function isSafeObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
