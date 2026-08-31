import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<ComponentProps<'select'>, 'value' | 'children'> {
  for?: SelectProps;
  errorClass?: string;
  value?: Bindable<string | number>;
  children?: ReactNode | ((props: ComponentProps<'select'>, input: FormInput<string | number>) => ReactNode);
}

export const Select = setup<SelectProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
  const $restProps = $props.$omit([
    'for',
    'value',
    'name',
    'id',
    'disabled',
    'className',
    'children',
    'onChange',
    'ref',
    ...(SELECT_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<string | number>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(SELECT_OPTIONS);
    return classx(
      baseClass,
      $props.className,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    attrs.input.value = e.currentTarget.value;
    $props.onChange?.(e);
  };

  return () => {
    const selectProps = {
      ...$restProps,
      ref: $props.ref,
      id: attrs.fieldId,
      name: attrs.input.name,
      disabled: attrs.input.disabled,
      className: className.value,
      value: attrs.input.value as AnyType,
      'aria-invalid': attrs.input.error ? (true as const) : undefined,
      'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(selectProps, attrs.input);
    }

    return <select {...selectProps}>{children}</select>;
  };
}, 'Select');
