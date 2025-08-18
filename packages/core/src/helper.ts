import type { ObjLike } from './types.js';
import { STATE_BUSY_LIST, STATE_REGISTRY, SUBSCRIBER_REGISTRY } from './registry.js';
import { isArray, isDefined, isMap, isObjectLike, isSet } from '@beerush/utils';
import { broadcast } from './internal.js';
import { softEntries, softKeys } from './utils/clone.js';

export type Assignable = ObjLike | Map<unknown, unknown> | Array<unknown>;
export type AssignablePart<T> = Partial<Record<keyof T, T[keyof T]>>;

/**
 * Assigns a partial state to the given state.
 * @param {T} target
 * @param {Partial<T>} source
 */
export const assign = <T extends Assignable, P extends AssignablePart<T>>(target: T, source: P) => {
  if (!isObjectLike(target) && !isMap(target) && !isArray(target)) {
    throw new Error('Cannot assign to non-assignable state.');
  }

  if (!isObjectLike(source)) {
    throw new Error('Cannot assign using non-object value.');
  }

  const init = STATE_REGISTRY.get(target);
  const subscribers = SUBSCRIBER_REGISTRY.get(target);

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  const prev: AssignablePart<T> = {};

  for (const [key, val] of softEntries(source)) {
    if (isMap(target)) {
      prev[key as never] = target.get(key) as never;
      target.set(key, val);
    } else if (isObjectLike(target) || isArray(target)) {
      prev[key as keyof T] = target[key as keyof T];
      target[key as never] = val;
    }
  }

  if (subscribers?.size) {
    broadcast(subscribers, init, {
      type: 'assign',
      prev,
      keys: [],
      value: source,
    });
  }

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }
};

/**
 * Removes the given keys from the given state.
 * @param {T} target
 * @param {keyof T} keys
 */
export const remove = <T extends Assignable>(target: T, ...keys: Array<keyof T>) => {
  if (!isObjectLike(target) && !isMap(target) && !isArray(target)) {
    throw new Error('Cannot remove from non-assignable state.');
  }

  const init = STATE_REGISTRY.get(target);
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
    } else if (isObjectLike(target) || isArray(target)) {
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

  if (subscribers?.size) {
    broadcast(subscribers, init, {
      type: 'remove',
      prev,
      keys: [],
      value: keys,
    });
  }

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }
};

/**
 * Clears the given state.
 * @param {T} target
 */
export const clear = <T extends Assignable>(target: T) => {
  if (!isObjectLike(target) && !isMap(target) && !isArray(target) && !isSet(target)) {
    throw new Error('Cannot clear non-assignable state.');
  }

  const init = STATE_REGISTRY.get(target);
  const subscribers = SUBSCRIBER_REGISTRY.get(target);

  if (isDefined(init)) {
    STATE_BUSY_LIST.add(init);
  }

  if (isMap(target)) {
    target.clear();
  } else if (isArray(target)) {
    target.length = 0;
  } else if (isObjectLike(target)) {
    for (const key of softKeys(target)) {
      delete target[key];
    }
  }

  if (subscribers?.size) {
    broadcast(subscribers, init, {
      type: 'clear',
      prev: {},
      keys: [],
      value: undefined,
    });
  }

  if (isDefined(init)) {
    STATE_BUSY_LIST.delete(init);
  }
};
