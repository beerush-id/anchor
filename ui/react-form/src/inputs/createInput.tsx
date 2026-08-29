import type { AnyType, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import { classx, derived, effect, render, setup } from '@airlib/react';
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
      'ref',
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

      if ('ref' in $props) {
        const $ref = $props.ref;

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
        <input
          {...rest}
          ref={assignRef}
          id={fieldId}
          type={input.type}
          name={input.name}
          disabled={input.disabled}
          className={className.value}
          defaultValue={input.value as AnyType}
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
