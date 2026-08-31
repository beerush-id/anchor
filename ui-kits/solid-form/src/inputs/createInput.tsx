import type { AnyType, FormInput, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import { type Bindable, classx, derived, type JSX, setup } from '@airlib/solid';
import { getInputClasses, getSpecificOptions, INPUT_OPTIONS_KEYS } from '../config.js';

export interface InputProps<T = AnyType> extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: InputProps<T>;
  errorClass?: string;
  value?: Bindable<T>;
  children?: JSX.Element | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<T>) => JSX.Element);
}

export function createInput<P extends Record<string, AnyType> = InputProps, T = AnyType>(
  type: string,
  options?: FormInputOptions<T>
) {
  const name = `${type.charAt(0).toUpperCase() + type.slice(1)}Input`;

  const { options: specificOptions, keys: specificOptionKeys } = getSpecificOptions(type);

  return setup<P>((props) => {
    const $props = ((props as AnyType).for ?? props) as AnyType;
    $props.type = type;

    const rest = $props.$omit([
      'for',
      'value',
      'type',
      'name',
      'id',
      'disabled',
      'class',
      'children',
      'onInput',
      'onBlur',
      ...specificOptionKeys,
      ...INPUT_OPTIONS_KEYS,
    ]);
    const attrs = derived.as(() => {
      const input = formInput<T>($props, options);
      const fieldId = $props.id || input.name.replace(/\./g, '-');
      const errorId = `${fieldId}-error`;

      return { input, fieldId, errorId };
    });

    const handleInput = (e: InputEvent) => {
      attrs.input.value = (e.currentTarget as HTMLInputElement).value as AnyType;
      $props.onInput?.(e as AnyType);
    };

    const handleBlur = (e: FocusEvent) => {
      attrs.input.settled();
      $props.onBlur?.(e as AnyType);
    };

    const className = derived(() => {
      const { baseClass, errorClass } = getInputClasses(specificOptions || undefined);
      return classx(
        baseClass,
        $props.class,
        Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
      );
    });

    return () => {
      const children = (props as AnyType).children ?? $props.children;
      if (typeof children === 'function') {
        const inputProps = {
          ...rest,
          id: attrs.fieldId,
          type: attrs.input.type,
          name: attrs.input.name,
          disabled: attrs.input.disabled,
          class: className.value,
          value: attrs.input.value,
          'aria-invalid': attrs.input.error ? (true as const) : undefined,
          'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
          onInput: handleInput,
          onBlur: handleBlur,
        };
        return children(inputProps as AnyType, attrs.input);
      }

      return (
        <input
          {...rest}
          id={attrs.fieldId}
          type={attrs.input.type}
          name={attrs.input.name}
          disabled={attrs.input.disabled}
          class={className.value}
          value={attrs.input.value}
          aria-invalid={attrs.input.error ? (true as const) : undefined}
          aria-describedby={attrs.input.error ? attrs.errorId : undefined}
          onInput={handleInput}
          onBlur={handleBlur}
        />
      );
    };
  }, name);
}
