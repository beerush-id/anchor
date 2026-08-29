import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface NumberInputProps extends Omit<ComponentProps<'input'>, 'value'> {
  errorClass?: string;
  value?: Bindable<number>;
}
export const NumberInput = createInput<NumberInputProps>('number');
