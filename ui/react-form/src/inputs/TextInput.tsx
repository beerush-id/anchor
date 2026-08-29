import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface TextInputProps extends Omit<ComponentProps<'input'>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const TextInput = createInput<TextInputProps>('text');
