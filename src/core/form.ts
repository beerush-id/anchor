import { type DetailedValidation, satisfy, Schema, SERIALIZABLE_SCHEMA_TYPES, validate } from '../schema/index.js';
import { crate, State } from './anchor.js';
import { type Readable, type Unsubscribe, writable } from './base.js';
import type { Sealed } from './seal.js';
import { clone } from '../utils/index.js';

export function deferredForm<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive?: R,
  strict?: boolean
): [State<T, R>, Readable<DetailedValidation<T>>, (key?: keyof T) => void, Unsubscribe] {
  const cloned = clone(init);

  satisfy(schema, cloned, recursive);

  const [validation] = writable({ valid: false, properties: {} } as DetailedValidation<Record<string, unknown>>);
  const [state] = crate(cloned, recursive, strict);

  const check = (key?: keyof T) => {
    const result = validate<Record<string, unknown>>(schema as never, state, SERIALIZABLE_SCHEMA_TYPES, recursive);

    if (typeof key === 'string') {
      validation.properties[key as string] = result.properties[key as string];
      validation.set({ valid: result.valid, error: result.error, errors: result.errors });
    } else {
      validation.set(result);
    }
  };

  const unsubscribe = state.subscribe((v, e) => {
    if (e.type === 'update') {
      for (const [key, value] of Object.entries(e.value as Record<string, string>)) {
        if (typeof value !== 'undefined' && value !== '' && validation.properties[key]) {
          check(key as keyof T);
        }
      }
    }
  }, false);

  return [state, validation as never, check, unsubscribe];
}

export function form<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive?: R,
  strict?: boolean
): [State<T, R>, Readable<DetailedValidation<T>>, Unsubscribe] {
  const [state, validation, check] = deferredForm(init, schema, recursive, strict);

  const destroy = state.subscribe((newState, e) => {
    if (e.type === 'update') {
      for (const [key, value] of Object.entries(e.value as Record<string, string>)) {
        if (typeof value !== 'undefined' && value !== '') {
          check(key as keyof T);
        }
      }
    }
  }, false);

  return [state, validation as never, destroy];
}
