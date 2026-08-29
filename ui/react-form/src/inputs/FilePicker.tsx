import { type AnyType, formInput } from '@airlib/form';
import { classx, derived, render, setup } from '@airlib/react';
import type { ChangeEvent, ComponentProps } from 'react';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<ComponentProps<'input'>, 'value'> {
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

  const className = derived(() =>
    classx(
      baseClass,
      props.className,
      Boolean(input.touched && (input.error || !input.matched)) && (props.errorClass ?? errorClass)
    )
  );

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
