import { Anchor, crate, Pointer, State } from './anchor.js';
import { Schema, SERIALIZABLE_SCHEMA_TYPES } from '../schema/index.js';

type SerializablePrimitive = string | number | boolean | null | Date;
type SerializableValue = SerializablePrimitive | SerializableObject | SerializableArray;
type SerializableObject = { [property: string]: SerializableValue };
type SerializableArray = SerializableValue[];

export type Sealed = SerializableObject | SerializableArray;

export function sealKit<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true
): Anchor<T, R> {
  return crate(init, recursive, strict, schema as never, SERIALIZABLE_SCHEMA_TYPES);
}

export function seal<T extends Sealed, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true
): State<T, R> {
  const instance = crate(init, recursive, strict, schema as never, SERIALIZABLE_SCHEMA_TYPES);
  return instance[Pointer.STATE];
}
