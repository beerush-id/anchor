import type { FormInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import { createInput } from './createInput.js';

export interface NumberInputProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: NumberInputProps;
  errorClass?: string;
  value?: Bindable<number>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<number>) => ReactNode);
}
export const NumberInput = createInput<NumberInputProps>('number');
