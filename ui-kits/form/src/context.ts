import { anchor, getContext, mutable, setContext } from '@airlib/core';
import type { input, ZodObject } from 'zod';
import { buildShell } from './builder.js';
import { FORM_FIELD_SYMBOL, FORM_STATUS, FORM_SYMBOL } from './constant.js';
import type { FormField } from './field.js';
import type { FormState } from './form.js';
import { flattenSchemas } from './schema.js';
import type { AnyType, ContextBridge, FormContextStore, FormStateOptions, SchemaMap } from './types.js';

export const context: ContextBridge = {
  read: getContext,
  write: setContext,
};

export function setContextBridge(bridge: ContextBridge) {
  /* istanbul ignore else */
  if (typeof bridge?.read === 'function') context.read = bridge.read;
  /* istanbul ignore else */
  if (typeof bridge?.write === 'function') context.write = bridge.write;
}

export function getForm<T extends ZodObject>(): FormState<T> | undefined {
  return context.read(FORM_SYMBOL);
}

export function getFormField<T>(): FormField<T> | undefined {
  return context.read(FORM_FIELD_SYMBOL);
}

/**
 * Flattens the given data into a Map of dot-path → value.
 * Captures what was GIVEN as initial data, before any schema defaults.
 */
export function createBaseline(data: AnyType, path = '', store = new Map<string, AnyType>()): Map<string, AnyType> {
  /* istanbul ignore else */
  if (data === undefined || data === null || typeof data !== 'object' || data instanceof Date) {
    /* istanbul ignore else */
    if (path) store.set(path, data);
    return store;
  }

  if (Array.isArray(data)) {
    if (path) store.set(path, data);
    data.forEach((item, i) => createBaseline(item, path ? `${path}.${i}` : `${i}`, store));
  } else {
    if (path) store.set(path, data);
    for (const key of Object.keys(data)) {
      createBaseline(data[key], path ? `${path}.${key}` : key, store);
    }
  }

  return store;
}

/**
 * Resolves a field path to its schema path by replacing purely numeric
 * segments with '$' (the array element wildcard).
 *
 * Only segments that are entirely numeric are treated as array indices.
 * "venue23" stays as "venue23". "23" becomes "$".
 */
export function toSchemaPath(fieldPath: string): string {
  return fieldPath
    .split('.')
    .map((seg) => (/^\d+$/.test(seg) ? '$' : seg))
    .join('.');
}

/**
 * Engine context — holds all mutable state the form engine operates on.
 */
export class FormContext<T extends ZodObject> {
  /** Pre-computed schema map. */
  public schemas: Map<string, SchemaMap>;

  public props: { value?: Partial<input<T>> };

  public store: FormContextStore = mutable({
    status: FORM_STATUS.IDLE,
    errors: {},
    changes: {},
    touched: false,
  });

  public errorKeys = mutable(new Set<string>());
  public changeKeys = mutable(new Set<string>());
  public blockedKeys = mutable(new Set<string>());

  public baseline = new Map<string, AnyType>();
  public inputSnapshot: Partial<input<T>> = {};

  public initialized = new Set<string>();
  public fieldChildren = new Map<string, Set<string>>();
  public locked = false;
  public options: FormStateOptions;

  constructor(
    public schema: T,
    props: { value?: Partial<input<T>> } = {},
    options: FormStateOptions = {}
  ) {
    if (!anchor.has(props)) {
      props = mutable(props);
    }
    if (!anchor.has(props.value as AnyType)) {
      props.value = mutable((props.value as AnyType) ?? {});
    }

    this.props = props;
    this.schemas = flattenSchemas(schema);
    this.options = { strict: true, validateOnInit: true, settleOnSubmit: true, ...options };

    this.applyShell();
  }

  public applyShell() {
    const { snapshot, baseline, errors, changes } = buildShell(this.schemas, this.props.value);
    this.inputSnapshot = snapshot;
    this.baseline = baseline;

    this.errorKeys.clear();
    this.changeKeys.clear();
    this.initialized.clear();
    this.fieldChildren.clear();
    this.store.errors = {};
    this.store.changes = {};

    for (const [path, messages] of errors) {
      this.store.errors[path] = messages;
      this.errorKeys.add(path);
    }

    if (this.options.shallowChange === false) {
      for (const [path, value] of changes) {
        this.store.changes[path] = value;
        this.changeKeys.add(path);
      }
    }

    for (const path of baseline.keys()) {
      this.initialized.add(path);

      const segments = path.split('.');
      if (segments.length < 2) continue;
      let ancestor = '';
      for (let i = 0; i < segments.length - 1; i++) {
        ancestor = ancestor ? `${ancestor}.${segments[i]}` : segments[i];
        let children = this.fieldChildren.get(ancestor);
        if (!children) {
          children = new Set();
          this.fieldChildren.set(ancestor, children);
        }
        children.add(path);
      }
    }
  }

  public cleanup() {
    delete this.store.error;

    this.initialized.clear();
    this.fieldChildren.clear();
    this.errorKeys.clear();
    this.changeKeys.clear();
    this.blockedKeys.clear();

    this.store.errors = {};
    this.store.changes = {};
    this.store.touched = false;
    this.store.status = FORM_STATUS.IDLE;

    return this;
  }

  public cleanupSource() {
    if (!this.props.value) return this;
    for (const key of Object.keys(this.props.value)) {
      delete this.props.value[key as never];
    }
    return this;
  }
}

/**
 * Looks up the SchemaMap entry for a given field path.
 */
export function schemaOf(ctx: FormContext<AnyType>, field: string): SchemaMap | undefined {
  if (typeof field !== 'string') return;
  return ctx.schemas.get(toSchemaPath(field));
}
