import { type FormState, getForm } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import type { JSX } from 'solid-js';
import type { ZodObject, ZodRawShape } from 'zod';
import { SUBMIT_OPTIONS } from './config.js';

export interface FormSubmitProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: JSX.Element | ((form?: FormState<ZodObject<ZodRawShape>>) => JSX.Element);
  pendingClass?: string;
}

export const FormSubmit = setup<FormSubmitProps>((props) => {
  const form = getForm();
  const rest = props.$omit(['disabled', 'type', 'class', 'children', ...(Object.keys(SUBMIT_OPTIONS) as never[])]);

  const className = derived(() => {
    if (form?.pending) {
      return [props.class ?? SUBMIT_OPTIONS.class, props.pendingClass ?? SUBMIT_OPTIONS.pendingClass]
        .filter(Boolean)
        .join(' ');
    }
    return props.class ?? SUBMIT_OPTIONS.class;
  });

  return (
    <button {...rest} type="submit" class={className.value} disabled={!form?.canSubmit}>
      {typeof props.children === 'function' ? props.children(form) : props.children}
    </button>
  );
});
