import { isArray, isDate, isMap, isRegExp, isSet } from '@beerush/utils';
import type { Linkable, ObjLike, Recursive } from '../types.js';
import { captureStack } from '../exception.js';

/**
 * Deep clone an object with proper handling of circular references
 * @param {T} source - The object to clone
 * @param {boolean} recursive - Whether to clone nested objects recursively
 * @param {WeakMap} clonedRefs - WeakMap to track cloned references (used internally for circular references)
 * @param {string} prop - Property name (used internally for exception message)
 * @returns Cloned object
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

export function softKeys<T extends ObjLike>(obj: T): Array<keyof T> {
  return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)] as Array<keyof T>;
}
