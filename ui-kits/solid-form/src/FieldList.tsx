import { type AnyType, formField } from '@airlib/form';
import { setup } from '@airlib/solid';
import { createMemo, type JSX } from 'solid-js';
import { FIELD_OPTIONS } from './config.js';

export interface FieldListProps<T = AnyType> {
  name: string;
  children: (items: T[]) => JSX.Element;
  errorClass?: string;
}

export const FieldList = setup<FieldListProps>((props) => {
  const field = formField<AnyType[]>(() => props.name);
  if (field.name && !Array.isArray(field.value)) field.value = [];

  return createMemo(() => {
    if (!field.name) {
      return (
        <span class={props.errorClass ?? FIELD_OPTIONS.errorClass}>[FieldListError]: Name property is required!</span>
      ) as unknown as JSX.Element;
    }
    return props.children(field.value);
  }) as unknown as JSX.Element;
});
