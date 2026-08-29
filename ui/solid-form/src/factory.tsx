import type { AnyType, DeepPaths, FormField, FormState, PathValue } from '@airlib/form';
import { formField, formState, getForm } from '@airlib/form';
import { derived, setup } from '@airlib/solid';
import { createMemo, For, type JSX } from 'solid-js';
import type { input, ZodObject, ZodRawShape } from 'zod';
import type { FieldDefaultOptions, FormDefaultOptions, FormGeneralOptions } from './config.js';
import { FIELD_OPTIONS, FIELD_OPTIONS_KEYS, FORM_OPTIONS, FORM_OPTIONS_KEYS } from './config.js';

interface TypedFormProps<T>
  extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>,
  Omit<FormDefaultOptions, 'class'> {
  value?: T;
  onSubmit?: (data: T, changes: Partial<T>, e: Event) => Promise<void> | void;
}

interface TypedFieldProps<T, S extends ZodObject<ZodRawShape>>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'>,
  Omit<FieldDefaultOptions, 'class'> {
  name: DeepPaths<T>;
  match?: DeepPaths<T> | ((form: FormState<S>) => boolean);
  label?: string;
  children?: JSX.Element | ((field: FormField<unknown>) => JSX.Element);
}

type TypedForm<T extends ZodObject<ZodRawShape>> = ReturnType<typeof setup<TypedFormProps<input<T>>>> & {
  Field: ReturnType<typeof setup<TypedFieldProps<input<T>, T>>>;
  FieldList: <K extends DeepPaths<input<T>>>(props: {
    name: K;
    children: (items: NonNullable<PathValue<input<T>, K>> extends (infer U)[] ? U[] : never) => JSX.Element;
    errorClass?: string;
  }) => JSX.Element;
  get(): FormState<T> | undefined;
  field<K extends DeepPaths<input<T>>>(path: K | (() => K)): FormField<PathValue<input<T>, K>>;
};

export function createForm<T extends ZodObject<ZodRawShape>>(
  schema: T,
  options: FormGeneralOptions = { field: FIELD_OPTIONS }
): TypedForm<T> {
  const { form: formOptions, field: fieldOptions } = options;
  const Form = setup<TypedFormProps<input<T>>>((props) => {
    const $props = props as AnyType;

    FORM_OPTIONS_KEYS.forEach((key) => {
      if (key === 'class') return;
      if (!Object.hasOwn($props, key)) {
        $props[key] = formOptions?.[key as never] ?? FORM_OPTIONS[key as never];
      }
    });

    const form = formState(schema as AnyType, $props);
    const rest = props.$omit(['value', 'class', 'onSubmit', ...(FORM_OPTIONS_KEYS as never[])]);

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if ($props.onSubmit) {
        form.submit((data: AnyType, changes: AnyType) => $props.onSubmit(data, changes, e as any));
      }
    };

    const className = derived(() => {
      if (form.error) {
        return [$props.class ?? formOptions?.class ?? FORM_OPTIONS.class, $props.errorClass ?? formOptions?.errorClass]
          .filter(Boolean)
          .join(' ');
      }
      if (form.pending) {
        return [
          $props.class ?? formOptions?.class ?? FORM_OPTIONS.class,
          $props.pendingClass ?? formOptions?.pendingClass,
        ]
          .filter(Boolean)
          .join(' ');
      }
      return $props.class ?? formOptions?.class ?? FORM_OPTIONS.class;
    });

    return (
      <form {...rest} class={className.value} onSubmit={handleSubmit}>
        {$props.children}
      </form>
    );
  });

  const Field = setup<TypedFieldProps<input<T>, T>>((props) => {
    const $props = props as AnyType;
    const field = formField(() => $props.name, $props.match);
    const rest = props.$omit(['name', 'match', 'label', 'children', ...(FIELD_OPTIONS_KEYS as never[])]);
    const fieldId = () => $props.name.replace(/\./g, '-');
    const errorId = () => `${fieldId()}-error`;

    return createMemo(() => {
      if (!field.name) {
        return (
          <span class={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
            [FieldError]: Name property is required!
          </span>
        ) as AnyType;
      }

      if (typeof $props.children === 'function') {
        return $props.children(field);
      }

      return (
        <div {...rest} class={$props.class ?? fieldOptions?.class ?? FIELD_OPTIONS.class}>
          {$props.label && (
            /* v8 ignore next */
            <label for={fieldId()} class={$props.labelClass ?? fieldOptions?.labelClass ?? FIELD_OPTIONS.labelClass}>
              {$props.label}
              {field.required && (
                <span class={$props.requiredClass ?? fieldOptions?.requiredClass ?? FIELD_OPTIONS.requiredClass}>
                  {$props.requiredLabel ?? fieldOptions?.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
                </span>
              )}
            </label>
          )}
          {$props.children}
          {field.touched && field.error && (
            <For each={field.error}>
              {(error) => (
                <span
                  id={errorId()}
                  class={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}
                  role="alert"
                >
                  {error}
                </span>
              )}
            </For>
          )}
          {field.valid && !field.matched && $props.mismatchLabel && (
            <span
              id={errorId()}
              class={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}
              role="alert"
            >
              {$props.mismatchLabel}
            </span>
          )}
        </div>
      );
    }) as AnyType;
  });

  const FieldList = setup<{ name: string; children: (items: AnyType[]) => JSX.Element; errorClass?: string }>(
    (props) => {
      const $props = props as AnyType;
      const field = formField<AnyType[]>(() => $props.name);
      if (field.name && !Array.isArray(field.value)) field.value = [];

      return createMemo(() => {
        if (!field.name) {
          return (
            <span class={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
              [FieldListError]: Name property is required!
            </span>
          );
        }
        return $props.children(field.value);
      }) as AnyType;
    }
  );

  return Object.assign(Form, {
    Field,
    FieldList,
    get: () => getForm(),
    field: (path: string | (() => string)) => formField(path),
  }) as TypedForm<T>;
}
