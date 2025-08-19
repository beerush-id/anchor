import { isArray, isDate, isMap, isRegExp, isSet } from '@beerush/utils';
import type { Linkable, ObjLike, Recursive } from '../types.js';
import { captureStack } from '../exception.js';

/**
 * Deep clone an object with proper handling of circular references
 *
 * This function creates a deep copy of the provided object, handling various data types
 * including primitives, arrays, dates, regular expressions, maps, sets, and plain objects.
 * It properly manages circular references by tracking cloned objects in a WeakMap to
 * prevent infinite recursion.
 *
 * @template T - The type of the source object
 * @param {T} source - The object to clone
 * @param {Recursive} recursive - Whether to clone nested objects recursively (default: true)
 * @param {WeakMap<object, object>} clonedRefs - WeakMap to track cloned references (used internally for circular references)
 * @param {string} prop - Property name (used internally for exception message)
 * @returns {T} - A deep clone of the source object
 *
 * @example
 * // Clone a simple object
 * const obj = { a: 1, b: { c: 2 } };
 * const cloned = softClone(obj);
 *
 * @example
 * // Clone an array
 * const arr = [1, 2, [3, 4]];
 * const cloned = softClone(arr);
 *
 * @example
 * // Handle circular references
 * const obj: any = { a: 1 };
 * obj.self = obj;
 * const cloned = softClone(obj); // Won't cause infinite recursion
 */
export function softClone<T>(
  source: T,
  recursive: Recursive = true,
  clonedRefs: WeakMap<object, object> = new WeakMap(),
  prop: string = 'root'
): T {
  if (source === null || source === undefined || typeof source !== 'object') {
    return source as T;
  }

  if (clonedRefs.has(source)) {
    captureStack.violation.circular(prop, softClone);
    return clonedRefs.get(source) as T;
  }

  if (isDate(source)) {
    return new Date(source.getTime()) as T;
  } else if (isRegExp(source)) {
    return new RegExp(source.source, source.flags) as T;
  } else if (isArray(source)) {
    if (!recursive) return [...source] as T;

    const clonedArray: unknown[] = [];
    clonedRefs.set(source, clonedArray);

    source.forEach((item, index) => {
      clonedArray.push(softClone(item, recursive, clonedRefs, String(index)));
    });

    return clonedArray as T;
  } else if (isMap(source)) {
    if (!recursive) return new Map(source) as T;

    const clonedMap = new Map();
    clonedRefs.set(source, clonedMap);

    for (const [key, value] of source.entries()) {
      clonedMap.set(
        softClone(key, recursive, clonedRefs, 'map:key'),
        softClone(value, recursive, clonedRefs, key as string)
      );
    }

    return clonedMap as T;
  } else if (isSet(source)) {
    if (!recursive) return new Set(source) as T;

    const clonedSet = new Set();
    clonedRefs.set(source, clonedSet);

    for (const value of source.values()) {
      clonedSet.add(softClone(value, recursive, clonedRefs, 'set:add'));
    }

    return clonedSet as T;
  } else {
    if (!recursive) return { ...source };

    const clonedObject: Record<string | symbol | number, unknown> = {};
    clonedRefs.set(source, clonedObject);

    for (const [key, value] of softEntries(source as ObjLike)) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);

      if (descriptor?.set || descriptor?.get) {
        Object.defineProperty(clonedObject, key, { ...descriptor });
      } else {
        clonedObject[key] = softClone(value, recursive, clonedRefs, key as string);
      }
    }

    return clonedObject as T;
  }
}

/**
 * Get entries of an object including symbol keys
 *
 * This function returns an array of key-value pairs for the given object,
 * including both string and symbol keys. For Maps and Sets, it returns
 * their native entries iterator converted to an array.
 *
 * @template T - The type of the source object
 * @param {T} obj - The object to get entries from
 * @returns {Array<[keyof T, T[keyof T]]>} - Array of key-value pairs
 *
 * @example
 * // Get entries from a plain object
 * const obj = { a: 1, [Symbol('b')]: 2 };
 * const entries = softEntries(obj); // [['a', 1], [Symbol('b'), 2]]
 *
 * @example
 * // Get entries from a Map
 * const map = new Map([['a', 1], ['b', 2]]);
 * const entries = softEntries(map); // [['a', 1], ['b', 2]]
 */
export function softEntries<T extends ObjLike>(obj: T): Array<[keyof T, T[keyof T]]> {
  if ((obj as Linkable) instanceof Map || (obj as Linkable) instanceof Set) {
    return (obj as never as Map<string, unknown>).entries() as never;
  }

  const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;

  for (const sym of Object.getOwnPropertySymbols(obj)) {
    entries.push([sym, obj[sym as never]] as never);
  }

  return entries;
}

/**
 * Get keys of an object including symbol keys
 *
 * This function returns an array of keys for the given object,
 * including both string and symbol keys. For Maps and Sets, it returns
 * their native keys iterator converted to an array.
 *
 * @template T - The type of the source object
 * @param {T} obj - The object to get keys from
 * @returns {Array<keyof T>} - Array of keys
 *
 * @example
 * // Get keys from a plain object
 * const obj = { a: 1, [Symbol('b')]: 2 };
 * const keys = softKeys(obj); // ['a', Symbol('b')]
 *
 * @example
 * // Get keys from a Map
 * const map = new Map([['a', 1], ['b', 2]]);
 * const keys = softKeys(map); // ['a', 'b']
 */
export function softKeys<T extends ObjLike>(obj: T): Array<keyof T> {
  if (isMap(obj) || isSet(obj)) {
    return [...obj.keys()] as Array<keyof T>;
  }

  return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)] as Array<keyof T>;
}
