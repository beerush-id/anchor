import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<ComponentProps<'select'>, 'value'> {
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
  const className = derived(() =>
    classx(
      baseClass,
      props.className,
      Boolean(input.touched && (input.error || !input.matched)) && (props.errorClass ?? errorClass)
    )
  );

  return render(
    () => (
      <select
        {...rest}
        name={input.name}
        value={input.value as AnyType}
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
