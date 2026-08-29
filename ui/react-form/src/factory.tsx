import type { AnyType, DeepPaths, FormField, FormState, PathValue } from '@airlib/form';
import { formField, formState, getForm } from '@airlib/form';
import { classx, derived, render, setup, Slot } from '@airlib/react';
import type { ComponentProps, MouseEvent, ReactNode, SubmitEvent } from 'react';
import type { input, ZodObject, ZodRawShape } from 'zod';
import type {
  FieldDefaultOptions,
  FormDefaultOptions,
  FormGeneralOptions,
  ResetDefaultOptions,
  SubmitDefaultOptions,
} from './config.js';
import {
  FIELD_OPTIONS,
  FIELD_OPTIONS_KEYS,
  FORM_OPTIONS,
  FORM_OPTIONS_KEYS,
  RESET_OPTIONS,
  RESET_OPTIONS_KEYS,
  SUBMIT_OPTIONS,
  SUBMIT_OPTIONS_KEYS,
} from './config.js';

export type FormSlots<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>> = {
  header?: (form: FormState<T>) => ReactNode;
  footer?: (form: FormState<T>) => ReactNode;
  actions?: (form: FormState<T>) => ReactNode;
  error?: (form: FormState<T>) => ReactNode;
};

export type FieldSlots<T = Record<string, AnyType>> = {
  label?: (field: FormField<unknown>) => ReactNode;
  prefix?: (field: FormField<unknown>) => ReactNode;
  suffix?: (field: FormField<unknown>) => ReactNode;
  error?: (field: FormField<unknown>) => ReactNode;
  support?: (field: FormField<unknown>) => ReactNode;
};

export interface FormProps<T = Record<string, AnyType>>
  extends Omit<ComponentProps<'form'>, 'onSubmit' | 'children'>,
    Omit<FormDefaultOptions, 'class'> {
  schema?: ZodObject<ZodRawShape>;
  value?: T;
  children?: ReactNode | ((form: FormState<ZodObject<ZodRawShape>>) => ReactNode);
  onSubmit?: (data: T, changes: Partial<T>, e: SubmitEvent<HTMLFormElement>) => Promise<void> | void;
}

export interface FieldProps<T = Record<string, AnyType>, S extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'div'>, 'children'>,
    Omit<FieldDefaultOptions, 'class'> {
  name: DeepPaths<T>;
  match?: DeepPaths<T> | ((form: FormState<S>) => boolean);
  label?: string;
  children?: ReactNode | ((field: FormField<unknown>) => ReactNode);
}

export interface FieldListProps<T = Record<string, AnyType>> {
  name: DeepPaths<T>;
  children: (items: AnyType[]) => ReactNode;
  errorClass?: string;
}

export interface FormSubmitProps<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'button'>, 'children'>,
    Omit<SubmitDefaultOptions, 'class'> {
  children?: ReactNode | ((form?: FormState<T>) => ReactNode);
}

export interface FormResetProps<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'button'>, 'children'>,
    Omit<ResetDefaultOptions, 'class'> {
  children?: ReactNode | ((form?: FormState<T>) => ReactNode);
  clear?: boolean;
}

export type TypedForm<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>> = ReturnType<
  typeof setup<FormProps<input<T>>, FormSlots<T>>
> & {
  Field: ReturnType<typeof setup<FieldProps<input<T>, T>, FieldSlots<input<T>>>>;
  FieldList: <K extends DeepPaths<input<T>>>(props: {
    name: K;
    children: (items: NonNullable<PathValue<input<T>, K>> extends (infer U)[] ? U[] : never) => ReactNode;
    errorClass?: string;
  }) => ReactNode;
  Submit: ReturnType<typeof setup<FormSubmitProps<T>>>;
  Reset: ReturnType<typeof setup<FormResetProps<T>>>;
  get(): FormState<T> | undefined;
  field<K extends DeepPaths<input<T>>>(path: K | (() => K)): FormField<PathValue<input<T>, K>>;
};

/**
 * Creates a schema-driven reactive form component tree.
 *
 * Derives runtime validation, change tracking, and lifecycle states from a Zod schema,
 * returning a colocated component set (`Form`, `Form.Field`, `Form.FieldList`, `Form.Submit`, `Form.Reset`).
 *
 * @template T - The Zod object schema defining the form structure.
 * @param {T} [schema] - Optional schema to bind statically. If omitted, schema can be passed dynamically via `props.schema`.
 * @param {FormGeneralOptions} [options] - General layout, styling, and behavior options for form elements.
 * @returns {TypedForm<T>} The typed form component with attached field, submit, reset, and state accessor subcomponents.
 */
