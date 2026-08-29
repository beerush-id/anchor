import { type FormState, getForm } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';
import { SUBMIT_OPTIONS } from './config.js';

export interface FormSubmitProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode | ((form?: FormState<ZodObject<ZodRawShape>>) => ReactNode);
  pendingClass?: string;
}

export const FormSubmit = setup<FormSubmitProps>((props) => {
  const form = getForm();
  const rest = props.$omit(['disabled', 'type', 'className', 'children', ...(Object.keys(SUBMIT_OPTIONS) as never[])]);

  const className = derived(() => {
    if (form?.pending) {
      return [props.className ?? SUBMIT_OPTIONS.class, props.pendingClass ?? SUBMIT_OPTIONS.pendingClass]
        .filter(Boolean)
        .join(' ');
    }
    return props.className ?? SUBMIT_OPTIONS.class;
  });

  return render(
    () => (
      <button {...rest} type="submit" className={className.value} disabled={!form?.canSubmit}>
        {typeof props.children === 'function' ? props.children(form) : props.children}
      </button>
    ),
    'FormSubmitView'
  );
}, 'FormSubmit');
