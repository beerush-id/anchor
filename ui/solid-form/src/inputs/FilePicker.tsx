import { type AnyType, formInput } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import type { JSX } from 'solid-js';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  onFiles?: (files: FileList | null) => void;
  errorClass?: string;
}

export const FilePicker = setup<FilePickerProps>((props) => {
  (props as AnyType).type = 'file';
  const restProps = props.$omit([
    'type',
    'name',
    'disabled',
    'class',
    'onChange',
    'onFiles',
    ...(FILE_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);
  const input = formInput(props as AnyType);

  const { baseClass, errorClass } = getInputClasses(FILE_OPTIONS);

  const handleChange = (e: Event) => {
    const files = (e.currentTarget as HTMLInputElement).files;
    if (typeof props.onFiles === 'function') {
      props.onFiles(files);
    }
    if (typeof props.onChange === 'function') {
      props.onChange(e as AnyType);
    }
  };

  const className = derived(() => {
    if (input.touched && (input.error || !input.matched)) {
      return [props.class ?? baseClass, props.errorClass ?? errorClass].filter(Boolean).join(' ');
    }
    return props.class ?? baseClass;
  });

  return (
    <input
      {...restProps}
      type="file"
      name={input.name}
      disabled={input.disabled}
      class={className.value}
      onChange={handleChange}
    />
  );
});
