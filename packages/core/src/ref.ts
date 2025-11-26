import { anchor } from './anchor.js';
import { ANCHOR_SETTINGS } from './constant.js';
import { captureStack } from './exception.js';
import { linkable } from './internal.js';
import { createObserver } from './observation.js';
import type { Immutable, Linkable, Primitive, StateObserver, StateOptions } from './types.js';
import { softClone, softEqual } from './utils/index.js';

type RefScopeValue = {
  init: unknown;
  value: unknown;
};

type RefStack = {
  index: number;
  states: Map<number, RefScopeValue>;
};

export type ValueRef<T> = MutableRef<T> | ImmutableRef<T> | DerivedRef<T>;

/**
 * A mutable reference wrapper for primitive values that provides reactive capabilities.
 *
 * @template T - The type of value being wrapped
 */
export class MutableRef<T> {
  readonly source: { value: T };

  /**
   * Gets the current value of the reference.
   *
   * @returns The current value
   */
  get value() {
    return this.source.value;
  }

  /**
   * Sets a new value for the reference.
   *
   * @param value - The new value to set
   */
  set value(value: T) {
    this.source.value = value;
  }

  /**
   * Creates a new mutable reference with the given initial value.
   *
   * @param init - The initial value for the reference
   */
  constructor(init: T) {
    this.source = anchor({ value: init });
  }

  /**
   * Destroys the reference and cleans up associated resources.
   */
  public destroy() {
    anchor.destroy(this.source);
  }
}

/**
 * An immutable reference wrapper for primitive values that prevents modification.
 *
 * @template T - The type of value being wrapped
 */
export class ImmutableRef<T> {
  readonly source: { value: T };

  /**
   * Gets the current value of the reference.
   *
   * @returns The current value
   */
  get value() {
    return this.source.value;
  }

  /**
   * Attempts to set a new value for the reference, which will always throw an error.
   *
   * @param _value - The value to set (ignored)
   * @throws Error - Always throws an error indicating immutable ref violation
   */
  set value(_value: T) {
    const error = new Error('Immutable ref violation detected.');
    captureStack.violation.general(
      'Immutable ref violation detected.',
      'Attempted to modify the value of an immutable ref.',
      error,
      [
        'Immutable ref value cannot be changed after created.',
        "- Remove the 'immutable' argument if it's intended to be writable.",
      ]
    );
  }

  /**
   * Creates a new immutable reference with the given initial value.
   *
   * @param init - The initial value for the reference
   */
  constructor(init: T) {
    this.source = anchor({ value: init });
  }

  /**
   * Destroys the reference and cleans up associated resources.
   */
  public destroy() {
    anchor.destroy(this.source);
  }
}

/**
 * A derived reference that computes its value based on other reactive dependencies.
 *
 * @template T - The type of the derived value
 */
export class DerivedRef<T> {
  readonly state: { value: T };
  readonly observer: StateObserver;

  /**
   * Gets the current computed value of the reference.
   *
   * @returns The current computed value
   */
  public get value() {
    return this.state.value;
  }

  /**
   * Creates a new derived reference with the given computation function.
   *
   * @param derive - A function that computes and returns the derived value
   */
  constructor(derive: () => T) {
    this.observer = createObserver(() => {
      this.state.value = this.observer.run(derive);
    });
    this.state = anchor({
      value: this.observer.run(derive),
    });
  }

  /**
   * Destroys the reference and cleans up associated resources.
   */
  public destroy() {
    anchor.destroy(this.state);
    this.observer.destroy();
  }
}

/**
 * Creates a mutable reactive state for linkable objects.
 *
 * @template T - The linkable type (object, array, Map, Set)
 * @param init - The initial linkable value
 * @param options - Optional state configuration
 * @returns A reactive state that tracks mutations
 */
export function mutable<T extends Linkable>(init: T, options?: StateOptions): T;

/**
 * Creates a mutable reference for primitive values.
 *
 * @template T - The primitive type (string, number, boolean, etc.)
 * @param init - The initial primitive value
 * @returns A mutable reference with getter and setter for the value
 */
export function mutable<T>(init: T): MutableRef<T>;

/**
 * Implementation of mutable function that handles both primitive and linkable values.
 *
 * @template T - The value type
 * @param init - The initial value
 * @param options - Optional state configuration or boolean flag
 * @returns Either a mutable reference or reactive state depending on the input type
 */
export function mutable<T>(init: T, options?: StateOptions | boolean) {
  if (linkable(init)) {
    return createRef(() => anchor(init, options as StateOptions), { init, options });
    // return anchor(init, options as StateOptions);
  }

  return createRef(() => new MutableRef(init), init);
  // return new MutableRef(init);
}

/**
 * Creates an immutable reference for primitive values.
 *
 * @template T - The primitive type (string, number, boolean, etc.)
 * @param init - The initial primitive value
 * @returns An immutable reference with a getter for the value
 */
