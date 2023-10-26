import { Anchor, crate, Pointer, Sail } from './anchor.js';
import { Schema, SERIALIZABLE_SCHEMA_TYPES } from '../schema/index.js';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = { [property: string]: JsonValue };
type JsonArray = JsonValue[];

export type Sealed = JsonObject | JsonObject[];

export function sealKit<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true,
): Anchor<T, R> {
  return crate(init, recursive, strict, schema as never, SERIALIZABLE_SCHEMA_TYPES);
}

export function seal<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true,
): Sail<T, R> {
  const instance = crate(init, recursive, strict, schema as never, SERIALIZABLE_SCHEMA_TYPES);
  return instance[Pointer.STATE];
}
