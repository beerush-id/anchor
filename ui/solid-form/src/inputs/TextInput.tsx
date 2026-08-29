import type { Bindable } from '@airlib/solid';
import type { JSX } from 'solid-js';
import { createInput } from './createInput.js';

export interface TextInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const TextInput = createInput<TextInputProps>('text');
