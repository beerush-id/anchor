import type { Bindable } from '@airlib/solid';
import type { JSX as Jsx } from 'solid-js/jsx-runtime';
import { createInput } from './createInput.js';

export interface ColorPickerProps extends Omit<Jsx.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}
export const ColorPicker = createInput<ColorPickerProps>('color');
