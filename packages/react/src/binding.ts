import {
  createObserver,
  isValueRef,
  mutable,
  type MutableRef,
  type StateObserver,
  type StateOptions,
} from '@anchorlib/core';

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
 * A bindable reference that can synchronize values between different sources.
 *
 * @template S - The source value type
 * @template T - The target object or reference type
 */
export class BindableRef<S, T> {
  readonly #source: MutableRef<S>;
  readonly #target: BindingRef<T, S> | S;

  /**
   * Gets the current value of the bindable reference.
   */
  public get value() {
    if (isValueRef(this.#source)) {
      return this.#source.value;
    }

    return this.#source;
  }

  /**
   * Sets the value of the bindable reference and propagates it to the target.
   *
   * @param value - The new value to set
   */
  public set value(value: S) {
    this.#source.value = value;

    if (isBinding(this.#target)) {
      const { source, key } = this.#target as BindingRef<T, S>;
      source[key as keyof T] = value as T[keyof T];
    }
  }

  private observer?: StateObserver;

  /**
   * Creates a new bindable reference.
   *
   * @param init - The initial value
   * @param target - The target to bind to (either a BindingRef or a direct value)
   * @param initOptions - Optional state options for the underlying mutable reference
   */
  constructor(init: S, target: BindingRef<T, S> | S, initOptions?: StateOptions) {
    this.#source = mutable(init as never, initOptions);
    this.#target = target;

    if (isBinding(this.#target)) {
      const { source, key } = this.#target as BindingRef<T, S>;

      this.observer = createObserver(() => {
        this.value = source[key as keyof T] as S;
      });

      this.observer.run(() => {
        this.value = source[key as keyof T] as S;
      });
    } else {
      this.#source.value = this.#target as S;
    }
  }

  /**
   * Destroys the bindable reference and cleans up resources.
   */
  public destroy() {
    this.observer?.destroy();
    this.#source.destroy();
  }
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
export function isBindable<S, T>(value: unknown): value is BindableRef<S, T> {
  return value instanceof BindableRef;
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

/**
 * Creates a bindable reference that synchronizes values between sources.
 *
 * @template T - The value type
 * @template S - The target object or reference type
 * @template K - The key type of the target
 * @param init - The initial value
 * @param target - The target object or reference to bind to
 * @param key - The property key to bind to (optional)
 * @param options - Optional state options for the underlying mutable reference
 * @returns A MutableRef that synchronizes with the target
 */
export function bindable<T, S, K extends keyof S>(
  init: T,
  target: S,
  key?: S[K] extends T ? K : never,
  options?: StateOptions
): MutableRef<T> {
  const state = mutable(init as never, options) as MutableRef<T>;
  const observer = createObserver(() => {
    state.value = key ? (target[key] as T) : (target as MutableRef<T>).value;
  });
  observer.run(() => {
    state.value = key ? (target[key] as T) : (target as MutableRef<T>).value;
  });

  return {
    get value() {
      return state.value;
    },
    set value(value) {
      (target as MutableRef<T>)[(key ?? 'value') as 'value'] = value as T;
    },
    destroy() {
      observer.destroy();
      state.destroy();
    },
  } as MutableRef<T>;
}
