import { entries } from '@beerush/utils';
import { ArraySchema, ObjectSchema, Schema, SchemaType } from './schema.js';

/**
 * Fills a schema with default values.
 * @param {Schema<T>} schema
 * @param value
 * @param recursive
 * @returns {T}
 */
export function satisfy<T>(schema: Schema<T>, value?: unknown, recursive = true): T {
  value = ensureDefined(schema, value);

  if (schema.type === SchemaType.Object && typeof value === 'object') {
    const selfSchema = schema as ObjectSchema<T>;

    if (typeof selfSchema.properties === 'object') {
      for (const [ key, child ] of entries(selfSchema.properties)) {
        const childValue = (value as T)[key as never];
        const childSchema = (typeof child === 'function' ? child() : { ...child }) as Schema<T>;

        if (childSchema.type) {
          const newValue = ensureDefined(childSchema, childValue);

          if (newValue !== childValue) {
            (value as T)[key as never] = newValue as never;
          }

          if (typeof newValue === 'object' && recursive) {
            satisfy(childSchema, newValue, recursive);
          }
        }
      }
    }
  } else if (schema.type === SchemaType.Array && Array.isArray(value)) {
    const selfSchema = schema as ArraySchema<T>;
    const childSchema = (typeof selfSchema.items === 'function' ? selfSchema.items() : { ...selfSchema }) as Schema<T>;

    value.forEach((item, i) => {
      const newValue = ensureDefined(childSchema, item);

      if (newValue !== item) {
        (value as T[])[i] = newValue;
      }

      if (typeof newValue === 'object' && recursive) {
        satisfy(childSchema, newValue, recursive);
      }
    });
  } else if (schema.type === SchemaType.Date && [ 'string', 'number' ].includes(typeof value)) {
    value = new Date(value as never);
  }

  return value as T;
}

export function ensureDefined<T>(schema: Schema<T>, value?: unknown): T {
  let sch = schema as ObjectSchema<T>;

  if (typeof sch === 'function') {
    sch = (sch as () => Schema<T>)() as never;
  }

  if (typeof value === 'undefined') {
    if (typeof sch.default === 'function') {
      value = sch.default();
    } else if (typeof sch.default !== 'undefined') {
      if (schema.type === SchemaType.Date) {
        value = new Date(sch.default);
      } else {
        value = sch.default;
      }
    }
  }

  return value as never;
}
