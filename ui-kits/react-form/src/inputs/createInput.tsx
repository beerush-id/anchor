import type { AnyType, FormInput, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import type { Bindable } from '@airlib/react';
import { classx, derived, effect, render, setup } from '@airlib/react';
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
    const $props = ((props as AnyType).for ?? props) as AnyType;
    $props.type = type;

    const { baseClass, errorClass } = getInputClasses(specificOptions || undefined);

    const rest = $props.$omit([
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
    const input = formInput($props, options);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    const handleInput = (e: InputEvent<HTMLInputElement>) => {
      input.value = e.currentTarget.value;
      $props.onInput?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
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
      const value = input.value;
      /* istanbul ignore next */
      if (ref && ref.value !== value) ref.value = (value ?? '') as AnyType;
    });

    return render(() => {
      const inputProps = {
        ...rest,
        ref: assignRef,
        id: fieldId,
        type: input.type,
        name: input.name,
        disabled: input.disabled,
        className: className.value,
        defaultValue: input.value as AnyType,
        'aria-invalid': input.error ? (true as const) : undefined,
        'aria-describedby': input.error ? errorId : undefined,
        onInput: handleInput,
        onBlur: handleBlur,
      };

      if (typeof $props.children === 'function') {
        return $props.children(inputProps, input);
      }

      return <input {...inputProps} />;
    }, `${name}View`);
  }, name);
}
