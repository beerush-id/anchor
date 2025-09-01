import { type InputHTMLAttributes, type Ref } from 'react';
import type { Bindable } from '../types.js';
import { useWatcher } from '../derive.js';
import { cleanProps } from '../utils.js';

export type InputProps<T extends Bindable> = {
  bind: T;
  name: keyof T;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>;

export function Input<T extends Bindable, P extends InputProps<T>>({ bind, name, value, onChange, ...props }: P) {
  const current = (useWatcher(bind, name) ?? value) as string;

  return (
    <input
      name={name as string}
      value={current}
      onChange={(e) => {
        if (bind) {
          let value = e.target.value;

          if (props.type === 'number') {
            value = parseFloat(value) as never;
          }

          bind[name] = value as never;
        } else {
          onChange?.(e);
        }
      }}
      {...cleanProps(props)}
    />
  );
}

export function Checkbox<T extends Bindable>({ bind, name, checked, onChange, ...props }: InputProps<T>) {
  const current = (useWatcher(bind, name) ?? checked) as boolean;

  return (
    <input
      type="checkbox"
      name={name as string}
      checked={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.checked as never;
        } else {
          onChange?.(e);
        }
      }}
      {...cleanProps(props)}
    />
  );
}

export function Radio<T extends Bindable>({ bind, name, checked, onChange, ...props }: InputProps<T>) {
  const current = (useWatcher(bind, name) ?? checked) as boolean;

  return (
    <input
      type="radio"
      name={name as string}
      checked={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.checked as never;
        } else {
          onChange?.(e);
        }
      }}
      {...cleanProps(props)}
    />
  );
}