export function createForm<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>(
  schema?: T,
  options: FormGeneralOptions = { field: FIELD_OPTIONS, submit: SUBMIT_OPTIONS, reset: RESET_OPTIONS }
): TypedForm<T> {
  const { form: formOptions, field: fieldOptions, submit: submitOptions, reset: resetOptions } = options;

  const Form = setup<FormProps<input<T>>, FormSlots<T>>((props, snippets) => {
    const $props = props as AnyType;

    FORM_OPTIONS_KEYS.forEach((key) => {
      if (key === 'class') return;
      if (!Object.hasOwn($props, key)) {
        $props[key] = formOptions?.[key as never] ?? FORM_OPTIONS[key as never];
      }
    });

    const rest = $props.$omit(['schema', 'value', 'className', 'onSubmit', ...FORM_OPTIONS_KEYS]);
    const form = formState((schema ?? $props.schema) as AnyType, $props);

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if ($props.onSubmit) {
        form.submit((data: AnyType, changes: AnyType) => $props.onSubmit(data, changes, e));
      }
    };

    const className = derived(() =>
      classx(
        formOptions?.class ?? FORM_OPTIONS.class,
        $props.className,
        Boolean(form.error) && ($props.errorClass ?? formOptions?.errorClass ?? FORM_OPTIONS.errorClass),
        Boolean(form.pending) && ($props.pendingClass ?? formOptions?.pendingClass ?? FORM_OPTIONS.pendingClass)
      )
    );

    return render(
      () => (
        <form {...rest} className={className.value} onSubmit={handleSubmit}>
          <Slot for={() => snippets.header?.(form)} />
          <Slot for={() => snippets.error?.(form)}>
            {form.error && (
              <span
                className={classx(formOptions?.errorClass ?? FORM_OPTIONS.errorClass, $props.errorClass)}
                role="alert"
              >
                {form.error.message}
              </span>
            )}
          </Slot>
          {typeof $props.children === 'function' ? $props.children(form) : $props.children}
          <Slot for={() => snippets.actions?.(form)} />
          <Slot for={() => snippets.footer?.(form)} />
        </form>
      ),
      'FormView'
    );
  }, 'Form');

  const Field = setup<FieldProps<input<T>, T>, FieldSlots<input<T>>>((props, snippets) => {
    const $props = props as AnyType;
    const rest = $props.$omit(['name', 'match', 'label', 'children', ...FIELD_OPTIONS_KEYS]);
    const field = formField(() => $props.name, $props.match);
    const fieldId = $props.name.replace(/\./g, '-');
    const errorId = `${fieldId}-error`;

    const className = derived(() =>
      classx(
        fieldOptions?.class ?? FIELD_OPTIONS.class,
        $props.className,
        Boolean(field.touched && field.error) &&
          ($props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass)
      )
    );

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
          <Slot for={() => snippets.label?.(field)}>
            {$props.label && (
              <label
                htmlFor={fieldId}
                className={classx(fieldOptions?.labelClass ?? FIELD_OPTIONS.labelClass, $props.labelClass)}
              >
                {$props.label}
                {field.required && (
                  <span
                    className={classx(
                      fieldOptions?.requiredClass ?? FIELD_OPTIONS.requiredClass,
                      $props.requiredClass
                    )}
                  >
                    {$props.requiredLabel ?? fieldOptions?.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
                  </span>
                )}
              </label>
            )}
          </Slot>
          <Slot for={() => snippets.prefix?.(field)} />
          {$props.children}
          <Slot for={() => snippets.suffix?.(field)} />
          <Slot for={() => snippets.error?.(field)}>
            {field.touched &&
              field.error?.map((error, i) => (
                <span
                  key={i}
                  id={errorId}
                  className={classx(fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass, $props.supportClass)}
                  role="alert"
                >
                  {error}
                </span>
              ))}
            {field.valid && !field.matched && $props.mismatchLabel && (
              <span
                id={errorId}
                className={classx(fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass, $props.supportClass)}
                role="alert"
              >
                {$props.mismatchLabel}
              </span>
            )}
          </Slot>
          <Slot for={() => snippets.support?.(field)} />
        </div>
      );
    }, 'FieldView');
  }, 'Field');

  const FieldList = setup<FieldListProps<input<T>>>((props) => {
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

  const Submit = setup<FormSubmitProps<T>>((props) => {
    const $props = props as AnyType;
    const form = getForm<T>();
    const rest = $props.$omit(['disabled', 'type', 'className', 'children', ...SUBMIT_OPTIONS_KEYS]);

    const className = derived(() =>
      classx(
        submitOptions?.class ?? SUBMIT_OPTIONS.class,
        $props.className,
        Boolean(form?.pending) && ($props.pendingClass ?? submitOptions?.pendingClass ?? SUBMIT_OPTIONS.pendingClass)
      )
    );

    return render(
      () => (
        <button {...rest} type="submit" className={className.value} disabled={!form?.canSubmit}>
          {typeof $props.children === 'function' ? $props.children(form) : $props.children}
        </button>
      ),
      'FormSubmitView'
    );
  }, 'FormSubmit');

  const Reset = setup<FormResetProps<T>>((props) => {
    const $props = props as AnyType;
    const form = getForm<T>();
    const rest = $props.$omit([
      'disabled',
      'type',
      'children',
      'className',
      'onClick',
      'clear',
      ...RESET_OPTIONS_KEYS,
    ]);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if ($props.clear) {
        form?.clear();
      } else {
        form?.reset();
      }
      $props.onClick?.(e);
    };

    const className = derived(() =>
      classx(
        resetOptions?.class ?? RESET_OPTIONS.class,
        $props.className,
        Boolean(form?.changed) && ($props.dirtyClass ?? resetOptions?.dirtyClass ?? RESET_OPTIONS.dirtyClass)
      )
    );

    return render(
      () => (
        <button {...rest} type="button" disabled={!form?.changed} className={className.value} onClick={handleClick}>
          {typeof $props.children === 'function' ? $props.children(form) : $props.children}
        </button>
      ),
      'FormResetView'
    );
  }, 'FormReset');

  return Object.assign(Form, {
    Field,
    FieldList,
    Submit,
    Reset,
    get: () => getForm<T>(),
    field: (path: string) => formField(path),
  }) as TypedForm<T>;
}

export const Form = createForm();
export const Field = Form.Field;
export const FieldList = Form.FieldList;
export const FormSubmit = Form.Submit;
export const FormReset = Form.Reset;