export function immutable<T extends Primitive>(init: T): ImmutableRef<T>;

/**
 * Creates an immutable reactive state for linkable objects.
 *
 * @template T - The linkable type (object, array, Map, Set)
 * @param init - The initial linkable value
 * @param options - Optional state configuration
 * @returns An immutable reactive state that prevents mutations
 */
export function immutable<T extends Linkable>(init: T, options?: StateOptions): Immutable<T>;

/**
 * Implementation of immutable function that handles both primitive and linkable values.
 *
 * @template T - The value type
 * @param init - The initial value
 * @param options - Optional state configuration
 * @returns Either an immutable reference or immutable reactive state depending on the input type
 */
export function immutable<T>(init: T, options?: StateOptions) {
  if (linkable(init)) {
    return createRef(() => anchor.immutable(init, options), { init, options });
    // return anchor.immutable(init, options);
  }

  return createRef(() => new ImmutableRef(init), init);
  // return new ImmutableRef(init);
}

/**
 * Creates a derived reference that computes its value based on other reactive dependencies.
 *
 * @template T - The type of the derived value
 * @param derive - A function that computes and returns the derived value
 * @returns A derived reference that automatically updates when its dependencies change
 */
export function derived<T>(derive: () => T): DerivedRef<T> {
  return new DerivedRef(derive);
}

export function destroyRef(ref: MutableRef<unknown> | ImmutableRef<unknown> | Linkable) {
  if (anchor.has(ref)) {
    anchor.destroy(ref);
    return;
  } else if (isValueRef(ref)) {
    ref.destroy();
  }
}

/**
 * Checks if a given value is a mutable reference.
 *
 * @template T - The type of value stored in the reference
 * @param value - The value to check
 * @returns True if the value is a mutable reference, false otherwise
 */
export function isMutableRef<T>(value: unknown): value is MutableRef<T> {
  return value instanceof MutableRef;
}

/**
 * Checks if a given value is an immutable reference.
 *
 * @template T - The type of value stored in the reference
 * @param value - The value to check
 * @returns True if the value is an immutable reference, false otherwise
 */
export function isImmutableRef<T>(value: unknown): value is ImmutableRef<T> {
  return value instanceof ImmutableRef;
}

/**
 * Checks if a given value is a derived reference.
 *
 * @template T - The type of value stored in the reference
 * @param value - The value to check
 * @returns True if the value is a derived reference, false otherwise
 */
export function isDerivedRef<T>(value: unknown): value is DerivedRef<T> {
  return value instanceof DerivedRef;
}

/**
 * Checks if a given value is a mutable, immutable, or derived reference.
 *
 * @template T - The type of value stored in the reference
 * @param value - The value to check
 * @returns True if the value is a reference (either mutable or immutable), false otherwise
 */
export function isValueRef<T>(value: unknown): value is MutableRef<T> | ImmutableRef<T> {
  return value instanceof MutableRef || value instanceof ImmutableRef || value instanceof DerivedRef;
}

let currentStack: RefStack;

/**
 * Creates a new reference stack scope for managing reactive references.
 *
 * @returns A new RefStack object with initialized index and empty states map
 */
export function createStack(): RefStack {
  return {
    index: 0,
    states: new Map(),
  };
}

/**
 * Executes a function within a specific reference stack context.
 *
 * @template T - The return type of the executed function
 * @param scope - The reference scope to use during execution
 * @param fn - The function to execute within the given scope
 * @returns The result of the executed function
 */
export function withinStack<T>(scope: RefStack, fn: () => T) {
  const prevStack = currentStack;
  currentStack = scope;

  try {
    return fn();
  } finally {
    currentStack = prevStack;
  }
}
/**
 * Retrieves the current reference stack context.
 *
 * @returns The current RefStack if one exists, undefined otherwise
 */
export function getCurrentStack() {
  return currentStack;
}

/**
 * Creates or retrieves a cached reference based on initialization parameters.
 * In production mode or without a current stack, directly creates the reference.
 * Otherwise, checks if a reference with the same initialization parameters exists
 * in the current stack and returns it if available, or creates and caches it.
 *
 * @template T - The type of the reference value
 * @param fn - Factory function to create the reference if needed
 * @param init - Initialization parameter used to determine if reference can be reused
 * @returns The created or cached reference value
 */
function createRef<T>(fn: () => T, init: unknown) {
  if (!currentStack || ANCHOR_SETTINGS.production) return fn();

  let current = currentStack.states.get(currentStack.index);

  if (!softEqual(current?.init, init, true)) {
    current = { init: softClone(init, true), value: fn() };
    currentStack.states.set(currentStack.index, current);
  }

  currentStack.index++;

  return current?.value as T;
}
