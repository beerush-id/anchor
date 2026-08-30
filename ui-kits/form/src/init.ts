import { untrack } from '@airlib/core';
import { type FormContext, toSchemaPath } from './context.js';
import type { AnyType } from './types.js';

/**
 * Initializes a field by walking from root to the target path.
 * For each segment: ensures the value exists in the source (filling defaults),
 * validates, determines changed against baseline, and registers in parent-children index.
 *
 * Single parse per field via builder.safeParse.
 */
export function initField(ctx: FormContext<AnyType>, prop: string, source: AnyType = ctx.props.value): void {
  if (!prop || ctx.initialized.has(prop)) return;

  const keys = prop.split('.');
  let curKey = '';
  let curSource = source;

  untrack(() => {
    for (const key of keys) {
      if (curSource == null || typeof curSource !== 'object') break;
      curKey = curKey ? `${curKey}.${key}` : key;

      if (ctx.initialized.has(curKey)) {
        curSource = curSource[key];
        continue;
      }

      const schema = ctx.schemas.get(toSchemaPath(curKey));
      if (!schema) break;

      if (typeof curSource[key] === 'undefined') {
        const result = schema.builder.safeParse(undefined);
        curSource[key] = result.data ?? (schema.type === 'array' ? [] : schema.type === 'object' ? {} : undefined);
      }

      const validation = schema.builder.safeParse(curSource[key]);

      if (validation.success) {
        ctx.errorKeys.delete(curKey);
        delete ctx.store.errors[curKey];
      } else if (schema.type !== 'object' && schema.type !== 'array') {
        ctx.store.errors[curKey] = validation.error.issues.map((issue) => issue.message);
        ctx.errorKeys.add(curKey);
      }

      registerChild(ctx, curKey);

      ctx.initialized.add(curKey);
      curSource = curSource[key];
    }
  });
}

/**
 * Detects whether a field is "changed" relative to the baseline.
 * Not in baseline (not given) → always changed (new data).
 * In baseline → compare current value against baseline value.
 */
export function detectChanged(ctx: FormContext<AnyType>, path: string, currentValue: AnyType): void {
  if (!ctx.baseline.has(path)) {
    ctx.changeKeys.add(path);
    ctx.store.changes[path] = currentValue;
  } else {
    const baselineValue = ctx.baseline.get(path);
    if (currentValue === baselineValue) {
      ctx.changeKeys.delete(path);
      delete ctx.store.changes[path];
    } else {
      ctx.changeKeys.add(path);
      ctx.store.changes[path] = currentValue;
    }
  }
}

/**
 * Registers a field path under every ancestor's children set.
 */
function registerChild(ctx: FormContext<AnyType>, path: string): void {
  const segments = path.split('.');
  if (segments.length < 2) return;

  let ancestor = '';
  for (let i = 0; i < segments.length - 1; i++) {
    ancestor = ancestor ? `${ancestor}.${segments[i]}` : segments[i];
    let children = ctx.fieldChildren.get(ancestor);
    if (!children) {
      children = new Set();
      ctx.fieldChildren.set(ancestor, children);
    }
    children.add(path);
  }
}
