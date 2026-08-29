import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, setup } from '@airlib/solid';
import { createEffect, type JSX as Jsx } from 'solid-js';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<Jsx.SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string | number>;
}

export const Select = setup<SelectProps>((props) => {
  const input = formInput(props as AnyType);
  const restProps = props.$omit([
    'value',
    'name',
    'disabled',
    'class',
    'onChange',
    ...(SELECT_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const { baseClass, errorClass } = getInputClasses(SELECT_OPTIONS);

  let ref: HTMLSelectElement | undefined;
  createEffect(() => {
    if (ref) ref.value = input.value;
  });

  const handleChange = (e: Event) => {
    input.value = (e.currentTarget as HTMLSelectElement).value;
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
    <select
      ref={(el) => (ref = el)}
      {...restProps}
      name={input.name}
      value={input.value}
      disabled={input.disabled}
      class={className.value}
      onChange={handleChange}
    >
      {props.children}
    </select>
  );
});
