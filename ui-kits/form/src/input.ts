import { effect, mutable, untrack } from '@airlib/core';
import { FORM_INPUT, FORM_INVALID_INPUT } from './constant.js';
import { getForm, getFormField } from './context.js';
import { type FormField, formField } from './field.js';

export type InputType = (typeof FORM_INPUT)[keyof typeof FORM_INPUT];

export type FormInputProps<T = unknown> = {
  type?: InputType;
  name?: string;
  value?: T;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  required?: boolean;
};

export type FormInputOptions<T = unknown> = {
  parse?: (raw: string, type: InputType) => T;
  stringify?: (value: T, type: InputType) => string;
};

const BOOL_INPUTS = new Set<InputType>([FORM_INPUT.checkbox, FORM_INPUT.radio, FORM_INPUT.toggle]);

export class FormInput<T> {
  locked = false;

  get name() {
    return this.#field?.name ?? this.#props.name ?? '';
  }

  get type() {
    return this.#props?.type ?? FORM_INPUT.text;
  }

  get value(): T {
    return this.#buffer.value as T;
  }

  set value(raw: string) {
    untrack(() => {
      this.locked = true;
      this.#buffer.value = raw;

      const parsed = this.#parse(raw, this.type);
      if (parsed === FORM_INVALID_INPUT) return;

      if (this.#field) this.#field.value = parsed as T;
      else this.#props.value = parsed as T;

      this.locked = false;
    });
  }

  get changed() {
    return this.#field?.changed ?? false;
  }

  get touched() {
    return this.#field?.touched ?? false;
  }

  get disabled() {
    return (this.#props.disabled || this.#field?.disabled) ?? false;
  }

  get required() {
    return this.#field?.required ?? this.#props?.required ?? false;
  }

  get checked() {
    return this.#buffer.checked;
  }

  set checked(value: boolean) {
    untrack(() => {
      this.locked = true;

      const checked = Boolean(value);
      this.#buffer.checked = checked;

      if (!this.#field) this.#props.checked = checked;
      if ((this.type === FORM_INPUT.radio || this.type === FORM_INPUT.toggle) && checked && this.#field)
        this.#field.value = this.#buffer.value as T;
      if (this.type === FORM_INPUT.checkbox && this.#field) this.#field.value = checked as T;

      this.locked = false;
    });
  }

  get error() {
    return this.#field?.error;
  }

  get valid() {
    return this.#field?.valid ?? true;
  }

  get matched() {
    return this.#field?.matched ?? true;
  }

  readonly #field: FormField<T> | undefined;
  readonly #props: FormInputProps<T>;
  readonly #buffer: { value: string; checked: boolean };
  readonly #initial: { value?: T; checked?: boolean };
  readonly #parse: (raw: string, type: InputType) => unknown;
  readonly #stringify: (value: T, type: InputType) => string;

  constructor(props: FormInputProps<T>, options?: FormInputOptions<T>) {
    const { parse = defaultParse, stringify = defaultStringify } = options ?? ({} as FormInputOptions<T>);

    this.#field = getFormField<T>();
    if (!this.#field && props.name) {
      this.#field = getForm() ? formField(() => props.name!) : undefined;
    }
    this.#props = props;
    this.#buffer = mutable({ value: '', checked: false });
    this.#initial = { value: props.value, checked: props.checked as boolean };
    this.#parse = parse;
    this.#stringify = stringify as (value: T, type: InputType) => string;

    if (this.type === FORM_INPUT.radio || this.type === FORM_INPUT.toggle) {
      effect(() => {
        const value = props.value;
        const checked = this.#field?.value === value;
        if (this.locked) return;

        untrack(() => {
          this.#buffer.value = value as string;
          this.#buffer.checked = checked;
        });
      });
    } else if (this.type === FORM_INPUT.checkbox) {
      effect(() => {
        const checked = (this.#field ? this.#field.value : props.checked) ?? false;
        if (this.locked) return;
        untrack(() => (this.#buffer.checked = checked as boolean));
      });
    } else {
      effect(() => {
        const value = this.#field ? this.#field.value : props.value;
        if (this.locked) return;
        untrack(() => (this.#buffer.value = this.#stringify(value as T, this.type)));
      });
    }
  }

  settled() {
    untrack(() => {
      if (BOOL_INPUTS.has(this.type) || !this.locked) return;

      const value = this.#field ? this.#field.value : this.#props.value;
      this.#buffer.value = this.#stringify(value as T, this.type);
      this.locked = false;
    });
  }

  clear() {
    untrack(() => {
      this.locked = false;
      if (this.#field) {
        this.#field.clear();
        this.#syncBuffer();
      } else {
        this.#buffer.value = '';
        this.#buffer.checked = false;
        this.#props.value = undefined;
        this.#props.checked = undefined;
      }
    });
  }

  reset() {
    untrack(() => {
      this.locked = false;

      if (this.#field) {
        this.#field.reset();
        this.#syncBuffer();
      } else {
        this.#buffer.value = this.#stringify(this.#initial.value as T, this.type);
        this.#buffer.checked = this.#initial.checked ?? false;
        this.#props.value = this.#initial.value;
        this.#props.checked = this.#initial.checked;
      }
    });
  }

  #syncBuffer() {
    untrack(() => {
      if (BOOL_INPUTS.has(this.type)) {
        this.#buffer.checked = Boolean(this.#field?.value);
      } else {
        this.#buffer.value = this.#stringify(this.#field?.value as T, this.type);
      }
    });
  }
}

/** @deprecated Use `FormInput` instead. */
export type FormInputState = FormInput<unknown>;

/**
 * Creates a reactive input controller for form elements.
 */
export function formInput<T>(props: FormInputProps<T>, options?: FormInputOptions<T>): FormInput<T> {
  return new FormInput(props, options);
}

function defaultParse(raw: string, type: InputType): unknown {
  switch (type) {
    case FORM_INPUT.number:
    case FORM_INPUT.range: {
      const n = Number(raw);
      return Number.isNaN(n) ? FORM_INVALID_INPUT : n;
    }
    case FORM_INPUT.date:
    case FORM_INPUT.datetimeLocal:
    case FORM_INPUT.month:
    case FORM_INPUT.week:
    case FORM_INPUT.time: {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? FORM_INVALID_INPUT : d;
    }
    default:
      return raw;
  }
}

function defaultStringify(value: unknown, type: InputType): string {
  if (value === undefined || value === null) return '';

  switch (type) {
    case FORM_INPUT.date: {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    case FORM_INPUT.datetimeLocal: {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    case FORM_INPUT.time: {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    case FORM_INPUT.month: {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    }
    case FORM_INPUT.week: {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-W${pad(getWeekNumber(d))}`;
    }
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}
