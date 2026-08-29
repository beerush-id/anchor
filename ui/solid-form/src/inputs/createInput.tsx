import type { AnyType, FormInputOptions } from '@airlib/form';
import { formInput } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import { getInputClasses, getSpecificOptions, INPUT_OPTIONS_KEYS } from '../config.js';

export function createInput<P extends Record<string, AnyType>, T = AnyType>(
  type: string,
  options?: FormInputOptions<T>
) {
  return setup<P>((props) => {
    (props as AnyType).type = type;

    const { options: specificOptions, keys: specificOptionKeys } = getSpecificOptions(type);
    const { baseClass, errorClass } = getInputClasses(specificOptions!);
    const restProps = props.$omit([
      'value',
      'type',
      'name',
      'id',
      'class',
      'disabled',
      'onInput',
      'onBlur',
      ...specificOptionKeys,
      ...INPUT_OPTIONS_KEYS,
    ]);
    const input = formInput(props as AnyType, options);
    const $props = props as AnyType;
    const fieldId = () => $props.id || input.name.replace(/\./g, '-');
    const errorId = () => `${fieldId()}-error`;

    const handleInput = (e: Event) => {
      input.value = (e.currentTarget as HTMLInputElement).value;
      $props.onInput?.(e as AnyType);
    };

    const handleBlur = (e: Event) => {
      input.settled();
      $props.onBlur?.(e as AnyType);
    };

    const className = derived(() => {
      if (input.touched && (input.error || !input.matched)) {
        return [$props.class ?? baseClass, $props.errorClass ?? errorClass].filter(Boolean).join(' ');
      }
      return $props.class ?? baseClass;
    });

    return (
      <input
        {...restProps}
        id={fieldId()}
        type={input.type}
        name={input.name}
        value={input.value}
        disabled={input.disabled}
        class={className.value}
        aria-invalid={input.error ? true : undefined}
        aria-describedby={input.error ? errorId() : undefined}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    );
  });
}
