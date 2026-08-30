import type { AnyType, FormField, FormState } from '@airlib/form';
import { formField } from '@airlib/form';
import { setup } from '@airlib/solid';
import { createMemo, For, type JSX } from 'solid-js';
import type { ZodObject, ZodRawShape } from 'zod';
import { FIELD_OPTIONS, FIELD_OPTIONS_KEYS, type FieldDefaultOptions } from './config.js';

export interface FieldProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'>,
  Omit<FieldDefaultOptions, 'class'> {
  name: string;
  match?: string | ((form: FormState<ZodObject<ZodRawShape>>) => boolean);
  label?: string;
  children?: JSX.Element | ((field: FormField<unknown>) => JSX.Element);
}

export const Field = setup<FieldProps>((props) => {
  const rest = props.$omit(['name', 'match', 'label', 'children', ...(FIELD_OPTIONS_KEYS as never[])]);
  const field = formField(() => props.name, props.match);
  const fieldId = () => props.name.replace(/\./g, '-');
  const errorId = () => `${fieldId()}-error`;

  return createMemo(() => {
    if (!field.name) {
      return (
        <span class={props.errorClass ?? FIELD_OPTIONS.errorClass}>[FieldError]: Name property is required!</span>
      ) as unknown as JSX.Element;
    }
    if (typeof props.children === 'function') {
      return props.children(field);
    }

    return (
      <div {...rest} class={props.class ?? FIELD_OPTIONS.class}>
        {props.label && (
          <label for={fieldId()} class={props.labelClass ?? FIELD_OPTIONS.labelClass}>
            {props.label}
            {field.required && (
              <span class={props.requiredClass ?? FIELD_OPTIONS.requiredClass}>
                {props.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
              </span>
            )}
          </label>
        )}
        {props.children}
        {field.touched && field.error && (
          <For each={field.error}>
            {(error) => (
              <span id={errorId()} class={props.errorClass ?? FIELD_OPTIONS.errorClass} role="alert">
                {error}
              </span>
            )}
          </For>
        )}
        {field.valid && !field.matched && props.mismatchLabel && (
          <span id={errorId()} class={props.errorClass ?? FIELD_OPTIONS.errorClass} role="alert">
            {props.mismatchLabel}
          </span>
        )}
      </div>
    );
  }) as AnyType;
});
