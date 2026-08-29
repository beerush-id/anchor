import type { AnyType, DeepPaths, FormField, FormState, PathValue } from '@airlib/form';
import { formField, formState, getForm } from '@airlib/form';
import { derived, render, setup } from '@airlib/react';
import type { FormHTMLAttributes, HTMLAttributes, ReactNode, SubmitEvent } from 'react';
import type { input, ZodObject, ZodRawShape } from 'zod';
import type { FieldDefaultOptions, FormDefaultOptions, FormGeneralOptions } from './config.js';
import { FIELD_OPTIONS, FIELD_OPTIONS_KEYS, FORM_OPTIONS, FORM_OPTIONS_KEYS } from './config.js';

interface TypedFormProps<T>
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>,
    Omit<FormDefaultOptions, 'class'> {
  value?: T;
  onSubmit?: (data: T, changes: Partial<T>, e: SubmitEvent<HTMLFormElement>) => Promise<void> | void;
}

interface TypedFieldProps<T, S extends ZodObject<ZodRawShape>>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    Omit<FieldDefaultOptions, 'class'> {
  name: DeepPaths<T>;
  match?: DeepPaths<T> | ((form: FormState<S>) => boolean);
  label?: string;
  children?: ReactNode | ((field: FormField<unknown>) => ReactNode);
}

type TypedForm<T extends ZodObject<ZodRawShape>> = ReturnType<typeof setup<TypedFormProps<input<T>>>> & {
  Field: ReturnType<typeof setup<TypedFieldProps<input<T>, T>>>;
  FieldList: <K extends DeepPaths<input<T>>>(props: {
    name: K;
    children: (items: NonNullable<PathValue<input<T>, K>> extends (infer U)[] ? U[] : never) => ReactNode;
    errorClass?: string;
  }) => ReactNode;
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

    const rest = $props.$omit(['value', 'className', 'onSubmit', ...FORM_OPTIONS_KEYS]);
    const form = formState(schema as AnyType, $props);

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if ($props.onSubmit) {
        form.submit((data: AnyType, changes: AnyType) => $props.onSubmit(data, changes, e));
      }
    };

    const className = derived(() => {
      if (form.error) {
        return [
          $props.className ?? formOptions?.class ?? FORM_OPTIONS.class,
          $props.errorClass ?? formOptions?.errorClass,
        ]
          .filter(Boolean)
          .join(' ');
      }
      if (form.pending) {
        return [
          $props.className ?? formOptions?.class ?? FORM_OPTIONS.class,
          $props.pendingClass ?? formOptions?.pendingClass,
        ]
          .filter(Boolean)
          .join(' ');
      }
      return $props.className ?? formOptions?.class ?? FORM_OPTIONS.class;
    });

    return render(
      () => (
        <form {...rest} className={className.value} onSubmit={handleSubmit}>
          {$props.children}
        </form>
      ),
      'FormView'
    );
  }, 'Form');

  const Field = setup<TypedFieldProps<input<T>, T>>((props) => {
    const $props = props as AnyType;
    const rest = $props.$omit(['name', 'match', 'label', 'children', ...FIELD_OPTIONS_KEYS]);
    const field = formField(() => $props.name, $props.match);
    const fieldId = $props.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    const className = derived(() => {
      if (field.touched && field.error) {
        return [
          $props.className ?? fieldOptions?.class ?? FIELD_OPTIONS.class,
          $props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass,
        ]
          .filter(Boolean)
          .join(' ');
      }
      return $props.className ?? fieldOptions?.class ?? FIELD_OPTIONS.class;
    });

    return render(() => {
      if (!field.name) {
        return (
          <span className={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
            [FieldError]: Name property is required!
          </span>
        );
      }
      if (typeof $props.children === 'function') {
        return $props.children(field);
      }

      return (
        <div {...rest} className={className.value}>
          {$props.label && (
            <label
              htmlFor={fieldId}
              className={$props.labelClass ?? fieldOptions?.labelClass ?? FIELD_OPTIONS.labelClass}
            >
              {$props.label}
              {field.required && (
                <span className={$props.requiredClass ?? fieldOptions?.requiredClass ?? FIELD_OPTIONS.requiredClass}>
                  {$props.requiredLabel ?? fieldOptions?.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
                </span>
              )}
            </label>
          )}
          {$props.children}
          {field.touched &&
            field.error?.map((error, i) => (
              <span
                key={i}
                id={errorId}
                className={$props.supportClass ?? fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass}
                role="alert"
              >
                {error}
              </span>
            ))}
          {field.valid && !field.matched && $props.mismatchLabel && (
            <span
              id={errorId}
              className={$props.supportClass ?? fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass}
              role="alert"
            >
              {$props.mismatchLabel}
            </span>
          )}
        </div>
      );
    }, 'FieldView');
  }, 'Field');

  const FieldList = setup<{ name: string; children: (items: AnyType[]) => ReactNode }>((props) => {
    const $props = props as AnyType;
    const field = formField<AnyType[]>(() => $props.name);
    if (field.name && !Array.isArray(field.value)) field.value = [];

    return render(() => {
      if (!field.name) {
        return (
          <span className={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
            [FieldListError]: Name property is required!
          </span>
        );
      }

      return $props.children(field.value);
    }, 'FieldListView');
  }, 'FieldList');

  return Object.assign(Form, {
    Field,
    FieldList,
    get: () => getForm(),
    field: (path: string) => formField(path),
  }) as TypedForm<T>;
}
