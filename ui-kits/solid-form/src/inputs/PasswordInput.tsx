import type { Bindable } from '@airlib/solid';
import type { JSX } from 'solid-js';
import { createInput } from './createInput.js';

export interface PasswordInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const PasswordInput = createInput<PasswordInputProps>('password');
