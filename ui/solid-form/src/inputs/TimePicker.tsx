import type { Bindable } from '@airlib/solid';
import type { JSX } from 'solid-js';
import { createInput } from './createInput.js';

export interface TimePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<Date>;
}
export const TimePicker = createInput<TimePickerProps>('time');
