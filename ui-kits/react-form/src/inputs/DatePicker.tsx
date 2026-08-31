import type { FormInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import { createInput } from './createInput.js';

export interface DatePickerProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: DatePickerProps;
  value?: Bindable<Date>;
  errorClass?: string;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<Date>) => ReactNode);
}
export const DatePicker = createInput<DatePickerProps>('date');
