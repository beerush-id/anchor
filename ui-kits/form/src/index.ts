import type { ZodObject } from 'zod';
import { getForm } from './context.js';
import { formField } from './field.js';
import { type FormState, formState } from './form.js';
import type { AnyType } from './types.js';

export { FORM_FIELD_SYMBOL, FORM_INPUT, FORM_INVALID_INPUT, FORM_STATUS, FORM_SYMBOL } from './constant.js';
export { getForm, getFormField, setContextBridge } from './context.js';
export * from './field.js';
export * from './form.js';
export * from './input.js';
export * from './types.js';

export type FormFactory<T extends ZodObject> = ((props: { value?: AnyType }) => FormState<T>) & {
  get(): FormState<T> | undefined;
  field<K extends string>(field: K | (() => K)): ReturnType<typeof formField>;
};

/**
 * Creates a form factory based on a Zod schema.
 */
export function formFactory<T extends ZodObject>(schema: T): FormFactory<T> {
  const factory = ((props: { value?: AnyType }) => {
    return formState(schema as AnyType, props);
  }) as FormFactory<T>;

  factory.get = () => getForm();
  factory.field = (field) => {
    return formField(field);
  };

  return factory;
}
