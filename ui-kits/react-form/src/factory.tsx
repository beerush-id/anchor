import type { AnyType, DeepPaths, FormField, FormState, PathValue } from '@airlib/form';
import { formField, formState, getForm } from '@airlib/form';
import { classx, derived, For, renderDynamic, setup, Show, Slot, untrack } from '@airlib/react';
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

/**
 * Named slot renderers available on the `<Form>` component.
 *
 * Provides declarative customization hooks for layout boundaries and lifecycle indicators.
 *
 * @template T - The schema type defining the form data structure.
 */
export type FormSlots<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>> = {
  /** Renders content at the top of the form, before children and errors. */
  header?: (form: FormState<T>) => ReactNode;
  /** Renders content at the bottom of the form, after children and actions. */
  footer?: (form: FormState<T>) => ReactNode;
  /** Renders action buttons below the children. */
  actions?: (form: FormState<T>) => ReactNode;
  /** Customizes or replaces the top-level form error banner. */
  error?: (form: FormState<T>) => ReactNode;
};

/**
 * Named slot renderers available on the `<Field>` component.
 *
 * Enables fine-grained UI customization of labels, input adornments, error alerts, and helper text.
 *
 * @template T - The form value record type.
 */
export type FieldSlots<T = Record<string, AnyType>> = {
  /** Customizes or replaces the field label element. */
  label?: (field: FormField<T>) => ReactNode;
  /** Injects leading content or icons directly before the input control. */
  prefix?: (field: FormField<T>) => ReactNode;
  /** Injects trailing content or icons directly after the input control. */
  suffix?: (field: FormField<T>) => ReactNode;
  /** Customizes or replaces the supportive guidance text or validation errors below the field control. */
  support?: (field: FormField<T>) => ReactNode;
};

/**
 * Configuration and HTML attributes accepted by the `<Form>` component.
 *
 * @template T - The data object shape managed by the form.
 */
export interface FormProps<T = Record<string, AnyType>>
  extends Omit<ComponentProps<'form'>, 'onSubmit' | 'children'>,
    Omit<FormDefaultOptions, 'class'> {
  /** Optional runtime Zod schema for dynamic or untyped forms. */
  schema?: ZodObject<ZodRawShape>;
  /** Initial or bindable form value object. */
  value?: T;
  /** Child elements or scoped render function receiving the active `FormState`. */
  children?: ReactNode | ((form: FormState<ZodObject<ZodRawShape>>) => ReactNode);
  /** Callback fired when the form passes validation and is submitted. */
  onSubmit?: (data: T, changes: Partial<T>, e: SubmitEvent<HTMLFormElement>) => Promise<void> | void;
}

/**
 * Configuration and HTML attributes accepted by the `<Field>` component.
 *
 * @template T - The form value record type.
 * @template S - The Zod schema type for the owning form.
 */
export interface FieldProps<T = Record<string, AnyType>, S extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'div'>, 'children'>,
    Omit<FieldDefaultOptions, 'class'> {
  /** Dot-notated path locating the field within the schema. */
  name: DeepPaths<T>;
  /** Field path or predicate function for cross-field match validation. */
  match?: DeepPaths<T> | ((form: FormState<S>) => boolean);
  /** Visible label text associated with the input control. */
  label?: string;
  /** Children controls or headless render function receiving the `FormField` instance. */
  children?: ReactNode | ((field: FormField<unknown>) => ReactNode);
}

/**
 * Props accepted by the `<FieldList>` component for dynamic reactive arrays.
 *
 * @template T - The form value record type.
 */
export interface FieldListProps<T = Record<string, AnyType>> {
  /** Dot-notated path locating the array field within the schema. */
  name: DeepPaths<T>;
  /** Render callback receiving the mutable array items. */
  children: (items: AnyType[]) => ReactNode;
  /** CSS class applied to the list error container when invalid. */
  errorClass?: string;
}

/**
 * Configuration and HTML button attributes accepted by `<FormSubmit>`.
 *
 * @template T - The Zod schema type for the owning form.
 */
export interface FormSubmitProps<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'button'>, 'children'>,
    Omit<SubmitDefaultOptions, 'class'> {
  /** Button content or render function receiving the active `FormState`. */
  children?: ReactNode | ((form?: FormState<T>) => ReactNode);
}

/**
 * Configuration and HTML button attributes accepted by `<FormReset>`.
 *
 * @template T - The Zod schema type for the owning form.
 */
