import { IS_VALUE_GETTER } from '../module.js';
import { isFalsy, isTruthy } from './inspector.ts';

/**
 * Represents a single class name, which can also be a boolean, number, or null/undefined (falsy values are ignored).
 */
export type ClassName = string | number | boolean | null | undefined;

/**
 * A dictionary where the keys are class names and the values determine if the class is included.
 */
export type ClassMaps = {
  [key: string]: ClassName | ClassMaps | ClassList;
};

/**
 * A list of class inputs, allowing recursive structures.
 */
export type ClassList = Array<ClassName | ClassMaps | ClassList>;

/**
 * Any valid input for class resolution.
 */
export type ClassInput = ClassName | ClassMaps | ClassList;

/**
 * A function that provides a class input dynamically.
 */
export type ClassProvider = () => ClassInput;

/**
 * Utility for conditionally joining class names together.
 * Supports strings, arrays, objects (keys are classes, values are conditions), and functions.
 *
 * @param inputs - A variable number of class inputs or providers.
 * @returns A string of space-separated class names.
 */
export function classx(...inputs: (ClassInput | ClassProvider)[]) {
  return {
    [IS_VALUE_GETTER]: true,
    get value() {
      return stringify(inputs);
    },
  } as string & { [IS_VALUE_GETTER]: boolean; value: string };
}

function stringify(input: ClassInput | ClassProvider | Array<ClassInput | ClassProvider>): string {
  if (isFalsy(input)) return '';
  if (typeof input === 'function') return stringify(input());

  if (Array.isArray(input)) {
    return input.map(stringify).filter(Boolean).join(' ');
  }

  if (typeof input === 'object') {
    return Object.entries(input!)
      .filter(([, value]) => isTruthy(value))
      .map(([key]) => key)
      .join(' ');
  }

  return String(input);
}
