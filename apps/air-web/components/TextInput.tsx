import { type Bindable, render, setup } from '@airlib/react';
import type { ComponentProps, InputEventHandler } from 'react';

export type TextInputProps = Omit<ComponentProps<'input'>, 'value'> & {
  value?: Bindable<string>;
};

export const TextInput = setup<TextInputProps>((props) => {
  const $props = props.$omit(['value', 'onInput']);

  const handleInput: InputEventHandler<HTMLInputElement> = (e) => {
    props.value = e.currentTarget.value;
    props.onInput?.(e);
  };

  return render(() => <input {...$props} value={props.value} onInput={handleInput} />, 'TextInput');
}, 'TextInput');
