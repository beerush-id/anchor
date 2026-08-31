import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, classx, derived, isDynamic, type JSX, setup } from '@airlib/solid';
import { FILE_OPTIONS, FILE_OPTIONS_KEYS, getInputClasses, INPUT_OPTIONS_KEYS } from '../config.js';

export interface FilePickerProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'children'> {
  for?: FilePickerProps;
  onFiles?: (files: FileList | null) => void;
  errorClass?: string;
  children?:
    | JSX.Element
    | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<FileList | null>) => JSX.Element);
}

export const FilePicker = setup<FilePickerProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);

  const rest = $props.$omit([
    'for',
    'type',
    'name',
    'id',
    'disabled',
    'class',
    'children',
    'onChange',
    'onFiles',
    ...(FILE_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<FileList | null>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const handleChange = (e: Event) => {
    $props.onFiles?.((e.currentTarget as HTMLInputElement).files);
    $props.onChange?.(e as AnyType);
  };

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(FILE_OPTIONS);
    return classx(
      baseClass,
      $props.class,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  return () => {
    const children = $props.children;
    if (isDynamic(children)) {
      const inputProps = {
        ...rest,
        id: attrs.fieldId,
        type: 'file',
        name: attrs.input.name,
        disabled: attrs.input.disabled,
        class: className.value,
        'aria-invalid': attrs.input.error ? (true as const) : undefined,
        'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
        onChange: handleChange,
      };
      return children(inputProps as AnyType, attrs.input);
    }

    return (
      <input
        {...rest}
        id={attrs.fieldId}
        type="file"
        name={attrs.input.name}
        disabled={attrs.input.disabled}
        class={className.value}
        aria-invalid={attrs.input.error ? (true as const) : undefined}
        aria-describedby={attrs.input.error ? attrs.errorId : undefined}
        onChange={handleChange}
      />
    );
  };
}, 'FilePicker');
