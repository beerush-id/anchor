import type { ZodArray, ZodObject } from 'zod';
import type { AnyType, SchemaMap } from './types.js';

export function flattenSchemas(schema: ZodObject | ZodArray, store = new Map<string, SchemaMap>(), path: string = '') {
  const process = (builder: AnyType, nextPath: string) => {
    let shape = builder;
    let required = !Object.hasOwn(builder, 'optional');
    while (shape.def?.innerType || shape.def?.schema || shape.def?.in) {
      shape = shape.def.innerType ?? shape.def.schema ?? shape.def.in;
      if (Object.hasOwn(shape, 'optional')) required = false;
    }

    store.set(nextPath, { type: shape.type, shape, builder, required });

    if (shape.type === 'object' || shape.type === 'array') {
      flattenSchemas(shape, store, nextPath);
    }
  };

  /* istanbul ignore else */
  if ('shape' in schema) {
    for (const [key, builder] of Object.entries((schema as ZodObject).shape)) {
      process(builder, path ? `${path}.${key}` : key);
    }
  } else if ('unwrap' in schema) {
    process((schema as AnyType).unwrap(), path ? `${path}.$` : '$');
  }

  return store;
}
