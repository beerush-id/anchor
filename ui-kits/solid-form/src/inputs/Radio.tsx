import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, isDynamic, type JSX, setup } from '@airlib/solid';
import { getInputClasses, INPUT_OPTIONS_KEYS, RADIO_OPTIONS, RADIO_OPTIONS_KEYS } from '../config.js';

export interface RadioProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'children'> {
  for?: RadioProps;
  errorClass?: string;
  checked?: Bindable<boolean>;
  children?:
    | JSX.Element
    | ((props: JSX.InputHTMLAttributes<HTMLInputElement>, input: FormInput<AnyType>) => JSX.Element);
}

export const Radio = setup<RadioProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);
  $props.type = 'radio';

  const rest = $props.$omit([
    'for',
    'value',
    'type',
    'name',
    'id',
    'checked',
    'disabled',
    'class',
    'children',
    'onChange',
    ...(RADIO_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const handleChange = (e: Event) => {
    attrs.input.checked = (e.currentTarget as HTMLInputElement).checked;
    $props.onChange?.(e as AnyType);
  };

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(RADIO_OPTIONS);
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
        type: attrs.input.type,
        name: attrs.input.name,
        value: attrs.input.value as AnyType,
        checked: attrs.input.checked,
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
        type={attrs.input.type}
        name={attrs.input.name}
        value={attrs.input.value as AnyType}
        checked={attrs.input.checked}
        disabled={attrs.input.disabled}
        class={className.value}
        aria-invalid={attrs.input.error ? (true as const) : undefined}
        aria-describedby={attrs.input.error ? attrs.errorId : undefined}
        onChange={handleChange}
      />
    );
  };
}, 'Radio');
