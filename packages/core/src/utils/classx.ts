import { valueGetter, type ValueGetterType } from '../shared/env.js';
import { isFalsy, isTruthy } from './typeof.js';

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
 * Provides a `.use()` method to create reactive class bindings that can be tracked by the UI renderer.
 *
 * @param inputs - A variable number of class inputs or providers.
 * @returns A string of space-separated class names.
 */
export type ClassX = ((...inputs: (ClassInput | ClassProvider)[]) => string) & {
  use: (input: ClassProvider) => ValueGetterType<string>;
};

function classxFn(...inputs: (ClassInput | ClassProvider)[]) {
  return stringify(inputs);
}

/**
 * Creates a reactive binding for a class provider.
 * When the reactive state accessed within the provider changes,
 * it triggers the UI renderer to update the class names.
 *
 * @param input - The class provider function.
 * @returns A reactive value getter returning the class string.
 */
classxFn.use = (input: ClassProvider) => {
  return valueGetter(() => stringify(input));
};

export const classx = classxFn as ClassX;

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
