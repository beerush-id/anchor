import type { FormInput } from '@airlib/form';
import type { Bindable, JSX } from '@airlib/solid';
import { createInput } from './createInput.js';

export interface DatePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: DatePickerProps;
  errorClass?: string;
  value?: Bindable<Date>;
  children?: JSX.Element | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<Date>) => JSX.Element);
}
export const DatePicker = createInput<DatePickerProps>('date');
