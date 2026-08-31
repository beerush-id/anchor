import type { FormInput } from '@airlib/form';
import type { Bindable, JSX } from '@airlib/solid';
import { createInput } from './createInput.js';

export interface TimePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: TimePickerProps;
  errorClass?: string;
  value?: Bindable<Date>;
  children?: JSX.Element | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<Date>) => JSX.Element);
}
export const TimePicker = createInput<TimePickerProps>('time');
