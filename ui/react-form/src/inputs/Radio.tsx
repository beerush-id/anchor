import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<ComponentProps<'input'>, 'checked'> {
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

  const className = derived(() =>
    classx(
      baseClass,
      props.className,
      Boolean(input.touched && (input.error || !input.matched)) && (props.errorClass ?? errorClass)
    )
  );

  return render(
    () => (
      <input
        {...rest}
        type={input.type}
        name={input.name}
        value={input.value as AnyType}
        checked={input.checked}
        disabled={input.disabled}
        className={className.value}
        onChange={handleChange}
      />
    ),
    'RadioView'
  );
}, 'Radio');
