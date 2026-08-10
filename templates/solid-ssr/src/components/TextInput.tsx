import { type Bindable, setup } from '@anchorlib/solid';
import type { ComponentProps, JSX } from 'solid-js';

export type TextInputProps = Omit<ComponentProps<'input'>, 'value'> & {
  value?: Bindable<string>;
};

export const TextInput = setup<TextInputProps>((props) => {
  const $props = props.$omit(['value', 'onInput']);

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    props.value = e.currentTarget.value;
    if (typeof props.onInput === 'function') props.onInput(e);
  };

  return <input {...$props} value={props.value} onInput={handleInput} />;
}, 'TextInput');