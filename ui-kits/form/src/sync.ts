import type { StateChange } from '@airlib/core';
import { ARRAY_MUTATIONS } from '@airlib/core';
import type { FormContext } from './context.js';
import { detectChanged, initField } from './init.js';
import type { AnyType } from './types.js';
import { readPath } from './utils.js';
import { setter, wipeChildren } from './write.js';

const ArrayMutations = new Set(ARRAY_MUTATIONS);

/**
 * Synchronizes external source mutations into the form's tracking state.
 * Primitives route through setter. Array mutations wipe + re-validate.
 */
export function synchronize(ctx: FormContext<AnyType>, _: AnyType, event: StateChange): void {
  if (event.type === 'init' || ctx.locked) return;

  const prop = event.keys.join('.');

  if (ArrayMutations.has(event.type as AnyType)) {
    ctx.changeKeys.add(prop);
    syncArray(ctx, prop);
  } else {
    syncPrimitive(ctx, prop, event.value);
  }
}

/**
 * External primitive change — validate without marking touched.
 */
function syncPrimitive(ctx: FormContext<AnyType>, prop: string, value: AnyType): void {
  initField(ctx, prop);
  setter(ctx, prop, value);
}

/**
 * Array structural mutation — wipe children, re-validate from actual data.
 * Arrays are expensive; correctness over cleverness.
 */
function syncArray(ctx: FormContext<AnyType>, arrayPath: string): void {
  wipeChildren(ctx, arrayPath);

  const array = readPath(ctx.props.value, arrayPath) as unknown[];
  if (!Array.isArray(array)) return;

  for (let i = 0; i < array.length; i++) {
    revalidateElement(ctx, `${arrayPath}.${i}`, array[i]);
  }

  ctx.options.onChange?.(ctx.store.changes, ctx.store.errors);
}

/**
 * Re-validates an array element and its children recursively.
 */
function revalidateElement(ctx: FormContext<AnyType>, elementPath: string, value: AnyType): void {
  initField(ctx, elementPath);
  detectChanged(ctx, elementPath, value);

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    for (const key of Object.keys(value)) {
      const childPath = `${elementPath}.${key}`;
      revalidateElement(ctx, childPath, value[key]);
    }
  }
}
