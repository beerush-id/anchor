import { type AnyType, formField } from '@airlib/form';
import { render, setup } from '@airlib/react';
import type { ReactNode } from 'react';
import { FIELD_OPTIONS } from './config.js';

export interface FieldListProps<T = AnyType> {
  name: string;
  children: (items: T[]) => ReactNode;
  errorClass?: string;
}

export const FieldList = setup<FieldListProps>((props) => {
  const field = formField<AnyType[]>(props.name);
  if (field.name && !Array.isArray(field.value)) field.value = [];

  return render(() => {
    if (!field.name) {
      return (
        <span className={props.errorClass ?? FIELD_OPTIONS.errorClass}>
          [FieldListError]: Name property is required!
        </span>
      );
    }

    return props.children(field.value);
  }, 'FieldListView');
}, 'FieldList');
