import type { FormInput } from '@airlib/form';
import type { Bindable, JSX } from '@airlib/solid';
import { createInput } from './createInput.js';

export interface NumberInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: NumberInputProps;
  errorClass?: string;
  value?: Bindable<number>;
  children?:
    | JSX.Element
    | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<number>) => JSX.Element);
}
export const NumberInput = createInput<NumberInputProps>('number');
