import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, effect, setup } from '@airlib/react';
import type { ComponentProps, FocusEvent, InputEvent, ReactNode } from 'react';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'value' | 'children'> {
  for?: TextareaProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?: ReactNode | ((props: ComponentProps<'textarea'>, input: FormInput<string>) => ReactNode);
}

export const Textarea = setup<TextareaProps>((props) => {
  const $props = $static(() => (props as AnyType).for ?? props) as typeof props;
  const $restProps = $props.$omit([
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

  const attrs = derived.as(() => {
    const input = formInput<string>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(TEXTAREA_OPTIONS);
    return classx(
      baseClass,
      $props.className,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  const handleInput = (e: InputEvent<HTMLTextAreaElement>) => {
    attrs.input.value = e.currentTarget.value;
    $props.onInput?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    attrs.input.settled();
    $props.onBlur?.(e);
  };

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
    const value = attrs.input.value;
    /* istanbul ignore next */
    if (ref && ref.value !== value) ref.value = (value ?? '') as AnyType;
  });

  return () => {
    const textareaProps = {
      ...$restProps,
      ref: assignRef,
      id: attrs.fieldId,
      name: attrs.input.name,
      disabled: attrs.input.disabled,
      className: className.value,
      defaultValue: attrs.input.value as AnyType,
      'aria-invalid': attrs.input.error ? (true as const) : undefined,
      'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
      onInput: handleInput,
      onBlur: handleBlur,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(textareaProps, attrs.input);
    }

    return <textarea {...textareaProps} />;
  };
}, 'Textarea');
