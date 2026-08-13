import { anchor } from '../engine/anchor.js';
import { linkable } from '../engine/config.js';
import { switchable } from '../engine/index.js';
import { $symbol } from '../module.js';
import { getScope, safeRun } from '../scope/context.js';
import { STACK_SYMBOL } from '../scope/stack.js';
import { ANCHOR_SETTINGS as $$ } from '../shared/constant.js';
import { isBrowser } from '../shared/env.js';
import { captureStack } from '../shared/index.js';
import type {
  Anchor,
  AnyType,
  Immutable,
  Linkable,
  Primitive,
  RefStack,
  StateObserver,
  StateOptions,
} from '../types.js';
import { softClone, softEqual } from '../utils/index.js';
import { $do, createObserver } from './observation.js';

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
    this.source = anchor({ value: init }, { recursive: false });
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
    this.source = anchor({ value: init }, { immutable: true, recursive: false });
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
    this.observer.name = 'DerivedRef';
    this.state = anchor(
      {
        value: this.observer.run(derive),
      },
      { recursive: false }
    );
  }

  /**
   * Destroys the reference and cleans up associated resources.
   */
  public destroy() {
    anchor.destroy(this.state);
    this.observer.destroy();
  }
}

interface MutableFactory {
  /**
   * Creates a mutable reactive state for linkable objects.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param init - The initial linkable value
   * @param options - Optional state configuration
   * @returns A reactive state that tracks mutations
   */
  <T extends Linkable>(init: T, options?: StateOptions): T;

  /**
   * Creates a mutable reactive state for primitive values.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param init - The initial linkable value
   * @returns A reactive state that tracks mutations
   */
  <T>(init: T): MutableRef<T>;

  /**
   * Creates a named mutable reactive state for linkable objects.
   * State is memoized in the browser, relative to the current URL.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param name - The name of the state
   * @param init - The initial linkable value
   * @param options - Optional state configuration
   * @returns A reactive state that tracks mutations
   */
  for<T extends Linkable>(name: string, init: T, options?: StateOptions): T;

  /**
   * Creates a named mutable reactive state for primitive values.
   * State is memoized in the browser, relative to the current URL.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param name - The name of the state
   * @param init - The initial linkable value
   * @returns A reactive state that tracks mutations
   */
  for<T>(name: string, init: T): MutableRef<T>;
}

export function mutableFn<T extends Linkable>(init: T, options?: StateOptions): T;
export function mutableFn<T>(init: T): MutableRef<T>;

/**
 * Implementation of mutable function that handles both primitive and linkable values.
 *
 * @template T - The value type
 * @param init - The initial value
 * @param options - Optional state configuration or boolean flag
 * @returns Either a mutable reference or reactive state depending on the input type
 */
export function mutableFn<T>(init: T, options?: StateOptions | boolean) {
  detectStability(mutableFn);

  if (linkable(init)) {
    return createRef(() => anchor(init, options as StateOptions), { init, options });
    // return anchor(init, options as StateOptions);
  }

  return createRef(() => new MutableRef(init), init);
  // return new MutableRef(init);
}

const MUTABLE_STORAGE = new Map<string, { [key: string]: unknown }>();

export const mutable = mutableFn as MutableFactory;

mutable.for = (<T>(name: string, init: T, options?: StateOptions) => {
  if (!isBrowser()) return mutable(init as Linkable, options) as T;
  if (!MUTABLE_STORAGE.has(location.href)) {
    MUTABLE_STORAGE.set(location.href, {});
  }

  const memo = MUTABLE_STORAGE.get(location.href) as { [key: string]: unknown };
  if (!(name in memo)) {
    memo[name] = mutable(init as Linkable, options);
  }

  return memo[name] as T;
}) as MutableFactory['for'];

/**
 * A Signal is a function that returns its current value when called,
 * and provides a `set` method to update that value.
 */
export interface Signal<T> {
  (): T;
  /**
   * Updates the signal's value.
   * @param value - The new value or a function that computes the new value from the current one.
   */
  set(value: T | ((current: T) => T)): T;
}

export const SIGNAL_IDENTIFIER = $symbol('signal');
/**
 * An ImmutableSignal is a read-only function that returns its current value.
 */
export type ImmutableSignal<T> = () => T;

