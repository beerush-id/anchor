import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface DateTimePickerProps extends Omit<ComponentProps<'input'>, 'value'> {
  value?: Bindable<Date>;
  errorClass?: string;
}
export const DateTimePicker = createInput<DateTimePickerProps>('datetime-local');
