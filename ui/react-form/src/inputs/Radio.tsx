import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked'> {
  errorClass?: string;
  checked?: Bindable<boolean>;
}

export const Radio = setup<RadioProps>((props) => {
  (props as AnyType).type = 'radio';
  const input = formInput(props as AnyType);
  const rest = props.$omit([
    'value',
    'type',
    'name',
    'checked',
    'disabled',
    'className',
    'onChange',
    ...(RADIO_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(RADIO_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    input.checked = e.currentTarget.checked;
    props.onChange?.(e);
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.className ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.className ?? baseClass;
  });

  return render(
    () => (
      <input
        {...rest}
        type={input.type}
        name={input.name}
        value={input.value}
        checked={input.checked}
        disabled={input.disabled}
        className={className.value}
        onChange={handleChange}
      />
    ),
    'RadioView'
  );
}, 'Radio');
