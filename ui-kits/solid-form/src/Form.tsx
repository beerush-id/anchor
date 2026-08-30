import { type AnyType, formState } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import type { JSX } from 'solid-js';
import type { ZodObject, ZodRawShape } from 'zod';
import { FORM_OPTIONS, FORM_OPTIONS_KEYS, type FormDefaultOptions } from './config.js';

export interface FormProps
  extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>,
  Omit<FormDefaultOptions, 'class'> {
  value?: Record<string, AnyType>;
  schema: ZodObject<ZodRawShape>;
  onSubmit?: (
    data: Record<string, AnyType>,
    changes: Partial<Record<string, AnyType>>,
    e: SubmitEvent
  ) => Promise<void> | void;
}

export const Form = setup<FormProps>((props) => {
  FORM_OPTIONS_KEYS.forEach((key) => {
    if (key === 'class') return;
    if (!Object.hasOwn(props, key)) {
      (props as AnyType)[key] = (FORM_OPTIONS as AnyType)[key];
    }
  });

  const form = formState(props.schema as AnyType, props as AnyType);
  const rest = props.$omit(['schema', 'value', 'class', 'onSubmit', ...(FORM_OPTIONS_KEYS as never[])]);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.onSubmit) {
      form.submit((data, changes) => props.onSubmit!(data, changes, e as any));
    }
  };

  const className = derived(() => {
    if (form.error) {
      return [props.class ?? FORM_OPTIONS.class, props.errorClass ?? FORM_OPTIONS.errorClass].filter(Boolean).join(' ');
    }
    return props.class ?? FORM_OPTIONS.class;
  });

  return (
    <form {...rest} class={className.value} onSubmit={handleSubmit}>
      {props.children}
    </form>
  );
});
