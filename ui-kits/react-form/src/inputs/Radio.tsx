import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { type Bindable, classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<ComponentProps<'input'>, 'checked' | 'children'> {
  for?: RadioProps;
  errorClass?: string;
  checked?: Bindable<boolean>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<AnyType>) => ReactNode);
}

export const Radio = setup<RadioProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;
  $props.type = 'radio';

  const input = formInput($props);
  const rest = $props.$omit([
    'for',
    'value',
    'type',
    'name',
    'checked',
    'disabled',
    'className',
    'children',
    'onChange',
    ...(RADIO_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(RADIO_OPTIONS);

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
      value: input.value as AnyType,
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
  }, 'RadioView');
}, 'Radio');
