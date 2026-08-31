import { type AnyType, type FormInput, formInput } from '@airlib/form';
import { $static, type Bindable, classx, derived, isDynamic, type JSX, setup } from '@airlib/solid';
import { getInputClasses, INPUT_OPTIONS_KEYS, TEXTAREA_OPTIONS, TEXTAREA_OPTIONS_KEYS } from '../config.js';

export interface TextareaProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'children'> {
  for?: TextareaProps;
  errorClass?: string;
  value?: Bindable<string>;
  children?:
    | JSX.Element
    | ((props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, input: FormInput<string>) => JSX.Element);
}

export const Textarea = setup<TextareaProps>((props) => {
  const $props = $static(() => ((props as AnyType).for ?? props) as AnyType);

  const rest = $props.$omit([
    'for',
    'value',
    'name',
    'id',
    'disabled',
    'class',
    'children',
    'onInput',
    'onBlur',
    ...(TEXTAREA_OPTIONS_KEYS as never[]),
    ...(INPUT_OPTIONS_KEYS as never[]),
  ]);

  const attrs = derived.as(() => {
    const input = formInput<string>($props);
    const fieldId = $props.id || input.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    return { input, fieldId, errorId };
  });

  const handleInput = (e: InputEvent) => {
    attrs.input.value = (e.currentTarget as HTMLTextAreaElement).value;
    $props.onInput?.(e as AnyType);
  };

  const handleBlur = (e: FocusEvent) => {
    attrs.input.settled();
    $props.onBlur?.(e as AnyType);
  };

  const className = derived(() => {
    const { baseClass, errorClass } = getInputClasses(TEXTAREA_OPTIONS);
    return classx(
      baseClass,
      $props.class,
      Boolean(attrs.input.touched && (attrs.input.error || !attrs.input.matched)) && ($props.errorClass ?? errorClass)
    );
  });

  return () => {
    const children = $props.children;
    if (isDynamic(children)) {
      const textareaProps = {
        ...rest,
        id: attrs.fieldId,
        name: attrs.input.name,
        disabled: attrs.input.disabled,
        class: className.value,
        value: attrs.input.value,
        'aria-invalid': attrs.input.error ? (true as const) : undefined,
        'aria-describedby': attrs.input.error ? attrs.errorId : undefined,
        onInput: handleInput,
        onBlur: handleBlur,
      };
      return children(textareaProps as AnyType, attrs.input);
    }

    return (
      <textarea
        {...rest}
        id={attrs.fieldId}
        name={attrs.input.name}
        disabled={attrs.input.disabled}
        class={className.value}
        value={attrs.input.value}
        aria-invalid={attrs.input.error ? (true as const) : undefined}
        aria-describedby={attrs.input.error ? attrs.errorId : undefined}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    );
  };
}, 'Textarea');
