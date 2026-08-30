import type { FormInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import { createInput } from './createInput.js';

export interface DateTimePickerProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: DateTimePickerProps;
  value?: Bindable<Date>;
  errorClass?: string;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<Date>) => ReactNode);
}
export const DateTimePicker = createInput<DateTimePickerProps>('datetime-local');
