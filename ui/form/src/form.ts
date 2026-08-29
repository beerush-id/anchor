import { anchor, captureStack, effect, onCleanup, subscribe, untrack } from '@airlib/core';
import type { input, output, ZodObject } from 'zod';
import { FORM_STATUS, FORM_SYMBOL } from './constant.js';
import { context, FormContext, schemaOf } from './context.js';
import { formField } from './field.js';
import { initField } from './init.js';
import { synchronize } from './sync.js';
import type { AnyType, FormErrors, FormEvent, FormFields, FormStateOptions, FormSubmitHandler } from './types.js';
import { readPath, unflattenData, writePath } from './utils.js';
import { clearField, resetField, setter, wipeChildren } from './write.js';

export class FormState<T extends ZodObject> {
  tracking = false;

  get fields(): FormFields<input<T>> {
    return this.#dataProxy;
  }

  get errors(): FormErrors<input<T>> {
    return this.#errorProxy;
  }

  get changed() {
    return this.#ctx.changeKeys.size > 0;
  }

  get changeList() {
    return this.#ctx.store.changes;
  }

  get valid() {
    return this.#ctx.errorKeys.size === 0;
  }

  get output() {
    return structuredClone(anchor.get(this.#ctx.props.value!));
  }

  get changes() {
    return unflattenData(anchor.get(this.#ctx.store.changes));
  }

  get error() {
    return this.#ctx.store.error;
  }

  get status() {
    return this.#ctx.store.status;
  }

  get pending() {
    return this.#ctx.store.status === FORM_STATUS.PENDING;
  }

  get blocked() {
    return this.#ctx.blockedKeys.size > 0;
  }

  get canSubmit() {
    return this.valid && this.changed && !this.blocked && !this.pending;
  }

  get touched() {
    return this.#ctx.store.touched;
  }

  readonly #ctx: FormContext<AnyType>;
  readonly #dataProxy: AnyType;
  readonly #errorProxy: AnyType;
  readonly #subscribers = new Set<(event: FormEvent<T>) => void>();

  constructor(schema: T, props: { value?: Partial<input<T>> } = {}, options?: FormStateOptions) {
    this.#ctx = new FormContext(schema as AnyType, props as AnyType, options);

    this.#dataProxy = new Proxy({}, {
      get: (_, prop: string) => {
        // initField(this.#ctx, prop);
        return readPath(this.#ctx.props.value, prop);
      },
      set: (_, prop: string, value: AnyType) => {
        if (this.#ctx.locked) return true;
        const res = setter(this.#ctx, prop, value);
        for (const subscriber of this.#subscribers) {
          subscriber({ type: 'change', path: prop, value });
        }
        return res;
      },
    } as ProxyHandler<Record<string, unknown>>);

    this.#errorProxy = new Proxy(
      {},
      {
        get: (_, prop: string) => {
          return this.#ctx.store.errors[prop];
        },
        set: () => {
          console.warn('[AirLib Form] Violation: form.errors is read-only.');
          return true;
        },
      }
    );

    this.#initializeFromSchema();

    let initialized = false;

    effect(() => {
      const value = this.#ctx.props.value!;

      untrack(() => {
        if (initialized) {
          this.#ctx.cleanup();
          this.#ctx.applyShell();
          this.#initializeFromSchema();
        }
      });

      initialized = true;
      return untrack(() => subscribe(value, (v, e) => synchronize(this.#ctx, v, e)));
    });

    onCleanup(() => this.#ctx.cleanup());

    context.write(FORM_SYMBOL, this);
  }

  field(fieldPath: string) {
    return formField(fieldPath);
  }

  public block(key: string) {
    untrack(() => {
      if (this.#ctx.blockedKeys.has(key)) return;
      this.#ctx.blockedKeys.add(key);
    });
    return this;
  }

  public unblock(key: string) {
    untrack(() => {
      if (!this.#ctx.blockedKeys.has(key)) return;
      this.#ctx.blockedKeys.delete(key);
    });
    return this;
  }

  public schemaOf(field: string) {
    const result = schemaOf(this.#ctx, field);
    if (!result) {
      captureStack.violation.general(
        'Unknown Field Access',
        `Field "${field}" is not defined in the schema.`,
        new Error(`Unknown schema field: ${field}`),
        [
          'To prevent unexpected behavior, make sure to:',
          '- Explicitly define all fields in your form schema.',
          '- Never assign a value to a field without a defined schema.',
          'Allowing untracked fields to enter your form state can cause data integrity issues.',
        ],
        this.schemaOf
      );
    }
    return result;
  }

  public isRequired(path: string) {
    return this.schemaOf(path)?.required ?? false;
  }

  public clearField(path: string) {
    clearField(this.#ctx, path);
    return this;
  }

  public resetField(path: string) {
    resetField(this.#ctx, path);
    return this;
  }

  public clear() {
    if (this.#ctx.locked) return this;
    this.#ctx.locked = true;

    this.#ctx.cleanupSource();
    this.#ctx.cleanup();
    this.#ctx.applyShell();

    this.#ctx.options.onChange?.(this.#ctx.store.changes, this.#ctx.store.errors);
    this.#ctx.locked = false;

    for (const subscriber of this.#subscribers) {
      subscriber({ type: 'clear' });
    }

    return this;
  }

  public reset() {
    if (this.#ctx.locked) return this;
    this.#ctx.locked = true;

    for (const path of this.#ctx.changeKeys) {
      let baselineValue = this.#ctx.baseline.get(path);
      if (typeof baselineValue === 'object' && baselineValue !== null) {
        baselineValue = structuredClone(baselineValue);
      }

      if (baselineValue !== null && typeof baselineValue === 'object') {
        wipeChildren(this.#ctx, path);
      }

      writePath(this.#ctx.props.value, path, baselineValue);

      delete this.#ctx.store.changes[path];

      const schema = schemaOf(this.#ctx, path);
      if (schema && schema.type !== 'object' && schema.type !== 'array') {
        const result = (schema.shape as ZodObject).safeParse(baselineValue);
        if (result.success) {
          this.#ctx.errorKeys.delete(path);
          delete this.#ctx.store.errors[path];
        } else {
          this.#ctx.store.errors[path] = result.error.issues.map((i: AnyType) => i.message);
          this.#ctx.errorKeys.add(path);
        }
      }
    }

    this.#ctx.changeKeys.clear();
    this.#ctx.store.touched = false;
    delete this.#ctx.store.error;

    this.#ctx.options.onChange?.(this.#ctx.store.changes, this.#ctx.store.errors);
    this.#ctx.locked = false;

    for (const subscriber of this.#subscribers) {
      subscriber({ type: 'reset' });
    }

    return this;
  }

  public async submit(handler: FormSubmitHandler<T>, settle = this.#ctx.options.settleOnSubmit) {
    if (this.#ctx.locked) return;
    this.#ctx.locked = true;

    const data = this.output as output<T>;
    const changes = this.changes as Partial<output<T>>;

    delete this.#ctx.store.error;
    this.#ctx.store.status = FORM_STATUS.PENDING;

    try {
      await handler(data, changes);
      this.#ctx.store.status = FORM_STATUS.SUCCESS;

      if (settle) {
        this.#ctx.applyShell();
        this.#ctx.store.touched = false;
      }

      for (const subscriber of this.#subscribers) {
        subscriber({ type: 'submit', data, changes });
      }
    } catch (error) {
      this.#ctx.store.error = error as Error;
      this.#ctx.store.status = FORM_STATUS.ERROR;
    } finally {
      this.#ctx.locked = false;
    }
  }

  public subscribe(handler: (event: FormEvent<T>) => void) {
    this.#subscribers.add(handler);
    return () => this.#subscribers.delete(handler);
  }

  #initializeFromSchema(): void {
    for (const key of this.#ctx.schemas.keys()) {
      if (key.includes('.$')) continue;
      initField(this.#ctx, key);
    }
  }
}

/**
 * Creates a reactive form state based on a Zod schema.
 */
export function formState<T extends ZodObject>(
  schema: T,
  props: { value?: Partial<input<T>> } = {},
  options?: FormStateOptions
): FormState<T> {
  return new FormState(schema, props, options);
}
