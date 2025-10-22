import { isArray, isDate, isMap, isRegExp, isSet, typeOf } from './inspector.js';
import type { Linkable, ObjLike, Recursive } from '../types.js';

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
 * @returns {T} - A deep clone of the source object
 */
export function softClone<T>(
  source: T,
  recursive: Recursive = true,
  clonedRefs: WeakMap<object, object> = new WeakMap()
): T {
  if (source === null || source === undefined || typeof source !== 'object') {
    return source as T;
  }

  if (clonedRefs.has(source)) {
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

    source.forEach((item) => {
      clonedArray.push(softClone(item, recursive, clonedRefs));
    });

    return clonedArray as T;
  } else if (isMap(source)) {
    if (!recursive) return new Map(source) as T;

    const clonedMap = new Map();
    clonedRefs.set(source, clonedMap);

    for (const [key, value] of source.entries()) {
      clonedMap.set(softClone(key, recursive, clonedRefs), softClone(value, recursive, clonedRefs));
    }

    return clonedMap as T;
  } else if (isSet(source)) {
    if (!recursive) return new Set(source) as T;

    const clonedSet = new Set();
    clonedRefs.set(source, clonedSet);

    for (const value of source.values()) {
      clonedSet.add(softClone(value, recursive, clonedRefs));
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
        clonedObject[key] = softClone(value, recursive, clonedRefs);
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
 */
export function softEntries<T extends ObjLike>(obj: T): Array<[keyof T, T[keyof T]]>;
export function softEntries<T extends unknown[]>(arr: T): [number | string, T[number]];
export function softEntries<T extends Map<unknown, unknown>>(
  map: T
): T extends Map<infer K, infer V> ? Array<[K, V]> : never;
export function softEntries<T extends Set<unknown>>(set: T): T extends Set<infer V> ? Array<[number, V]> : never;
export function softEntries<T extends ObjLike>(obj: T): Array<[keyof T, T[keyof T]]> {
  if ((obj as Linkable) instanceof Map || (obj as Linkable) instanceof Set) {
    return [...(obj as never as Map<string, unknown>).entries()] as never;
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
 */
export function softKeys<T extends ObjLike>(obj: T): Array<keyof T>;
export function softKeys<T extends unknown[]>(arr: T): [number | string];
export function softKeys<T extends Map<unknown, unknown>>(map: T): T extends Map<infer K, unknown> ? Array<K> : never;
export function softKeys<T extends Set<unknown>>(set: T): T extends Set<infer V> ? Array<V> : never;
export function softKeys<T extends ObjLike>(obj: T): Array<keyof T> {
  if (isMap(obj) || isSet(obj)) {
    return [...obj.keys()] as Array<keyof T>;
  }

  return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)] as Array<keyof T>;
}

/**
 * Get values of an object including symbol keys
 *
 * This function returns an array of values for the given object,
 * including both string and symbol keys. For Maps and Sets, it returns
 * their native values iterator converted to an array.
 *
 * @template T - The type of the source object
 * @param {T} obj - The object to get values from
 * @returns {Array<T[keyof T]>} - Array of values
 */
export function softValues<T extends ObjLike>(obj: T): Array<T[keyof T]>;
export function softValues<T extends unknown[]>(arr: T): [number | string, T[number]];
export function softValues<T extends Map<unknown, unknown>>(map: T): T extends Map<unknown, infer V> ? Array<V> : never;
export function softValues<T extends Set<unknown>>(set: T): T extends Set<infer V> ? Array<V> : never;
export function softValues<T extends ObjLike>(obj: T): Array<T[keyof T]> {
  if (Array.isArray(obj)) return obj;
  if (isMap(obj) || isSet(obj)) {
    return [...obj.values()] as Array<T[keyof T]>;
  }

  const values = Object.values(obj);

  for (const sym of Object.getOwnPropertySymbols(obj)) {
    values.push(obj[sym as never]);
  }

  return values as Array<T[keyof T]>;
}

type InternalEqualFn = <A, B>(a: A, b: B, deep?: boolean, comparedRefs?: WeakMap<object, Set<object>>) => boolean;

/**
 * Performs a shallow/deep equality comparison between two values.
 *
 * This function checks if two values are equal. It handles primitives,
 * Dates, RegExps, Arrays, Maps, Sets, and plain objects. For complex types,
 * it performs a shallow/deep comparison of their contents.
 *
 * @template T - The type of the values to compare.
 * @param {T} a - The first value to compare.
 * @param {T} b - The second value to compare.
 * @param {boolean} deep - If true, performs a deep comparison.
 * @returns {boolean} - True if the values are shallowly equal, false otherwise.
 */
export function softEqual<A, B>(a: A, b: B, deep?: boolean): boolean;
export function softEqual<A, B>(
  a: A,
  b: B,
  deep: boolean = false,
  comparedRefs: WeakMap<object, Set<object>> = new WeakMap()
): boolean {
  if ((a as never) === b) return true;
  if (typeOf(a) !== typeOf(b)) return false;

  // Handle circular references (edge cases)
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    if (comparedRefs.has(a as object)) {
      const comparedSet = comparedRefs.get(a as object);
      if (comparedSet?.has(b as object)) {
        return true; // Assume equal if we're in a circular comparison
      }
    }

    // Mark these objects as being compared
    if (!comparedRefs.has(a as object)) {
      comparedRefs.set(a as object, new Set());
    }
    comparedRefs.get(a as object)?.add(b as object);

    if (!comparedRefs.has(b as object)) {
      comparedRefs.set(b as object, new Set());
    }
    comparedRefs.get(b as object)?.add(a as object);
  }

  if (isDate(a) && isDate(b)) return a.getTime() === b.getTime();
  if (isRegExp(a) && isRegExp(b)) return a.source === b.source && a.flags === b.flags;

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    if (!deep) {
      return a.every((val, i) => val === b[i]);
    }
    return a.every((val, i) => (softEqual as InternalEqualFn)(val, b[i], deep, comparedRefs));
  }

  if (isMap(a) && isMap(b)) {
    if (a.size !== b.size) return false;
    if (!deep) {
      for (const [key, value] of a.entries()) {
        if (!b.has(key) || b.get(key) !== value) return false;
      }
    } else {
      for (const [key, value] of a.entries()) {
        if (!b.has(key) || !(softEqual as InternalEqualFn)(value, b.get(key), deep, comparedRefs)) return false;
      }
    }
    return true;
  }

  if (isSet(a) && isSet(b)) {
    if (a.size !== b.size) return false;
    if (!deep) {
      for (const value of a.values()) {
        if (!b.has(value)) return false;
      }
    } else {
      // For deep comparison of sets, we need to check if every item in a has a matching item in b
      for (const aValue of a.values()) {
        let found = false;
        for (const bValue of b.values()) {
          if ((softEqual as InternalEqualFn)(aValue, bValue, deep, comparedRefs)) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const aObj = a as ObjLike;
    const bObj = b as ObjLike;
    const aKeys = softKeys(aObj);
    const bKeys = softKeys(bObj);

    if (aKeys.length !== bKeys.length) return false;
    if (!deep) {
      for (const key of aKeys) {
        if (aObj[key] !== bObj[key]) return false;
      }
    } else {
      for (const key of aKeys) {
        if (!(softEqual as InternalEqualFn)(aObj[key], bObj[key], deep, comparedRefs)) return false;
      }
    }
    return true;
  }

  return false;
}
