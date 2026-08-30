import { captureStack } from '@airlib/core';
import { type FormContext, schemaOf } from './context.js';
import { detectChanged, initField } from './init.js';
import type { AnyType } from './types.js';
import { writePath } from './utils.js';

/**
 * Wipes all tracking state for children of a given path.
 * Uses the parent-children index for O(k) lookup.
 */
export function wipeChildren(ctx: FormContext<AnyType>, parentPath: string): void {
  const children = ctx.fieldChildren.get(parentPath);
  if (!children) return;

  for (const childPath of children) {
    ctx.initialized.delete(childPath);
    delete ctx.store.errors[childPath];
    delete ctx.store.changes[childPath];
    ctx.errorKeys.delete(childPath);
    ctx.changeKeys.delete(childPath);
    ctx.fieldChildren.delete(childPath);
  }

  children.clear();
}

/**
 * Writes a value to the source and updates changed tracking.
 */
function writeToSource(ctx: FormContext<AnyType>, prop: string, value: AnyType): void {
  /* istanbul ignore else */
  if (value !== null && typeof value === 'object') {
    wipeChildren(ctx, prop);
  }

  /* istanbul ignore else */
  if (ctx.props.value) {
    ctx.locked = true;
    writePath(ctx.props.value, prop, value);
    ctx.locked = false;
  }

  detectChanged(ctx, prop, value);
  ctx.options.onChange?.(ctx.store.changes, ctx.store.errors);
}

/**
 * Sets a field value through the form proxy.
 * Validates against shape, updates errors, marks touched, writes to source.
 */
export function setter(ctx: FormContext<AnyType>, prop: string, value: AnyType): boolean {
  initField(ctx, prop);

  const fieldSchema = schemaOf(ctx, prop);
  if (!fieldSchema) {
    if (!ctx.options.strict) {
      writeToSource(ctx, prop, value);
    } else {
      captureStack.violation.general(
        'Unknown Field Access',
        `Field "${prop}" is not defined in the schema.`,
        new Error(`Unknown schema field: ${prop}`),
        [
          'To prevent unexpected behavior, make sure to:',
          '- Explicitly define all fields in your form schema.',
          '- Never assign a value to a field without a defined schema.',
          'Allowing untracked fields to enter your form state can cause data integrity issues.',
        ],
        setter
      );
    }
    return true;
  }

  const validation = fieldSchema.shape.safeParse(value);

  if (validation.success) {
    writeToSource(ctx, prop, validation.data);
    delete ctx.store.errors[prop];
    ctx.errorKeys.delete(prop);
  } else {
    writeToSource(ctx, prop, value);
    ctx.store.errors[prop] = validation.error.issues.map((i) => i.message);
    ctx.errorKeys.add(prop);
  }

  ctx.store.touched = true;
  return true;
}

/**
 * Clears a field back to its schema default.
 */
export function clearField(ctx: FormContext<AnyType>, prop: string): void {
  const fieldSchema = schemaOf(ctx, prop);
  if (!fieldSchema) return;

  const result = fieldSchema.builder.safeParse(undefined);
  const defaultValue =
    result.data ?? (fieldSchema.type === 'array' ? [] : fieldSchema.type === 'object' ? {} : undefined);

  if (defaultValue !== null && typeof defaultValue === 'object') {
    wipeChildren(ctx, prop);
  }

  /* istanbul ignore else */
  if (ctx.props.value) {
    ctx.locked = true;
    writePath(ctx.props.value, prop, defaultValue);
    ctx.locked = false;
  }

  const validation = fieldSchema.builder.safeParse(defaultValue);
  if (validation.success) {
    delete ctx.store.errors[prop];
    ctx.errorKeys.delete(prop);
  } else if (fieldSchema.type !== 'object' && fieldSchema.type !== 'array') {
    ctx.store.errors[prop] = validation.error.issues.map((i) => i.message);
    ctx.errorKeys.add(prop);
  }

  detectChanged(ctx, prop, defaultValue);
  ctx.initialized.add(prop);
  ctx.options.onChange?.(ctx.store.changes, ctx.store.errors);
}

/**
 * Resets a field back to its baseline value (what was originally given).
 * Falls back to clear (schema default) if no baseline exists for this field.
 */
export function resetField(ctx: FormContext<AnyType>, prop: string): void {
  if (!ctx.baseline.has(prop)) {
    clearField(ctx, prop);
    return;
  }

  let baselineValue = ctx.baseline.get(prop);

  /* istanbul ignore else */
  if (typeof baselineValue === 'object' && baselineValue !== null) {
    baselineValue = structuredClone(baselineValue);
  }

  /* istanbul ignore else */
  if (baselineValue !== null && typeof baselineValue === 'object') {
    wipeChildren(ctx, prop);
  }

  /* istanbul ignore else */
  if (ctx.props.value) {
    ctx.locked = true;
    writePath(ctx.props.value, prop, baselineValue);
    ctx.locked = false;
  }

  const fieldSchema = schemaOf(ctx, prop);

  /* istanbul ignore else */
  if (fieldSchema) {
    const validation = fieldSchema.shape.safeParse(baselineValue);

    /* istanbul ignore else */
    if (validation.success) {
      delete ctx.store.errors[prop];
      ctx.errorKeys.delete(prop);
    } else if (fieldSchema.type !== 'object' && fieldSchema.type !== 'array') {
      ctx.store.errors[prop] = validation.error.issues.map((i) => i.message);
      ctx.errorKeys.add(prop);
    }
  }

  ctx.changeKeys.delete(prop);
  delete ctx.store.changes[prop];
  ctx.initialized.add(prop);
  ctx.options.onChange?.(ctx.store.changes, ctx.store.errors);
}