export interface FormResetProps<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>>
  extends Omit<ComponentProps<'button'>, 'children'>,
    Omit<ResetDefaultOptions, 'class'> {
  /** Button content or render function receiving the active `FormState`. */
  children?: ReactNode | ((form?: FormState<T>) => ReactNode);
  /** When true, empties all field values instead of restoring initial values. */
  clear?: boolean;
}

/**
 * Schema-typed form component bundle providing colocated subcomponents and state accessors.
 *
 * @template T - The Zod schema type defining the form contract.
 */
export type TypedForm<T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>> = ReturnType<
  typeof setup<FormProps<input<T>>, FormSlots<T>>
> & {
  /** Schema-aware field wrapper that connects inputs to form validation and accessibility. */
  Field: ReturnType<typeof setup<FieldProps<input<T>, T>, FieldSlots<input<T>>>>;
  /** Schema-aware array field manager for dynamic repeatable item collections. */
  FieldList: <
    K extends DeepPaths<input<T>>,
    I = NonNullable<PathValue<input<T>, K>> extends (infer U)[] ? U : AnyType,
  >(props: {
    name: K;
    children: (items: I[]) => ReactNode;
    errorClass?: string;
  }) => ReactNode;
  /** Self-governing submit button bound to the form submission lifecycle. */
  Submit: ReturnType<typeof setup<FormSubmitProps<T>>>;
  /** Self-governing reset button bound to the form dirty/changed state. */
  Reset: ReturnType<typeof setup<FormResetProps<T>>>;
  /** Accesses the active `FormState` instance from context. */
  get(): FormState<T> | undefined;
  /** Accesses a specific `FormField` signal from context by path. */
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

    const $restProps = $props.$omit(['schema', 'value', 'className', 'onSubmit', ...FORM_OPTIONS_KEYS]);

    const attrs = derived.as(() => {
      const fallbackSchema = $props.schema;
      const form = untrack(() => formState((schema ?? fallbackSchema) as AnyType, $props));
      return { form };
    });

    /* istanbul ignore next */
    const className = derived(() =>
      classx(
        formOptions?.class ?? FORM_OPTIONS.class,
        $props.className,
        Boolean(attrs.form.error) && ($props.errorClass ?? formOptions?.errorClass ?? FORM_OPTIONS.errorClass),
        Boolean(attrs.form.pending) && ($props.pendingClass ?? formOptions?.pendingClass ?? FORM_OPTIONS.pendingClass)
      )
    );

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if ($props.onSubmit) {
        void attrs.form.submit((data: AnyType, changes: AnyType) => $props.onSubmit(data, changes, e));
      }
    };

    return () => (
      <form {...$restProps} className={className.value} onSubmit={handleSubmit}>
        <Slot for={() => snippets.header?.(attrs.form)} />
        <Slot for={() => snippets.error?.(attrs.form)}>
          {() => (
            <Show when={() => attrs.form.error}>
              {(error) => (
                <span
                  className={classx(formOptions?.errorClass ?? FORM_OPTIONS.errorClass, $props.errorClass)}
                  role="alert"
                >
                  {error.message}
                </span>
              )}
            </Show>
          )}
        </Slot>
        {renderDynamic($props.children, attrs.form)}
        <Slot for={() => snippets.actions?.(attrs.form)} />
        <Slot for={() => snippets.footer?.(attrs.form)} />
      </form>
    );
  }, 'Form');

  const Field = setup<FieldProps<input<T>, T>, FieldSlots<input<T>>>((props, snippets) => {
    const $props = props as AnyType;
    const $restProps = $props.$omit(['name', 'match', 'label', 'children', ...FIELD_OPTIONS_KEYS]);

    const attrs = derived.as(() => {
      const field = formField($props.name, $props.match) as FormField<AnyType>;
      const fieldId = (field.name || '').replace(/\./g, '-');
      const errorId = `${fieldId}-error`;

      return { field, fieldId, errorId };
    });

    const className = derived(() =>
      classx(
        fieldOptions?.class ?? FIELD_OPTIONS.class,
        $props.className,
        Boolean(attrs.field.touched && attrs.field.error) &&
          ($props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass)
      )
    );

    return () => {
      if (!attrs.field.name) {
        return (
          <span className={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
            [FieldError]: Name property is required!
          </span>
        );
      }
      if (typeof $props.children === 'function') {
        return renderDynamic($props.children, attrs.field);
      }

      return (
        <div {...$restProps} className={className.value}>
          <Slot for={() => snippets.label?.(attrs.field)}>
            {() => (
              <Show when={() => $props.label}>
                {(label) => (
                  <label
                    htmlFor={attrs.fieldId}
                    className={classx(fieldOptions?.labelClass ?? FIELD_OPTIONS.labelClass, $props.labelClass)}
                  >
                    {label}
                    <Show when={() => attrs.field.required}>
                      {() => (
                        <span
                          className={classx(
                            fieldOptions?.requiredClass ?? FIELD_OPTIONS.requiredClass,
                            $props.requiredClass
                          )}
                        >
                          {$props.requiredLabel ?? fieldOptions?.requiredLabel ?? FIELD_OPTIONS.requiredLabel}
                        </span>
                      )}
                    </Show>
                  </label>
                )}
              </Show>
            )}
          </Slot>
          <div className={classx(fieldOptions?.controlClass ?? FIELD_OPTIONS.controlClass, $props.controlClass)}>
            <Slot for={() => snippets.prefix?.(attrs.field)} />
            {renderDynamic($props.children, attrs.field)}
            <Slot for={() => snippets.suffix?.(attrs.field)} />
          </div>
          <Slot for={() => snippets.support?.(attrs.field)}>
            {() => (
              <>
                <Show when={() => attrs.field.touched && attrs.field.error}>
                  {(errors) => (
                    <For each={() => errors}>
                      {(error) => (
                        <span
                          id={attrs.errorId}
                          className={classx(
                            fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass,
                            $props.supportClass
                          )}
                          role="alert"
                        >
                          {error}
                        </span>
                      )}
                    </For>
                  )}
                </Show>
                <Show when={() => attrs.field.valid && !attrs.field.matched && $props.mismatchLabel}>
                  {(label) => (
                    <span
                      id={attrs.errorId}
                      className={classx(fieldOptions?.supportClass ?? FIELD_OPTIONS.supportClass, $props.supportClass)}
                      role="alert"
                    >
                      {label}
                    </span>
                  )}
                </Show>
              </>
            )}
          </Slot>
        </div>
      );
    };
  }, 'Field');

  const FieldList = setup<FieldListProps<input<T>>>((props) => {
    const $props = props as AnyType;

    const attrs = derived.as(() => {
      const field = formField<AnyType[]>(() => $props.name);
      untrack(() => {
        if (field.name && !Array.isArray(field.value)) field.value = [];
      });
      return { field };
    });

    return () => {
      if (!attrs.field.name) {
        return (
          <span className={$props.errorClass ?? fieldOptions?.errorClass ?? FIELD_OPTIONS.errorClass}>
            [FieldListError]: Name property is required!
          </span>
        );
      }

      return renderDynamic($props.children, attrs.field.value);
    };
  }, 'FieldList');

  const Submit = setup<FormSubmitProps<T>>((props) => {
    const $props = props as AnyType;
    const $restProps = $props.$omit(['disabled', 'type', 'className', 'children', ...SUBMIT_OPTIONS_KEYS]);

    const attrs = derived.as(() => {
      const form = getForm<T>();
      return { form };
    });

    const className = derived(() =>
      classx(
        submitOptions?.class ?? SUBMIT_OPTIONS.class,
        $props.className,
        Boolean(attrs.form?.pending) &&
          ($props.pendingClass ?? submitOptions?.pendingClass ?? SUBMIT_OPTIONS.pendingClass)
      )
    );

    return () => (
      <button {...$restProps} type="submit" className={className.value} disabled={!attrs.form?.canSubmit}>
        {renderDynamic($props.children, attrs.form)}
      </button>
    );
  }, 'FormSubmit');

  const Reset = setup<FormResetProps<T>>((props) => {
    const $props = props as AnyType;
    const $restProps = $props.$omit([
      'disabled',
      'type',
      'children',
      'className',
      'onClick',
      'clear',
      ...RESET_OPTIONS_KEYS,
    ]);

    const attrs = derived.as(() => {
      const form = getForm<T>();
      return { form };
    });

    const className = derived(() =>
      classx(
        resetOptions?.class ?? RESET_OPTIONS.class,
        $props.className,
        Boolean(attrs.form?.changed) && ($props.dirtyClass ?? resetOptions?.dirtyClass ?? RESET_OPTIONS.dirtyClass)
      )
    );

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if ($props.clear) {
        attrs.form?.clear();
      } else {
        attrs.form?.reset();
      }
      $props.onClick?.(e);
    };

    return () => (
      <button
        {...$restProps}
        type="button"
        disabled={!attrs.form?.changed}
        className={className.value}
        onClick={handleClick}
      >
        {renderDynamic($props.children, attrs.form)}
      </button>
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
