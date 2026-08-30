import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<ComponentProps<'select'>, 'value' | 'children'> {
  for?: SelectProps;
  errorClass?: string;
  value?: Bindable<string | number>;
  children?: ReactNode | ((props: ComponentProps<'select'>, input: FormInput<string | number>) => ReactNode);
}

export const Select = setup<SelectProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;

  const rest = $props.$omit([
    'for',
    'value',
    'name',
    'disabled',
    'className',
    'children',
    'onChange',
    ...(SELECT_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput<string | number>($props);

  const { baseClass, errorClass } = getInputClasses(SELECT_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    input.value = e.currentTarget.value;
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
    const selectProps = {
      ...rest,
      name: input.name,
      disabled: input.disabled,
      className: className.value,
      value: input.value as AnyType,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(selectProps, input);
    }

    return <select {...selectProps}>{children}</select>;
  }, 'SelectView');
}, 'Select');
