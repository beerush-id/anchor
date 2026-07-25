import type { AnyType } from '../types.js';

export const $ROOT = globalThis as AnyType;

/**
 * Create a symbol with --anchor prefix.
 * @param name - The name of the symbol.
 * @param suffix - The suffix of the symbol.
 * @returns {Symbol} - The symbol.
 */
export function $symbol(name: string, suffix?: string): symbol {
  if (suffix) return Symbol.for(`--anchor-${name}-${suffix}`);
  return Symbol.for(`--anchor-${name}`);
}

/**
 * Check if the current environment is a browser.
 * @returns {boolean}
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export const IS_VALUE_GETTER = $symbol('value-getter');

/**
 * Type for value getter.
 */
export type ValueGetterType<T> = (() => T) & {
  [IS_VALUE_GETTER]: true;
  value: T;
};

/**
 * Convert value or function that return value into value getter.
 * @param source - The value or function that returns value.
 * @returns The value getter.
 */
export function valueGetter<T>(source: (() => T) | { value: T }): ValueGetterType<T> {
  if (typeof source === 'function') {
    Object.defineProperties(source, {
      [IS_VALUE_GETTER]: {
        value: true,
      },
      value: {
        get: source as () => T,
      },
    });
    return source as ValueGetterType<T>;
  }

  const reader = (() => source.value) as ValueGetterType<T>;
  Object.defineProperties(reader, {
    [IS_VALUE_GETTER]: {
      value: true,
    },
    value: {
      get: () => source.value,
    },
  });

  return reader;
}

/**
 * Check if the given value is a value getter.
 * @param value - The value to check.
 * @returns {boolean} - True if the value is a value getter, false otherwise.
 */
export function isValueGetter<T = AnyType>(value: unknown): value is ValueGetterType<T> {
  return typeof value === 'function' && (value as AnyType)[IS_VALUE_GETTER] === true;
}
