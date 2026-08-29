import type { AnyType, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { FocusEvent, InputEvent } from 'react';
import { getInputClasses, getSpecificOptions, INPUT_OPTIONS_KEYS } from '../config.js';

export function createInput<P, T = AnyType>(type: string, options?: FormInputOptions<T>) {
  const name = `${type.charAt(0).toUpperCase() + type.slice(1)}Input`;

  const { options: specificOptions, keys: specificOptionKeys } = getSpecificOptions(type);

  return setup<P>((props) => {
    const $props = props as AnyType;
    $props.type = type;

    const { baseClass, errorClass } = getInputClasses(specificOptions || undefined);

    const rest = $props.$omit([
      'value',
      'type',
      'name',
      'id',
      'disabled',
      'className',
      'onInput',
      'onBlur',
      ...specificOptionKeys,
      ...INPUT_OPTIONS_KEYS,
    ]);
    const input = formInput(props as AnyType, options);
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

    const className = derived(() => {
      if (input.touched && (input.error || !input.matched)) {
        return [$props.className ?? baseClass, $props.errorClass ?? errorClass].filter(Boolean).join(' ');
      }
      return $props.className ?? baseClass;
    });

    return render(
      () => (
        <input
          {...rest}
          id={fieldId}
          type={input.type}
          name={input.name}
          value={input.value}
          disabled={input.disabled}
          className={className.value}
          aria-invalid={input.error ? true : undefined}
          aria-describedby={input.error ? errorId : undefined}
          onInput={handleInput}
          onBlur={handleBlur}
        />
      ),
      `${name}View`
    );
  }, name);
}
