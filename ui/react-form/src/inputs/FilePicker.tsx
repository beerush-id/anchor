import { type AnyType, formInput } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  onFiles?: (files: FileList | null) => void;
  errorClass?: string;
}

export const FilePicker = setup<FilePickerProps>((props) => {
  const input = formInput(props as AnyType);
  const rest = props.$omit([
    'type',
    'name',
    'disabled',
    'className',
    'onChange',
    'onFiles',
    ...(FILE_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const { baseClass, errorClass } = getInputClasses(FILE_OPTIONS);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    props.onFiles?.(e.currentTarget.files);
    props.onChange?.(e);
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.className ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.className ?? baseClass;
  });

  return render(
    () => (
      <input
        {...rest}
        type="file"
        name={input.name}
        disabled={input.disabled}
        className={className.value}
        onChange={handleChange}
      />
    ),
    'FilePickerView'
  );
}, 'FilePicker');
