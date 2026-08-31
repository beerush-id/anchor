import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { type Bindable, classx, derived, type JSX, setup } from '@airlib/solid';
import { getInputClasses, INPUT_OPTIONS_KEYS, SELECT_OPTIONS, SELECT_OPTIONS_KEYS } from '../config.js';

export interface SelectProps extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'children'> {
  for?: SelectProps;
  errorClass?: string;
  value?: Bindable<string | number>;
  children?:
    | JSX.Element
    | ((props: JSX.SelectHTMLAttributes<HTMLSelectElement>, input: FormInput<string | number>) => JSX.Element);
}

export const Select = setup<SelectProps>((props) => {
  const $props = ((props as AnyType).for ?? props) as AnyType;

  const rest = $props.$omit([
    'for',
    'value',
    'name',
    'id',
    'disabled',
    'class',
    'children',
    'onChange',
    ...(SELECT_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<string | number>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const handleChange = (e: Event) => {
    attrs.input.value = (e.currentTarget as HTMLSelectElement).value;
    $props.onChange?.(e as AnyType);
  };

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(SELECT_OPTIONS);
    return classx(
      baseClass,
      $props.class,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  return () => {
    const children = (props as AnyType).children ?? $props.children;
    if (typeof children === 'function') {
      const selectProps = {
        ...rest,
        id: attrs.fieldId,
        name: attrs.input.name,
        disabled: attrs.input.disabled,
        class: className.value,
        value: attrs.input.value as AnyType,
        'aria-invalid': attrs.input.error ? (true as const) : undefined,
        'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
        onChange: handleChange,
      };
      return children(selectProps as AnyType, attrs.input);
    }

    return (
      <select
        {...rest}
        id={attrs.fieldId}
        name={attrs.input.name}
        disabled={attrs.input.disabled}
        class={className.value}
        value={attrs.input.value as AnyType}
        aria-invalid={attrs.input.error ? (true as const) : undefined}
        aria-describedby={attrs.input.error ? attrs.errorId : undefined}
        onChange={handleChange}
      >
        {children}
      </select>
    );
  };
}, 'Select');
