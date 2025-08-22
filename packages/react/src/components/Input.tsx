import { type InputHTMLAttributes } from 'react';
import { cleanProps, observed } from '../observable.js';
import type { Bindable } from '../types.js';

export type InputProps<T extends Bindable> = {
  bind: T;
  name: keyof T;
} & InputHTMLAttributes<HTMLInputElement>;

function InputComp<T extends Bindable>({ bind, name, value, onChange, ...props }: InputProps<T>) {
  return (
    <input
      name={name}
      value={(bind?.[name] ?? value) as string | number | undefined}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.value as never;
        } else {
          onChange?.(e);
        }
      }}
      {...cleanProps(props)}
    />
  );
}

export const Input = observed(InputComp, 'Input');

function CheckboxComp<T extends Bindable>({ bind, name, checked, onChange, ...props }: InputProps<T>) {
  return (
    <input
      type="checkbox"
      name={name}
      checked={(bind?.[name] ?? checked) as boolean | undefined}
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

export const Checkbox = observed(CheckboxComp, 'Checkbox');

function RadioComp<T extends Bindable>({ bind, name, checked, onChange, ...props }: InputProps<T>) {
  return (
    <input
      type="radio"
      name={name}
      checked={(bind?.[name] ?? checked) as boolean | undefined}
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

export const Radio = observed(RadioComp, 'Radio');
