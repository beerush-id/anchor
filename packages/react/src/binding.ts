import {
  createObserver,
  isMutableRef,
  isValueRef,
  mutable,
  type MutableRef,
  type StateObserver,
  type StateOptions,
  untrack,
} from '@anchorlib/core';

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

export function bind<T extends MutableRef<unknown>>(source: T): T['value'];
export function bind<T extends Record<string, unknown>, K extends keyof T>(source: T, key: K): T[K];
export function bind<T>(source: T, key?: keyof T) {
  return new BindingRef(source, key);
}

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

export function bindingProps<P>(props: P) {
  return new Proxy(props as BindableProps, {
    get(target, key, receiver) {
      const bindingRef = Reflect.get(target, key, receiver);

      if (isBinding(bindingRef)) {
        return (bindingRef.source as Record<string, unknown>)[bindingRef.key];
      } else if (isMutableRef(bindingRef)) {
        return bindingRef.value;
      }

      return bindingRef;
    },
    set(target, key, value, receiver) {
      const bindingRef = untrack(() => Reflect.get(target, key, receiver));

      if (isBinding(bindingRef)) {
        (bindingRef.source as Record<string, unknown>)[bindingRef.key] = value;
      } else if (isMutableRef(bindingRef)) {
        bindingRef.value = value;
      }

      return true;
    },
  });
}
