import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps } from 'react';
import { CHECKBOX_OPTIONS, CHECKBOX_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'checked'> {
  errorClass?: string;
  checked?: Bindable<boolean>;
}

export const Checkbox = setup<CheckboxProps>((props) => {
  (props as AnyType).type = 'checkbox';
  const input = formInput(props as AnyType);
  const rest = props.$omit([
    'type',
    'name',
    'checked',
    'disabled',
    'className',
    'onChange',
    ...(CHECKBOX_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(CHECKBOX_OPTIONS);

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
        checked={input.checked}
        disabled={input.disabled}
        className={className.value}
        onChange={handleChange}
      />
    ),
    'CheckboxView'
  );
}, 'Checkbox');
