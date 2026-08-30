import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { type Bindable, classx, derived, effect, render, setup } from '@airlib/react';
import type { ComponentProps, FocusEvent, InputEvent, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'value' | 'children'> {
  for?: TextareaProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?: ReactNode | ((props: ComponentProps<'textarea'>, input: FormInput<string>) => ReactNode);
}

export const Textarea = setup<TextareaProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;

  const input = formInput<string>($props);
  const rest = $props.$omit([
    'for',
    'value',
    'name',
    'id',
    'disabled',
    'className',
    'children',
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

    if (typeof $props.ref === 'function') {
      $props.ref(el);
    } else if ($props.ref && typeof $props.ref === 'object') {
      $props.ref.current = el;
    }
  };

  effect(() => {
    const value = input.value;
    /* istanbul ignore next */
    if (ref && ref.value !== value) ref.value = (value ?? '') as AnyType;
  });

  return render(() => {
    const textareaProps = {
      ...rest,
      ref: assignRef,
      id: fieldId,
      name: input.name,
      disabled: input.disabled,
      className: className.value,
      defaultValue: input.value as AnyType,
      'aria-invalid': input.error ? (true as const) : undefined,
      'aria-describedby': input.error ? errorId : undefined,
      onInput: handleInput,
      onBlur: handleBlur,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(textareaProps, input);
    }

    return <textarea {...textareaProps} />;
  }, 'TextareaView');
}, 'Textarea');
