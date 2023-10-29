import { Anchor, crate, Init, Pointer, State } from './anchor.js';
import { Schema } from '../schema/index.js';

export function flareKit<T extends Init, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true,
): Anchor<T, R> {
  return crate<T, R>(init, recursive, strict, schema as never);
}

export function flare<T extends Init, R extends boolean = true>(
  init: T,
  schema: Schema<T>,
  recursive: R = true as R,
  strict = true,
): State<T, R> {
  const instance = crate<T, R>(init, recursive, strict, schema as never);
  return instance[Pointer.STATE];
}
