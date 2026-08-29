import type { Bindable } from '@airlib/react';
import type { InputHTMLAttributes } from 'react';
import { createInput } from './createInput.js';

export interface DateTimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value?: Bindable<Date>;
  errorClass?: string;
}
export const DateTimePicker = createInput<DateTimePickerProps>('datetime-local');
