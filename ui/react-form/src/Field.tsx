import type { FormField, FormState } from '@airlib/form';
import { formField } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';
import { FIELD_OPTIONS, FIELD_OPTIONS_KEYS, type FieldDefaultOptions } from './config.js';

export interface FieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    Omit<FieldDefaultOptions, 'class'> {
  name: string;
  match?: string | ((form: FormState<ZodObject<ZodRawShape>>) => boolean);
  label?: string;
  children?: ReactNode | ((field: FormField<unknown>) => ReactNode);
}

export const Field = setup<FieldProps>((props) => {
  const rest = props.$omit(['name', 'match', 'label', 'className', 'children', ...(FIELD_OPTIONS_KEYS as never[])]);
  const field = formField(() => props.name, props.match);
  const fieldId = props.name.replace(/\./g, '-');
  const errorId = `${fieldId}-error`;

  const className = derived(() => {
    if (field.touched && field.error) {
      return [props.className ?? FIELD_OPTIONS.class, props.errorClass ?? FIELD_OPTIONS.errorClass]
        .filter(Boolean)
        .join(' ');
    }

    return props.className ?? FIELD_OPTIONS.class;
  });

  return render(() => {
    if (!field.name) {
      return (
        <span className={props.errorClass ?? FIELD_OPTIONS.errorClass}>[FieldError]: Name property is required!</span>
      );
    }
    if (typeof props.children === 'function') {
      return props.children(field);
    }

    return (
      <div {...rest} className={className.value}>
        {props.label && (
          <label htmlFor={fieldId} className={props.labelClass ?? FIELD_OPTIONS.labelClass}>
            {props.label}
            {field.required && (
              <span className={props.requiredClass ?? FIELD_OPTIONS.requiredClass}>
                {props.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
              </span>
            )}
          </label>
        )}
        {props.children}
        {field.touched &&
          field.error?.map((error, i) => (
            <span key={i} id={errorId} className={props.supportClass ?? FIELD_OPTIONS.supportClass} role="alert">
              {error}
            </span>
          ))}
        {field.valid && !field.matched && props.mismatchLabel && (
          <span id={errorId} className={props.supportClass ?? FIELD_OPTIONS.supportClass} role="alert">
            {props.mismatchLabel}
          </span>
        )}
      </div>
    );
  }, 'FieldView');
}, 'Field');