/**
 * Creates a reactive signal for a value.
 *
 * @template T - The type of value stored in the signal
 * @param init - The initial value
 * @returns A Signal function with a .set() method
 */
export function signal<T>(init: T): Signal<T>;

/**
 * Creates an immutable reactive signal for a value.
 *
 * @param init - The initial value
 * @param immutable - Must be true to create an immutable signal
 * @returns A read-only function that returns the value
 */
export function signal<T>(init: T, immutable: true): ImmutableSignal<T>;
export function signal<T>(init: T, immutable?: boolean): Signal<T> | ImmutableSignal<T> {
  const base = { value: init };
  const state = anchor(base, { immutable });

  function getter() {
    return state.value;
  }
  getter[SIGNAL_IDENTIFIER as never] = true as never;

  if (!immutable) {
    getter.set = (setValue: T | ((c: T) => T)) => {
      if (typeof setValue === 'function') {
        setValue = (setValue as (val: T) => T)(base.value);
      }

      return (state.value = setValue);
    };
  }

  return getter;
}

/**
 * Checks if a given value is a Signal or an ImmutableSignal.
 *
 * @template T - The type of value stored in the signal
 * @param value - The value to check
 * @returns True if the value is a signal, false otherwise
 */
export function isSignal<T>(value: unknown): value is Signal<T> | ImmutableSignal<T> {
  return typeof value === 'function' && value[SIGNAL_IDENTIFIER as never] === true;
}

interface ImmutableFactory {
  /**
   * Creates an immutable reference for primitive values.
   *
   * @template T - The primitive type (string, number, boolean, etc.)
   * @param init - The initial primitive value
   * @returns An immutable reference with a getter for the value
   */
  <T extends Primitive>(init: T): ImmutableRef<T>;

  /**
   * Creates an immutable reactive state for linkable objects.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param init - The initial linkable value
   * @param options - Optional state configuration
   * @returns An immutable reactive state that prevents mutations
   */
  <T extends Linkable>(init: T, options?: StateOptions): Immutable<T>;

  /**
   * Creates a named immutable reference for primitive values.
   * State is memoized in the browser, relative to the current URL.
   *
   * @template T - The primitive type (string, number, boolean, etc.)
   * @param name - The name of the state
   * @param init - The initial primitive value
   * @returns An immutable reference with a getter for the value
   */
  for<T extends Primitive>(name: string, init: T): ImmutableRef<T>;

  /**
   * Creates a named immutable reactive state for linkable objects.
   * State is memoized in the browser, relative to the current URL.
   *
   * @template T - The linkable type (object, array, Map, Set)
   * @param name - The name of the state
   * @param init - The initial linkable value
   * @param options - Optional state configuration
   * @returns An immutable reactive state that prevents mutations
   */
  for<T extends Linkable>(name: string, init: T, options?: StateOptions): Immutable<T>;
}

/**
 * Creates an immutable reference for primitive values.
 *
 * @template T - The primitive type (string, number, boolean, etc.)
 * @param init - The initial primitive value
 * @returns An immutable reference with a getter for the value
 */
export function immutableFn<T extends Primitive>(init: T): ImmutableRef<T>;

/**
 * Creates an immutable reactive state for linkable objects.
 *
 * @template T - The linkable type (object, array, Map, Set)
 * @param init - The initial linkable value
 * @param options - Optional state configuration
 * @returns An immutable reactive state that prevents mutations
 */
export function immutableFn<T extends Linkable>(init: T, options?: StateOptions): Immutable<T>;

/**
 * Implementation of immutable function that handles both primitive and linkable values.
 *
 * @template T - The value type
 * @param init - The initial value
 * @param options - Optional state configuration
 * @returns Either an immutable reference or immutable reactive state depending on the input type
 */
export function immutableFn<T>(init: T, options?: StateOptions) {
  detectStability(immutableFn);

  if (linkable(init)) {
    return createRef(() => anchor.immutable(init, options), { init, options });
    // return anchor.immutable(init, options);
  }

  return createRef(() => new ImmutableRef(init), init);
  // return new ImmutableRef(init);
}

const IMMUTABLE_STORAGE = new Map<string, { [key: string]: unknown }>();
export const immutable = immutableFn as ImmutableFactory;

