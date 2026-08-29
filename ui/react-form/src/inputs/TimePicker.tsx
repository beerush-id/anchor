import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface TimePickerProps extends Omit<ComponentProps<'input'>, 'value'> {
  value?: Bindable<Date>;
  errorClass?: string;
}
export const TimePicker = createInput<TimePickerProps>('time');
