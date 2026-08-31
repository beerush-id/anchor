import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<ComponentProps<'input'>, 'checked' | 'children'> {
  for?: RadioProps;
  errorClass?: string;
  checked?: Bindable<boolean>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<AnyType>) => ReactNode);
}

export const Radio = setup<RadioProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
  $props.type = 'radio';

  const $restProps = $props.$omit([
    'for',
    'value',
    'type',
    'name',
    'id',
    'checked',
    'disabled',
    'className',
    'children',
    'onChange',
    'ref',
    ...(RADIO_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(RADIO_OPTIONS);
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
      value: attrs.input.value as AnyType,
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
}, 'Radio');
