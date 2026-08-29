import { type AnyType, formState } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { FormHTMLAttributes, SubmitEvent } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';
import { FORM_OPTIONS, FORM_OPTIONS_KEYS, type FormDefaultOptions } from './config.js';

export interface FormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>,
    Omit<FormDefaultOptions, 'class'> {
  value?: Record<string, AnyType>;
  schema: ZodObject<ZodRawShape>;
  onSubmit?: (
    data: Record<string, AnyType>,
    changes: Partial<Record<string, AnyType>>,
    e: SubmitEvent<HTMLFormElement>
  ) => Promise<void> | void;
}

export const Form = setup<FormProps>((props) => {
  FORM_OPTIONS_KEYS.forEach((key) => {
    if (key === 'class') return;
    if (!Object.hasOwn(props, key)) {
      props[key as never] = FORM_OPTIONS[key as never];
    }
  });
  const rest = props.$omit(['schema', 'value', 'className', 'onSubmit', ...(FORM_OPTIONS_KEYS as never[])]);
  const form = formState(props.schema as AnyType, props as AnyType);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.onSubmit) {
      form.submit((data: Record<string, AnyType>, changes: Partial<Record<string, AnyType>>) =>
        props.onSubmit!(data, changes, e)
      );
    }
  };

  const className = derived(() => {
    if (form.error) {
      return [props.className ?? FORM_OPTIONS.class, props.errorClass ?? FORM_OPTIONS.errorClass]
        .filter(Boolean)
        .join(' ');
    }
    return props.className ?? FORM_OPTIONS.class;
  });

  return render(
    () => (
      <form {...rest} className={className.value} onSubmit={handleSubmit}>
        {props.children}
      </form>
    ),
    'FormView'
  );
}, 'Form');
