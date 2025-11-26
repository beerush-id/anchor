import type { MutableRef, StateObserver, StateOptions } from '@anchorlib/core';
import { createObserver, isValueRef, mutable } from '@anchorlib/core';

export type Binding<T> = BindingRef<MutableRef<unknown> | Record<string, unknown>, T>;

export class BindingRef<S, V> {
  constructor(
    public source: S,
    public key: keyof S | string = 'value',
    public type?: V
  ) {}
}

export class BindableRef<S, T> {
  readonly #source: MutableRef<S>;
  readonly #target: BindingRef<T, S> | S;

  public get value() {
    if (isValueRef(this.#source)) {
      return this.#source.value;
    }

    return this.#source;
  }

  public set value(value: S) {
    this.#source.value = value;

    if (isBinding(this.#target)) {
      const { source, key } = this.#target as BindingRef<T, S>;
      source[key as keyof T] = value as T[keyof T];
    }
  }

  private observer?: StateObserver;

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

  public destroy() {
    this.observer?.destroy();
    this.#source.destroy();
  }
}

export function isBinding<S, V>(value: unknown): value is BindingRef<S, V> {
  return value instanceof BindingRef;
}

export function isBindable<S, T>(value: unknown): value is BindableRef<S, T> {
  return value instanceof BindableRef;
}

export function bind<V, T extends MutableRef<V>>(source: T): BindingRef<T, T['value']>;
export function bind<T extends Record<string, unknown>, K extends keyof T>(source: T, key: K): BindingRef<T, T[K]>;
export function bind<T>(source: T, key?: keyof T): BindingRef<T, T[keyof T]> {
  return new BindingRef(source, key);
}

export function bindable<S, T>(init: S, target: BindingRef<T, S> | S, options?: StateOptions): BindableRef<S, T> {
  return new BindableRef(init, target, options);
}

export type BindableProps = {
  [key: string]: unknown;
};

export type BindableProp = {
  key: string;
  value: BindingRef<unknown, unknown>;
};

export function bindableProps<P extends BindableProps>(props: P): BindableProp[] {
  return Object.entries(props)
    .filter(([, value]) => isBindable(value))
    .map(([key, value]) => ({ key, value }) as BindableProp);
}
