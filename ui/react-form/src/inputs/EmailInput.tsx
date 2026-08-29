import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface EmailInputProps extends Omit<ComponentProps<'input'>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const EmailInput = createInput<EmailInputProps>('email');
