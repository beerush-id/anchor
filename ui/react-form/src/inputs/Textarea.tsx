import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, derived, render, setup } from '@airlib/react';
import type { FocusEvent, InputEvent, TextareaHTMLAttributes } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> {
  errorClass?: string;
  value?: Bindable<string>;
}

export const Textarea = setup<TextareaProps>((props) => {
  const input = formInput(props as AnyType);
  const rest = props.$omit([
    'value',
    'name',
    'disabled',
    'className',
    'onInput',
    'onBlur',
    ...(TEXTAREA_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(TEXTAREA_OPTIONS);

  const handleInput = (e: InputEvent<HTMLTextAreaElement>) => {
    input.value = e.currentTarget.value;
    props.onInput?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    input.settled();
    props.onBlur?.(e);
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.className ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.className ?? baseClass;
  });

  return render(
    () => (
      <textarea
        {...rest}
        name={input.name}
        value={input.value}
        disabled={input.disabled}
        className={className.value}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    ),
    'TextareaView'
  );
}, 'Textarea');
