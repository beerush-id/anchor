import { type HTMLAttributes, type InputHTMLAttributes, type Ref, type SelectHTMLAttributes, useRef } from 'react';
import type { Bindable } from '../types.js';
import { useValue } from '../derive.js';
import type { WritableKeys } from '@anchor/core';
import { debugRender } from '../dev.js';

export type BindProps<T extends Bindable, K extends WritableKeys<T>> = {
  bind: T;
  name: K;
};
export type ForwardProps<T extends HTMLAttributes<HTMLElement>> = Omit<T, 'name'>;

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = BindProps<T, K> & {
  ref?: Ref<HTMLInputElement>;
} & ForwardProps<InputHTMLAttributes<HTMLInputElement>>;

export function Input<T extends Bindable, K extends WritableKeys<T>>({
  bind,
  name,
  value,
  onChange,
  ...props
}: InputProps<T, K>) {
  const ref = useRef<HTMLInputElement>(null);
  debugRender(ref.current);

  const current = (useValue(bind, name) ?? value ?? '') as string;

  return (
    <input
      ref={ref}
      name={name as string}
      value={current}
      onChange={(e) => {
        if (bind) {
          let value = e.target.value;

          if (props.type === 'number') {
            value = parseFloat(value) as never;
          }

          bind[name] = value as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}

export function Checkbox<T extends Bindable, K extends WritableKeys<T>>({
  bind,
  name,
  checked,
  onChange,
  ...props
}: InputProps<T, K>) {
  const ref = useRef<HTMLInputElement>(null);
  debugRender(ref.current);

  const current = (useValue(bind, name) ?? checked ?? false) as boolean;

  return (
    <input
      ref={ref}
      type="checkbox"
      name={name as string}
      checked={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.checked as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}

export function Radio<T extends Bindable, K extends WritableKeys<T>>({
  bind,
  name,
  checked,
  onChange,
  ...props
}: InputProps<T, K>) {
  const ref = useRef<HTMLInputElement>(null);
  debugRender(ref.current);

  const current = (useValue(bind, name) ?? checked ?? false) as boolean;

  return (
    <input
      ref={ref}
      type="radio"
      name={name as string}
      checked={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.checked as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}

export type SelectProps<T extends Bindable, K extends WritableKeys<T>> = BindProps<T, K> & {
  ref?: Ref<HTMLSelectElement>;
} & ForwardProps<SelectHTMLAttributes<HTMLSelectElement>>;

export function Select<T extends Bindable, K extends WritableKeys<T>>({
  bind,
  name,
  value,
  onChange,
  ...props
}: SelectProps<T, K>) {
  const ref = useRef<HTMLSelectElement>(null);
  debugRender(ref.current);

  const current = (useValue(bind, name) ?? value ?? '') as string;

  return (
    <select
      ref={ref}
      name={name as string}
      value={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.value as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}