immutable.for = (<T>(name: string, init: T, options: StateOptions) => {
  if (!isBrowser()) return immutable(init as Linkable, options) as Immutable<T>;
  if (!IMMUTABLE_STORAGE.has(location.href)) {
    IMMUTABLE_STORAGE.set(location.href, {});
  }

  const memo = IMMUTABLE_STORAGE.get(location.href)!;
  if (!(name in memo)) {
    memo[name] = immutable(init as Linkable, options);
  }

  return memo[name] as Immutable<T>;
}) as ImmutableFactory['for'];

export const model = ((schema, init, options) => {
  detectStability(model);

  return createRef(() => anchor.model(schema, init, options), { schema, init, options });
}) as Anchor['model'];

export const ordered = ((init, compare) => {
  detectStability(ordered);

  return createRef(() => anchor.ordered(init, compare), { init, compare });
}) as Anchor['ordered'];

/**
 * NON STACK-AWARE APIS
 * THE API BELOWS DOESN'T NEED TO BE STACK AWARE BECAUSE THEY ARE STATE DEPENDENT.
 */

export const writable = ((state, contracts) => {
  detectStability(writable);

  return anchor.writable(state, contracts);
}) as Anchor['writable'];

export const exception = ((state, handler) => {
  detectStability(exception);
  return anchor.catch(state, handler);
}) as Anchor['catch'];

export interface DeriveFactory {
  /**
   * Creates a derived reference that computes its value based on other reactive dependencies.
   *
   * @template T - The type of the derived value
   * @param derive - A function that computes and returns the derived value
   * @returns A derived reference that automatically updates when its dependencies change
   */
  <T>(derive: () => T): DerivedRef<T>;

  /**
   * Creates a derived reference that computes its value based on other reactive dependencies,
   * returned as proxy of the shape.
   *
   * @template T - The type of the derived value
   * @param factory - A function that computes and returns the derived value
   * @param args - Arguments to be passed to the factory function
   * @returns A proxy of derived reference that automatically updates when its dependencies change
   */
  as<T extends object, A extends AnyType[]>(factory: (...args: A) => T, ...args: A): T;
}

function derivedFn<T>(derive: () => T): DerivedRef<T> {
  detectStability(derivedFn);
  return new DerivedRef(derive);
}

derivedFn.as = <T extends object, A extends AnyType[]>(factory: (...args: A) => T, ...args: A) => {
  const ref = derived(() => factory(...args));

  return new Proxy(ref, {
    get: (_target, property) => {
      return ref.value[property as keyof T];
    },
  }) as T;
};

export const derived = derivedFn as DeriveFactory;

/**
 * Destroys a reference and cleans up associated resources.
 *
 * This function handles destruction of both anchor-based references and value references.
 * For anchor-based references, it delegates to `anchor.destroy()`.
 * For value references (MutableRef, ImmutableRef, DerivedRef), it calls their respective `destroy()` methods.
 *
 * @param ref - The reference to destroy, which can be a MutableRef, ImmutableRef, or Linkable object
 */
export function destroyRef(ref: MutableRef<unknown> | ImmutableRef<unknown> | Linkable) {
  if (anchor.has(ref)) {
    anchor.destroy(ref);
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
  if ($$.production) return fn();
  const currentStack = safeRun(() => getScope<RefStack>(STACK_SYMBOL));
  if (!currentStack) return fn();

  return $do(() => {
    let current = currentStack.states.get(currentStack.index);

    if (!softEqual(current?.init, init, true)) {
      current = { init: softClone(init, true), value: fn() };
      currentStack.states.set(currentStack.index, current);
    }

    currentStack.index++;

    return current?.value as T;
  });
}

let stabilityDetector = (stacks: Array<Function> = []) => {
  if (!$$.production && $$.reactive && switchable.getObserver()) {
    const error = new Error('State created in an unstable boundary.');
    captureStack.violation.general(
      'Unstable state declaration detected.',
      'Attempted to declare a state inside a reactive boundary.',
      error,
      [
        'Always declare state outside of reactive boundary.',
        '- State declared in a reactive boundary will always be re-created on changes.',
        '- Use regular JavaScript variable inside a reactive boundary.',
      ],
      stabilityDetector,
      detectStability,
      ...stacks
    );
  }
};

function detectStability(...stacks: Array<Function>) {
  stabilityDetector?.(stacks);
}

export function setStabilityDetector(fn: (...stacks: Array<Function>) => void) {
  stabilityDetector = fn as never;
}
