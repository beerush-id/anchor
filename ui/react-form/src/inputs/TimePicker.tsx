import type { Bindable } from '@airlib/react';
import type { InputHTMLAttributes } from 'react';
import { createInput } from './createInput.js';

export interface TimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value?: Bindable<Date>;
  errorClass?: string;
}
export const TimePicker = createInput<TimePickerProps>('time');
