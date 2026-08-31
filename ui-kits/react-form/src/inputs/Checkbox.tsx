import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { CHECKBOX_OPTIONS, CHECKBOX_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'checked' | 'children'> {
  for?: CheckboxProps;
  errorClass?: string;
  checked?: Bindable<boolean>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<boolean>) => ReactNode);
}

export const Checkbox = setup<CheckboxProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
  $props.type = 'checkbox';

  const $restProps = $props.$omit([
    'for',
    'type',
    'name',
    'id',
    'checked',
    'disabled',
    'className',
    'children',
    'onChange',
    'ref',
    ...(CHECKBOX_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<boolean>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(CHECKBOX_OPTIONS);
    return classx(
      baseClass,
      $props.className,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    attrs.input.checked = e.currentTarget.checked;
    $props.onChange?.(e);
  };

  return () => {
    const inputProps = {
      ...$restProps,
      ref: $props.ref,
      id: attrs.fieldId,
      type: attrs.input.type,
      name: attrs.input.name,
      checked: attrs.input.checked,
      disabled: attrs.input.disabled,
      className: className.value,
      'aria-invalid': attrs.input.error ? (true as const) : undefined,
      'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(inputProps, attrs.input);
    }

    return <input {...inputProps} />;
  };
}, 'Checkbox');
