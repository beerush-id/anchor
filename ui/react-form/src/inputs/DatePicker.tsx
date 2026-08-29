import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface DatePickerProps extends Omit<ComponentProps<'input'>, 'value'> {
  value?: Bindable<Date>;
  errorClass?: string;
}
export const DatePicker = createInput<DatePickerProps>('date');
