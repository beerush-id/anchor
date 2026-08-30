import type { FormInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import { createInput } from './createInput.js';

export interface EmailInputProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: EmailInputProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<string>) => ReactNode);
}
export const EmailInput = createInput<EmailInputProps>('email');
