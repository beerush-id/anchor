import { type AnyType, formInput } from '@airlib/form';
import { type Bindable, classx, derived, effect, render, setup } from '@airlib/react';
import type { ComponentProps, FocusEvent, InputEvent } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'value'> {
  value?: Bindable<string>;
  errorClass?: string;
}

export const Textarea = setup<TextareaProps>((props) => {
  const $props = props as AnyType;
  const input = formInput(props as AnyType);
  const rest = $props.$omit([
    'value',
    'name',
    'id',
    'disabled',
    'className',
    'onInput',
    'onBlur',
    'ref',
    ...(TEXTAREA_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(TEXTAREA_OPTIONS);
  const fieldId = $props.id || input.name.replace(/\./g, '-');
  const errorId = `${fieldId}-error`;

  const handleInput = (e: InputEvent<HTMLTextAreaElement>) => {
    input.value = e.currentTarget.value;
    $props.onInput?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    input.settled();
    $props.onBlur?.(e);
  };

  const className = derived(() =>
    classx(
      baseClass,
      $props.className,
      Boolean(input.touched && (input.error || !input.matched)) && ($props.errorClass ?? errorClass)
    )
  );

  let ref: HTMLTextAreaElement | undefined;

  const assignRef = (el: HTMLTextAreaElement) => {
    ref = el;

    if ('ref' in props) {
      const $ref = (props as AnyType).ref;

      if (typeof $ref === 'function') {
        $ref(el);
      } else if ($ref && typeof $ref === 'object') {
        $ref.current = el;
      }
    }
  };

  effect(() => {
    const value = input.value;
    if (ref && ref.value !== value) ref.value = (value ?? '') as AnyType;
  });

  return render(
    () => (
      <textarea
        {...rest}
        ref={assignRef}
        id={fieldId}
        name={input.name}
        defaultValue={input.value as AnyType}
        disabled={input.disabled}
        className={className.value}
        aria-invalid={input.error ? true : undefined}
        aria-describedby={input.error ? errorId : undefined}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    ),
    'TextareaView'
  );
}, 'Textarea');
