import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<ComponentProps<'input'>, 'value' | 'children'> {
  for?: FilePickerProps;
  onFiles?: (files: FileList | null) => void;
  errorClass?: string;
  children?: ReactNode | ((props: ComponentProps<'input'>, input: FormInput<FileList | null>) => ReactNode);
}

export const FilePicker = setup<FilePickerProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;

  const input = formInput<FileList | null>($props);
  const rest = $props.$omit([
    'for',
    'type',
    'name',
    'disabled',
    'className',
    'children',
    'onChange',
    'onFiles',
    ...(FILE_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(FILE_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    $props.onFiles?.(e.currentTarget.files);
    $props.onChange?.(e);
  };

  const className = derived(() =>
    classx(
      baseClass,
      $props.className,
      Boolean(input.touched && (input.error || !input.matched)) && ($props.errorClass ?? errorClass)
    )
  );

  return render(() => {
    const inputProps = {
      ...rest,
      type: 'file',
      name: input.name,
      disabled: input.disabled,
      className: className.value,
      onChange: handleChange,
    };

    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      return children(inputProps, input);
    }

    return <input {...inputProps} />;
  }, 'FilePickerView');
}, 'FilePicker');
