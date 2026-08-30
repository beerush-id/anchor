import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { CHECKBOX_OPTIONS, CHECKBOX_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'checked' | 'children'> {
  for?: CheckboxProps;
  errorClass?: string;
  checked?: Bindable<boolean>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<boolean>) => ReactNode);
}

export const Checkbox = setup<CheckboxProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;
  $props.type = 'checkbox';

  const input = formInput<boolean>($props);
  const rest = $props.$omit([
    'for',
    'type',
    'name',
    'checked',
    'disabled',
    'className',
    'children',
    'onChange',
    ...(CHECKBOX_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(CHECKBOX_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    input.checked = e.currentTarget.checked;
    $props.onChange?.(e);
  };

  const className = derived(() =>
    classx(
      baseClass,
      $props.className,
      Boolean(input.touched && (input.error || !input.matched)) && ($props.errorClass ?? errorClass)
    )
  );

  return render(() => {
    const inputProps = {
      ...rest,
      type: input.type,
      name: input.name,
      checked: input.checked,
      disabled: input.disabled,
      className: className.value,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(inputProps, input);
    }

    return <input {...inputProps} />;
  }, 'CheckboxView');
}, 'Checkbox');
