import type { FormInput } from '@airlib/form';
import type { Bindable, JSX } from '@airlib/solid';
import { createInput } from './createInput.js';

export interface ColorPickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: ColorPickerProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?:
    | JSX.Element
    | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<string>) => JSX.Element);
}
export const ColorPicker = createInput<ColorPickerProps>('color');
