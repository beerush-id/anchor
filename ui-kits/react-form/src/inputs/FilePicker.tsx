import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, classx, derived, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: FilePickerProps;
  onFiles?: (files: FileList | null) => void;
  errorClass?: string;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<FileList | null>) => ReactNode);
}

export const FilePicker = setup<FilePickerProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
  const $restProps = $props.$omit([
    'for',
    'type',
    'name',
    'id',
    'disabled',
    'className',
    'children',
    'onChange',
    'onFiles',
    'ref',
    ...(FILE_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<FileList | null>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(FILE_OPTIONS);
    return classx(
      baseClass,
      $props.className,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    $props.onFiles?.(e.currentTarget.files);
    $props.onChange?.(e);
  };

  return () => {
    const inputProps = {
      ...$restProps,
      ref: $props.ref,
      id: attrs.fieldId,
      type: 'file',
      name: attrs.input.name,
      disabled: attrs.input.disabled,
      className: className.value,
      'aria-invalid': attrs.input.error ? (true as const) : undefined,
      'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(inputProps, attrs.input);
    }

    return <input {...inputProps} />;
  };
}, 'FilePicker');
