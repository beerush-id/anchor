import type { AnyType, FormInput, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import { $static, classx, derived, effect, setup } from '@airlib/react';
import type { ComponentProps, FocusEvent, InputEvent, ReactNode } from 'react';
import { getInputClasses, getSpecificOptions, INPUT_OPTIONS_KEYS } from '../config.js';

export interface InputProps<T = AnyType> extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: InputProps<T>;
  errorClass?: string;
  value?: Bindable<T>;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<T>) => ReactNode);
}

export function createInput<P = InputProps, T = AnyType>(type: string, options?: FormInputOptions<T>) {
  const name = `${type.charAt(0).toUpperCase() + type.slice(1)}Input`;

  const { options: specificOptions, keys: specificOptionKeys } = getSpecificOptions(type);

  return setup<P>((props) => {
    const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
    $props.type = type;

    const $restProps = $props.$omit([
      'for',
      'value',
      'type',
      'name',
      'id',
      'disabled',
      'className',
      'children',
      'onInput',
      'onBlur',
      'ref',
      ...specificOptionKeys,
      ...INPUT_OPTIONS_KEYS,
    ]);

    const attrs = derived.as(() => {
      const input = formInput<T>($props, options);
      const fieldId = $props.id || input.name.replace(/\./g, '-');
      const errorId = `${fieldId}-error`;

      return { input, fieldId, errorId };
    });

    const className = derived(() => {
      const { baseClass, errorClass } = getInputClasses(specificOptions || undefined);
      return classx(
        baseClass,
        $props.className,
        Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
      );
    });

    const handleInput = (e: InputEvent<HTMLInputElement>) => {
      attrs.input.value = e.currentTarget.value as AnyType;
      $props.onInput?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      attrs.input.settled();
      $props.onBlur?.(e);
    };

    let ref: HTMLInputElement | undefined;

    const assignRef = (el: HTMLInputElement) => {
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
      const inputProps = {
        ...$restProps,
        ref: assignRef,
        id: attrs.fieldId,
        type: attrs.input.type,
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
        return children(inputProps, attrs.input);
      }

      return <input {...inputProps} />;
    };
  }, name);
}
