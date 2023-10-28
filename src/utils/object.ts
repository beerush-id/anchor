import { isArray, isObject } from './inspector.js';

export type NestedPath<T, K extends keyof T = keyof T> =
  K extends string | number
  ? T[K] extends infer R
    ? `${ K }` | (
      R extends Array<unknown>
      ? `${ K }.${ NestedArrayPath<R> }`
      : R extends Record<string, unknown>
        ? `${ K }.${ NestedPath<R> }`
        : never)
    : never
  : never
export type NestedArrayPath<T extends Array<unknown>> = `${ number }` | `${ number }.[${ NestedPath<T[number]> }]`;

export type NestedPathValue<T, P extends NestedPath<T>>
  = P extends `${ infer K }.${ infer Rest }`
    ? T[(K extends `${ infer R extends number }` ? R : K) & keyof T] extends infer S
      ? S extends never
        ? never
        : Rest extends NestedPath<S>
          ? NestedPathValue<S, Rest>
          : never
      : never
    : T[(P extends `${ infer R extends number }` ? R : P) & keyof T]

export type NestedPaths<T extends object, R = Array<NestedPath<T>>> = R;
export type NestedPathMaps<T extends object> = {
  [K in NestedPath<T>]: NestedPathValue<T, K>;
};

/**
 * Get the value of an object by using a path.
 * @param {T} object - An object to get the value from.
 * @param {string} path - A dot separated string as a key to get the value.
 * @returns {any}
 */
export function read<T extends object, P extends NestedPath<T> = NestedPath<T>>(
  object: T,
  path: P,
): NestedPathValue<T, P> {
  const key = path as string;

  if (typeof object !== 'object') {
    throw new Error(`Can not get ${ key } from ${ typeof object }!`);
  }

  const keys = key.split('.');

  if (keys.length > 1) {
    return keys.reduce((a, b, i) => {
      const next = (a)[b as never];
      return (i + 1) === keys.length ? next : (next || {});
    }, object) as never;
  } else {
    return (object as never)[key];
  }
}

/**
 * Set the value of an object by using a path.
 * @param {T} object - An object to set the value into.
 * @param {string} path - A dot separated string as a path to set the value.
 * @param {unknown} value - New value to be set.
 */
export function write<T extends object, P extends NestedPath<T> = NestedPath<T>>(
  object: T,
  path: P,
  value?: NestedPathValue<T, P>,
): void {
  const key = path as string;

  if (typeof object !== 'object') {
    throw new Error(`Can not set ${ key } to ${ typeof object }.`);
  }

  const keys = key.split('.');

  if (keys.length <= 1) {
    (object as any)[key] = value;
  } else {
    keys.reduce((a, b, i) => {
      if ((i + 1) === keys.length) {
        a[b] = value;
      } else {
        const next = a[b];
        const nextKey = keys[i + 1];

        if (typeof next !== 'object') {
          a[b] = (nextKey === '0' || Number(nextKey)) ? [] : {};
        }
      }

      return a[b];
    }, object as any);
  }
}

/**
 * Recursively replace the value of an object with value from another object by preserving the reference.
 * @param {object} object - An object to put the new value into.
 * @param {object} source - An object to put the new value from.
 */
export function replace(object: object, source: object): void {
  merge(object, source, true);
}

/**
 * Recursively replace the item of an array with item from another array by preserving the reference.
 * @param {unknown[]} array - An array to put the new item into.
 * @param {unknown[]} source - An array to pull the new item from.
 */
export function replaceItems(array: unknown[], source: unknown[]): void {
  mergeItems(array, source, true);
}

/**
 * Recursively merge two objects by preserving the reference.
 * @param {object} object - An object to put the new value into.
 * @param {object} source - An object to put the new value from.
 * @param {boolean} cleanup - Remove the key that is not exist in the source object.
 */
export function merge(object: object, source: object, cleanup?: boolean) {
  for (const [ key, value ] of Object.entries(source)) {
    if (isArray(object[key as never]) && isArray(value)) {
      mergeItems(object[key as never], value, cleanup);
    } else if (isObject(object[key as never]) && isObject(value)) {
      merge(object[key as never], value, cleanup);
    } else {
      if (object[key as never] !== value) {
        object[key as never] = value as never;
      }
    }
  }

  if (cleanup) {
    for (const key of Object.keys(object)) {
      if (!(key in source)) {
        delete object[key as never];
      }
    }
  }
}

