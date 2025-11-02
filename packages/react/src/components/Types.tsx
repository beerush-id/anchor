import type { Bindable } from '../index.js';
import type { WritableKeys } from '@anchorlib/core';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, RefObject, SelectHTMLAttributes } from 'react';

export type BindProps<T extends Bindable, K extends WritableKeys<T>> = {
  bind: T;
  name: K;
  pipe?: T;
};
export type OmitProps<T extends HTMLAttributes<HTMLElement>> = Omit<T, 'name'>;

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = BindProps<T, K> & {
  ref?: RefObject<HTMLInputElement | null>;
  inherits?: Record<string, string | number | undefined>[];
} & OmitProps<InputHTMLAttributes<HTMLInputElement>>;

export type SelectProps<T extends Bindable, K extends WritableKeys<T>> = BindProps<T, K> & {
  ref?: RefObject<HTMLSelectElement | null>;
} & OmitProps<SelectHTMLAttributes<HTMLSelectElement>>;

export type ToggleProps<T, K extends WritableKeys<T>> = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: RefObject<HTMLButtonElement | null>;
  bind: T;
  name: K;
  value?: T[K];
  inherits?: Record<string, string | number | undefined>[];
  onChange?: (current: T[K] | undefined) => void;
};
