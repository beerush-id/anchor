import type { AnyType, FormState } from '@airlib/form';
import { getForm } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import type { JSX } from 'solid-js';
import type { ZodObject, ZodRawShape } from 'zod';
import { RESET_OPTIONS } from './config.js';

export interface FormResetProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: JSX.Element | ((form?: FormState<ZodObject<ZodRawShape>>) => JSX.Element);
  dirtyClass?: string;
  clear?: boolean;
}

export const FormReset = setup<FormResetProps>((props) => {
  const form = getForm();
  const rest = props.$omit([
    'disabled',
    'type',
    'children',
    'class',
    'onClick',
    'clear',
    ...(Object.keys(RESET_OPTIONS) as never[]),
  ]);

  const handleClick = (e: MouseEvent) => {
    if (props.clear) {
      form?.clear();
    } else {
      form?.reset();
    }
    if (typeof props.onClick === 'function') {
      props.onClick(e as AnyType);
    }
  };

  const className = derived(() => {
    if (form?.changed) {
      return [props.class ?? RESET_OPTIONS.class, props.dirtyClass ?? RESET_OPTIONS.dirtyClass]
        .filter(Boolean)
        .join(' ');
    }
    return props.class ?? RESET_OPTIONS.class;
  });

  return (
    <button {...rest} type="button" disabled={!form?.changed} class={className.value} onClick={handleClick}>
      {typeof props.children === 'function' ? props.children(form) : props.children}
    </button>
  );
});
