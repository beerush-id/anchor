import type { JSX } from 'solid-js';

export type StateRef<T> = {
  value: T;
};

export type ConstantRef<T> = {
  get value(): T;
};

export type VariableRef<T> = {
  get value(): T;
  set value(value: T);
};

export type HTMLAttributes<E> = JSX.HTMLAttributes<E>;
export type EventHandler<T extends HTMLElement, E extends Event> = JSX.EventHandler<T, E>;

export type InputHTMLAttributes<E extends HTMLElement> = Omit<JSX.InputHTMLAttributes<E>, 'onInput' | 'oninput'> & {
  onInput?: EventHandler<E, InputEvent>;
  oninput?: EventHandler<E, InputEvent>;
};
