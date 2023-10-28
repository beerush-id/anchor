import {
  ArraySchema,
  DateSchema,
  flattenSchema,
  NumberSchema,
  ObjectSchema,
  Schema,
  SchemaType,
  SetSchema,
  StringSchema,
} from './schema.js';
import { fillDefault } from './satisfy.js';

export function createPlaceholder<T>(schema: Schema<T>, value?: unknown, length = 0, recursive = true): T {
  value = fillDefault(schema, value);

  if (schema.type === SchemaType.Object) {
    const sch = schema as ObjectSchema<object>;

    if (typeof value !== 'object') {
      value = {};
    }

    const val = value as object;
    for (const [ key, child ] of Object.entries(sch.properties || {})) {
      const valueSchema = flattenSchema<object>(child);
      let childValue = val[key as never];

      if (typeof childValue === 'undefined' && valueSchema) {
        childValue = createPlaceholder(valueSchema, undefined, length, recursive) as never;
      }

      if (recursive && typeof childValue === 'object') {
        createPlaceholder(valueSchema, childValue, length, recursive);
      }

      val[key as never] = childValue;
    }
  } else if (schema.type === SchemaType.Array) {
    const sch = schema as ArraySchema<T>;
    const itemSchema = flattenSchema(sch.items as never);

    if (!Array.isArray(value)) {
      value = [];
    }

    if (!(value as unknown[]).length && length) {
      value = createArray(itemSchema, length, recursive);
    }

    if (itemSchema && recursive) {
      (value as T[]).forEach((item) => {
        createPlaceholder(itemSchema, item, length, recursive);
      });
    }
  } else if (schema.type === SchemaType.Set) {
    const sch = schema as SetSchema<T>;
    const itemSchema = flattenSchema(sch.items as never);

    if (!(value instanceof Set)) {
      value = new Set();
    }

    if (!(value as Set<unknown>).size && length) {
      value = createSet(itemSchema, length, recursive);
    }

    if (itemSchema && recursive) {
      for (const item of value as Set<unknown>) {
        if (typeof item === 'object') {
          createPlaceholder(itemSchema, item, length, recursive);
        }
      }
    }
  } else if (schema.type === SchemaType.String && typeof value !== 'string') {
    const sch = schema as StringSchema;
    value = createString(sch.minLength, sch.maxLength);
  } else if (schema.type === SchemaType.Number && typeof value !== 'number') {
    const sch = schema as NumberSchema;
    value = createNumber(sch.minimum, sch.maximum);
  } else if (schema.type === SchemaType.Boolean && typeof value !== 'boolean') {
    value = createBoolean();
  } else if (schema.type === SchemaType.Date && !(value instanceof Date)) {
    const sch = schema as DateSchema;
    value = createDate(sch.minDate, sch.maxDate);
  } else if (schema.type === SchemaType.Null && value !== null) {
    value = createNull();
  }

  return value as T;
}

function createString(minLength = 0, maxLength = 0): string {
  const length = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
  let result = '';

  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
  }

  return result;
}

function createNumber(min = 0, max = 0): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

function createBoolean(): boolean {
  return Math.random() < 0.5;
}

function createDate(minDate?: Date, maxDate?: Date): Date {
  if (minDate && maxDate) {
    return new Date(minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime()));
  } else if (minDate) {
    return new Date(minDate.getTime() + Math.random() * (Date.now() - minDate.getTime()));
  } else if (maxDate) {
    return new Date(Date.now() - Math.random() * (Date.now() - maxDate.getTime()));
  }

  return new Date();
}

function createNull(): null {
  return null;
}

function createArray<T>(schema: Schema<T>, length = 0, recursive = true): T[] {
  const result = [];

  for (let i = 0; i < length; i++) {
    result.push(createPlaceholder(schema, undefined, length, recursive));
  }

  return result;
}

function createSet<T>(schema: Schema<T>, length = 0, recursive = true): Set<T> {
  const result = new Set<T>();

  for (let i = 0; i < length; i++) {
    result.add(createPlaceholder(schema, undefined, length, recursive));
  }

  return result;
}
