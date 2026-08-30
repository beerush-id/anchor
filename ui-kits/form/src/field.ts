import { effect, mutable, onCleanup, untrack } from '@airlib/core';
import { FORM_FIELD_SYMBOL } from './constant.js';
import { context, getForm } from './context.js';
import type { FormInputOptions, FormInputProps } from './input.js';
import { FormInput } from './input.js';
import type { AnyType } from './types.js';

export class FormField<T> {
  get name(): string {
    return typeof this.#name === 'function' ? this.#name() : this.#name;
  }

  get value(): T {
    return this.#form?.fields[this.name] as T;
  }

  set value(value: T) {
    if (!this.#form) return;
    this.#form.fields[this.name] = value;
    this.#touched.value = true;
  }

  get error(): string[] | undefined {
    return this.#form?.errors[this.name];
  }

  get valid(): boolean {
    return !this.#form?.errors[this.name];
  }

  get matched(): boolean {
    return this.#matched.value;
  }

  get disabled() {
    return this.#form?.pending ?? false;
  }

  get required() {
    if (typeof this.#required === 'function') return this.#required();
    if (typeof this.#required === 'boolean') return this.#required;
    return this.#form?.isRequired(this.name) ?? false;
  }

  get changed() {
    return this.#form ? Object.hasOwn(this.#form.changeList, this.name) : false;
  }

  get touched() {
    return this.#touched.value;
  }

  readonly #name: string | (() => string);
  readonly #form = getForm();
  readonly #matched: { value: boolean };
  readonly #touched = mutable(false);
  readonly #required?: boolean | (() => boolean);

  constructor(
    name: string | (() => string),
    match?: string | ((form: AnyType) => boolean),
    required?: boolean | (() => boolean)
  ) {
    this.#name = name;
    this.#matched = match ? mutable({ value: true }) : { value: true };
    this.#required = required;

    if (match && this.#form) {
      const form = this.#form;
      effect(() => {
        const matched = typeof match === 'function' ? match(form) : form.fields[this.name] === form.fields[match];

        untrack(() => {
          this.#matched.value = matched;

          if (this.#matched.value) {
            this.#form!.unblock(this.name);
          } else {
            this.#form!.block(this.name);
          }
        });
      });
    }

    if (this.#form) {
      const unsubscribe = this.#form.subscribe(({ type }) => {
        if (type === 'reset' || type === 'submit') this.#touched.value = false;
      });
      onCleanup(() => {
        unsubscribe();
        this.#form!.unblock(this.name);
      });

      context.write(FORM_FIELD_SYMBOL, this);
    }
  }

  input(props: FormInputProps<T>, options?: FormInputOptions<T>) {
    return new FormInput(props, options);
  }

  clear() {
    this.#form?.clearField(this.name);
  }

  reset() {
    this.#form?.resetField(this.name);
    this.#touched.value = false;
  }

  remove() {
    const ref = this.#arrayRef();
    if (!ref) return;
    ref.array.splice(ref.index, 1);
  }

  moveUp(count = 1) {
    const ref = this.#arrayRef();
    if (!ref) return;

    const target = ref.index - count;
    if (target < 0) return;

    const [item] = ref.array.splice(ref.index, 1);
    ref.array.splice(target, 0, item);
  }

  moveDown(count = 1) {
    const ref = this.#arrayRef();
    if (!ref) return;

    const target = ref.index + count;
    if (target >= ref.array.length) return;

    const [item] = ref.array.splice(ref.index, 1);
    ref.array.splice(target, 0, item);
  }

  #arrayRef(): { array: AnyType[]; index: number } | undefined {
    if (!this.#form) return;

    const segments = this.name.split('.');
    const last = segments[segments.length - 1];
    if (!/^\d+$/.test(last)) return;

    const arrayPath = segments.slice(0, -1).join('.');
    const array = this.#form.fields[arrayPath];
    if (!Array.isArray(array)) return;

    return { array, index: Number(last) };
  }
}

/** @deprecated Use `FormField` instead. */
export type FormFieldState<T> = FormField<T>;

/**
 * Creates a reactive reference to a specific form field.
 */
export function formField<T>(
  name: string | (() => string),
  match?: string | ((form: AnyType) => boolean),
  required?: boolean | (() => boolean)
): FormField<T> {
  return new FormField(name, match, required);
}
