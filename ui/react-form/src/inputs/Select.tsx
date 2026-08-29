import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, SelectHTMLAttributes } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string | number>;
}

export const Select = setup<SelectProps>((props) => {
  const rest = props.$omit([
    'value',
    'name',
    'disabled',
    'className',
    'onChange',
    ...(SELECT_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput(props as AnyType);

  const { baseClass, errorClass } = getInputClasses(SELECT_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    input.value = e.currentTarget.value;
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
      <select
        {...rest}
        name={input.name}
        value={input.value}
        disabled={input.disabled}
        className={className.value}
        onChange={handleChange}
      >
        {props.children}
      </select>
    ),
    'SelectView'
  );
}, 'Select');
