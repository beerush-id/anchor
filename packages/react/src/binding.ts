import { createObserver, mutable, type MutableRef, type StateOptions } from '@anchorlib/core';

/**
 * A reference that binds a value to a property of an object or another reference.
 * Used for creating two-way data binding between components.
 *
 * @template S - The source object or reference type
 * @template V - The value type
 */
export class BindingRef<S, V> {
  /**
   * Creates a new binding reference.
   *
   * @param source - The source object or reference to bind to
   * @param key - The property key to bind to (default: 'value')
   * @param type - The value type (optional)
   */
  constructor(
    public source: S,
    public key: keyof S | string = 'value',
    public type?: V
  ) {}
}

/**
 * Type guard to check if a value is a BindingRef.
 *
 * @template S - The source object or reference type
 * @template V - The value type
 * @param value - The value to check
 * @returns True if the value is a BindingRef, false otherwise
 */
export function isBinding<S, V>(value: unknown): value is BindingRef<S, V> {
  return value instanceof BindingRef;
}

/**
 * Type guard to check if a value is a BindableRef.
 *
 * @template S - The source value type
 * @template T - The target object or reference type
 * @param value - The value to check
 * @returns True if the value is a BindableRef, false otherwise
 */
export function isBindable<T>(value: unknown): value is MutableRef<T> {
  return BINDABLE_REGISTRY.has(value as MutableRef<unknown>);
}

/**
 * Creates two-way data binding to MutableRef source.
 *
 * @template T - The MutableRef type
 * @param source - The MutableRef source to bind to
 * @returns The value type of the MutableRef
 */
export function bind<T extends MutableRef<unknown>>(source: T): T['value'];

/**
 * Creates two-way data binding to object property.
 *
 * @template T - The Record type
 * @template K - The key type
 * @param source - The Record source to bind to
 * @param key - The property key to bind to
 * @returns The value type at the specified key
 */
export function bind<T extends Record<string, unknown>, K extends keyof T>(source: T, key: K): T[K];

/**
 * Creates a binding reference for two-way data binding.
 *
 * @template T - The source type
 * @param source - The source object or reference to bind to
 * @param key - The property key to bind to (optional)
 * @returns A BindingRef instance
 */
export function bind<T>(source: T, key?: keyof T) {
  return new BindingRef(source, key);
}

const BINDABLE_REGISTRY = new WeakSet<MutableRef<unknown>>();

/**
 * Creates a bindable reference that synchronizes values between sources.
 *
 * @template T - The value type
 * @template S - The target object or reference type
 * @template K - The key type of the target
 * @param init - The initial value
 * @param source - The target object or reference to bind to
 * @param key - The property key to bind to (optional)
 * @param options - Optional state options for the underlying mutable reference
 * @returns A MutableRef that synchronizes with the target
 */
export function bindable<T, S, K extends keyof S>(
  init: T,
  source: S,
  key?: S[K] extends T ? K : never,
  options?: StateOptions
): MutableRef<T> {
  const state = mutable(init as never, options) as MutableRef<T>;
  const observer = createObserver(() => {
    state.value = key ? (source[key] as T) : (source as MutableRef<T>).value;
  });
  observer.run(() => {
    const value = key ? (source[key] as T) : (source as MutableRef<T>).value;

    if (typeof value !== 'undefined') {
      state.value = value;
    }
  });

  const ref = {
    get value() {
      return state.value;
    },
    set value(value) {
      (source as MutableRef<T>)[(key ?? 'value') as 'value'] = value as T;
    },
    destroy() {
      observer.destroy();
      state.destroy();
      BINDABLE_REGISTRY.delete(ref);
    },
  } as MutableRef<T>;

  BINDABLE_REGISTRY.add(ref);
  return ref;
}
