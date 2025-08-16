import { isArray, isDate, isMap, isObject, isRegExp, isSet } from '@beerush/utils';
import type { ObjLike } from '../types.js';

export function softClone<T>(source: T): T {
  if (source === null || source === undefined || typeof source !== 'object') {
    return source;
  } else if (isDate(source)) {
    return new Date(source.getTime()) as T;
  } else if (isRegExp(source)) {
    return new RegExp(source.source, source.flags) as T;
  } else if (isArray(source)) {
    return source.map(softClone) as T;
  } else if (isMap(source)) {
    const map = new Map();

    for (const [key, value] of source.entries()) {
      if (value === source) {
        map.set(key, map);
      } else {
        map.set(key, softClone(value));
      }
    }

    return map as T;
  } else if (isSet(source)) {
    const set = new Set();

    for (const value of source.values()) {
      if (value === source) {
        set.add(set); // Handle circular reference by self-referencing.
      } else {
        set.add(softClone(value));
      }
    }

    return set as T;
  } else if (isObject(source)) {
    const obj: Record<string | symbol | number, unknown> = {};

    for (const [key, value] of softEntries(source)) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);

      if (descriptor?.set || descriptor?.get) {
        Object.defineProperty(obj, key, { ...descriptor });
      } else {
        if (value === source) {
          obj[key] = obj; // Handle circular reference by self-referencing.
        } else {
          obj[key] = softClone(value);
        }
      }
    }

    return obj as T;
  } else {
    return source;
  }
}

export function softEntries<T extends ObjLike>(obj: T): Array<[keyof T, T[keyof T]]> {
  const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;

  for (const sym of Object.getOwnPropertySymbols(obj)) {
    entries.push([sym, obj[sym as never]] as never);
  }

  return entries;
}

export function softKeys<T extends ObjLike>(obj: T): Array<keyof T> {
  return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)] as Array<keyof T>;
}
