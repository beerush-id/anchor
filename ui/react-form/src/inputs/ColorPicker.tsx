import type { Bindable } from '@airlib/react';
import type { ComponentProps } from 'react';
import { createInput } from './createInput.js';

export interface ColorPickerProps extends Omit<ComponentProps<'input'>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const ColorPicker = createInput<ColorPickerProps>('color');
