import type { InputHTMLAttributes } from 'react';
import { createInput } from './createInput.js';
import type { Bindable } from '@airlib/react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const TextInput = createInput<TextInputProps>('text');
