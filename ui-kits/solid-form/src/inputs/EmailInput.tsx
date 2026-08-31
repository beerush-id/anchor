import type { FormInput } from '@airlib/form';
import type { Bindable, JSX } from '@airlib/solid';
import { createInput } from './createInput.js';

export interface EmailInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: EmailInputProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?:
    | JSX.Element
    | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<string>) => JSX.Element);
}
export const EmailInput = createInput<EmailInputProps>('email');
