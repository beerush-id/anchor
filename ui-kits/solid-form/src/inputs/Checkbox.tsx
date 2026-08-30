import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, setup } from '@airlib/solid';
import type { JSX as Jsx } from 'solid-js';
import { CHECKBOX_OPTIONS, CHECKBOX_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface CheckboxProps extends Omit<Jsx.InputHTMLAttributes<HTMLInputElement>, 'checked'> {
  errorClass?: string;
  checked?: Bindable<boolean>;
}

export const Checkbox = setup<CheckboxProps>((props) => {
  (props as AnyType).type = 'checkbox';
  const restProps = props.$omit([
    'type',
    'name',
    'checked',
    'disabled',
    'class',
    'onChange',
    ...(CHECKBOX_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput(props as AnyType);
  const { baseClass, errorClass } = getInputClasses(CHECKBOX_OPTIONS);

  const handleChange = (e: Event) => {
    input.checked = (e.currentTarget as HTMLInputElement).checked;

    if (typeof props.onChange === 'function') {
      props.onChange(e as AnyType);
    }
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.class ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.class ?? baseClass;
  });

  return (
    <input
      {...restProps}
      type={input.type}
      name={input.name}
      checked={input.checked}
      disabled={input.disabled}
      class={className.value}
      onChange={handleChange}
    />
  );
});
