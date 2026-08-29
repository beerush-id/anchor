import type { Bindable } from '@airlib/react';
import type { InputHTMLAttributes } from 'react';
import { createInput } from './createInput.js';

export interface EmailInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const EmailInput = createInput<EmailInputProps>('email');
