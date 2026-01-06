import { isMutableRef, type MutableRef } from '@anchorlib/core';

export type Binding<T> = {
  get value(): T;
  set value(value: T);
};

/**
 * A reference that binds a value to a property of an object or another reference.
 * Used for creating two-way data binding between components.
 *
 * @template S - The source object or reference type
 * @template V - The value type
 */
export class BindingRef<S, V> {
  public get value(): V {
    return (this.source as Record<string, unknown>)[this.key as never] as V;
  }

  public set value(value: V) {
    (this.source as Record<string, unknown>)[this.key as never] = value;
  }

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
 * Creates two-way data binding to MutableRef source.
 *
 * @template T - The MutableRef type
 * @param source - The MutableRef source to bind to
 * @returns The value type of the MutableRef
 */
export function bind<T extends MutableRef<unknown>>(source: T): Binding<T['value']>;

/**
 * Creates two-way data binding to object property.
 *
 * @template T - The Record type
 * @template K - The key type
 * @param source - The Record source to bind to
 * @param key - The property key to bind to
 * @returns The value type at the specified key
 */
export function bind<T, K extends keyof T>(source: T, key: K): Binding<T[K]>;

/**
 * Creates a binding reference for two-way data binding.
 *
 * @template T - The source type
 * @param source - The source object or reference to bind to
 * @param key - The property key to bind to (optional)
 * @returns A BindingRef instance
 */
export function bind<T>(source: T, key?: keyof T) {
  if (isMutableRef(source)) return source;
  return new BindingRef(source, key);
}

/**
 * Alias for the bind function.
 *
 * @see {@link bind}
 */
export const $bind = bind;
