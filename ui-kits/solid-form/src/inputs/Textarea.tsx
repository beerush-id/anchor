import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, setup } from '@airlib/solid';
import type { JSX as Jsx } from 'solid-js';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<Jsx.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}

export const Textarea = setup<TextareaProps>((props) => {
  const restProps = props.$omit([
    'value',
    'name',
    'disabled',
    'class',
    'onInput',
    'onBlur',
    ...(TEXTAREA_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput(props as AnyType);
  const { baseClass, errorClass } = getInputClasses(TEXTAREA_OPTIONS);

  const handleInput = (e: Event) => {
    input.value = (e.currentTarget as HTMLTextAreaElement).value;
    if (typeof props.onInput === 'function') {
      props.onInput(e as AnyType);
    }
  };

  const handleBlur = (e: Event) => {
    input.settled();
    if (typeof props.onBlur === 'function') {
      props.onBlur(e as AnyType);
    }
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.class ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.class ?? baseClass;
  });

  return (
    <textarea
      {...restProps}
      name={input.name}
      value={input.value}
      disabled={input.disabled}
      class={className.value}
      onInput={handleInput}
      onBlur={handleBlur}
    />
  );
});