/**
 * Recursively merge two array by preserving the reference.
 * @param {unknown[]} array - An array to put the new item into.
 * @param {unknown[]} source - An array to pull the new item from.
 * @param {boolean} cleanup - Remove the item that is not exist in the source array.
 */
export function mergeItems(array: unknown[], source: unknown[], cleanup?: boolean) {
  if (!isArray(array) || !isArray(source)) {
    throw new Error('Target and source must be an Array!');
  }

  array.splice(0, array.length, ...source);
}

/**
 * Split array into multiple columns by limiting the max rows.
 * @param array - An array to split.
 * @param maxRows - The max rows per column.
 */
export function splitItems<T>(array: T[], maxRows: number): Array<T[]> {
  if (array.length <= maxRows) {
    return [ array ];
  }

  const group: Array<T[]> = [];
  const limit = Math.ceil(array.length / maxRows);

  for (let col = 0; col < limit; ++col) {
    const column = [];

    for (let i = (col * maxRows); i < ((col * maxRows) + maxRows); ++i) {
      if (typeof array[i] !== 'undefined') {
        column.push(array[i]);
      }
    }

    if (column.length) {
      group.push(column);
    }
  }

  return group;
}

/**
 * Convert Javascript object into Raw string.
 * @param object
 * @returns {string}
 */
export function stringify(object: unknown): string {
  const text: string[] = [];

  if (isObject(object)) {
    text.push('{');

    for (const [ key, value ] of Object.entries(object as object)) {
      text.push(key, ':', stringify(value) as never, ',');
    }

    text.push('}');
  } else if (Array.isArray(object)) {
    text.push('[');

    for (const item of object) {
      text.push(stringify(item), ',');
    }

    text.push(']');
  } else if (typeof object === 'function') {
    text.push(object.toString());
  } else {
    text.push(JSON.stringify(object));
  }

  return text.join('');
}

/**
 * Object.entries() wrapper with strong typing.
 * @param {R} object
 * @returns {Array<[keyof R, R[keyof R]]>}
 */
export function entries<T extends object, R = Array<[ keyof T, T[keyof T] ]>>(object: T): R {
  return Object.entries(object) as never;
}

/**
 * Get all the nested paths of an object.
 * @param {T} target
 * @param {string} prefix
 * @return {R}
 */
export function nestedPaths<T extends object, R = NestedPaths<T>>(target: T, prefix?: string): R {
  const paths: string[] = [];

  if (Array.isArray(target)) {
    target.forEach((value, i) => {
      paths.push(`${ prefix ? prefix + '.' : '' }${ i }` as never);

      if (isObject(value) || isArray(value)) {
        paths.push(...nestedPaths(value as object, `${ i }`));
      }
    });
  } else if (isObject(target)) {
    for (const [ key, value ] of Object.entries(target)) {
      paths.push(`${ prefix ? prefix + '.' : '' }${ key }` as never);

      if (isObject(value) || isArray(value)) {
        paths.push(...nestedPaths(value as object, key));
      }
    }
  }

  return paths as R;
}

/**
 * Get all the nested path maps of an object.
 * @param {T} target - Target object to get the path maps from.
 * @param {function} replace - Replace the value of the path.
 * @param {string} prefix - Prefix the path.
 * @return {NestedPathMaps<T>}
 */
export function nestedPathMaps<T extends object>(
  target: T,
  replace?: (key: NestedPath<T>, value: NestedPathValue<T, NestedPath<T>>) => NestedPathValue<T, NestedPath<T>>,
  prefix?: string,
): NestedPathMaps<T> {
  const maps: NestedPathMaps<T> = {} as never;

  if (Array.isArray(target)) {
    target.forEach((value, i) => {
      const key = `${ prefix ? prefix + '.' : '' }${ i }` as never;
      maps[key] = typeof replace === 'function' ? replace(key, value) as never : i as never;

      if (isObject(value) || isArray(value)) {
        Object.assign(maps, nestedPathMaps(value as T, replace, key));
      }
    });
  } else if (isObject(target)) {
    for (const [ prop, value ] of Object.entries(target)) {
      const key = `${ prefix ? prefix + '.' : '' }${ prop }` as never;
      maps[key] = typeof replace === 'function' ? replace(key, value) as never : value as never;

      if (isObject(value) || isArray(value)) {
        Object.assign(maps, nestedPathMaps(value as T, replace, key));
      }
    }
  }

  return maps as never;
}
