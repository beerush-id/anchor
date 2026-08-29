import { type FormState, getForm } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';
import { RESET_OPTIONS } from './config.js';

export interface FormResetProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode | ((form?: FormState<ZodObject<ZodRawShape>>) => ReactNode);
  dirtyClass?: string;
  clear?: boolean;
}

export const FormReset = setup<FormResetProps>((props) => {
  const form = getForm();
  const rest = props.$omit([
    'disabled',
    'type',
    'children',
    'className',
    'onClick',
    'clear',
    ...(Object.keys(RESET_OPTIONS) as never[]),
  ]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (props.clear) {
      form?.clear();
    } else {
      form?.reset();
    }
    props.onClick?.(e);
  };

  const className = derived(() => {
    if (form?.changed) {
      return [props.className ?? RESET_OPTIONS.class, props.dirtyClass ?? RESET_OPTIONS.dirtyClass]
        .filter(Boolean)
        .join(' ');
    }
    return props.className ?? RESET_OPTIONS.class;
  });

  return render(
    () => (
      <button {...rest} type="button" disabled={!form?.changed} className={className.value} onClick={handleClick}>
        {typeof props.children === 'function' ? props.children(form) : props.children}
      </button>
    ),
    'FormResetView'
  );
}, 'FormReset');
