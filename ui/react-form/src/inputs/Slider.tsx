import type { FormInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import { createInput } from './createInput.js';

export interface SliderProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: SliderProps;
  errorClass?: string;
  value?: Bindable<number>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<number>) => ReactNode);
}
export const Slider = createInput<SliderProps>('range');
