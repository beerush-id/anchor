import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, setup } from '@airlib/solid';
import type { JSX as Jsx } from 'solid-js';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<Jsx.InputHTMLAttributes<HTMLInputElement>, 'checked'> {
  errorClass?: string;
  checked?: Bindable<boolean>;
}

export const Radio = setup<RadioProps>((props) => {
  (props as AnyType).type = 'radio';
  const restProps = props.$omit([
    'value',
    'type',
    'name',
    'checked',
    'disabled',
    'class',
    'onChange',
    ...(RADIO_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput(props as AnyType);
  const { baseClass, errorClass } = getInputClasses(RADIO_OPTIONS);

  const handleChange = (e: Event) => {
    input.checked = (e.currentTarget as HTMLInputElement).checked;
    if (typeof props.onChange === 'function') {
      props.onChange(e as AnyType);
    }
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.class ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.class ?? baseClass;
  });

  return (
    <input
      {...restProps}
      type={input.type}
      name={input.name}
      value={input.value}
      checked={input.checked}
      disabled={input.disabled}
      class={className.value}
      onChange={handleChange}
    />
  );
});
