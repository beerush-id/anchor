import type { Bindable } from '@airlib/solid';
import type { JSX } from 'solid-js';
import { createInput } from './createInput.js';

export interface DatePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<Date>;
}
export const DatePicker = createInput<DatePickerProps>('date');
