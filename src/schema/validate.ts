import { entries, typeOf } from '../utils/index.js';
import {
  ArraySchema,
  BaseSchema,
  COMMON_SCHEMA_TYPES,
  CustomSchema,
  DateSchema,
  DetailedValidation,
  flattenSchema,
  MapSchema,
  NumberSchema,
  ObjectSchema,
  ObjectValidation,
  Schema,
  SchemaErrorKey,
  SchemaErrorType,
  SchemaType,
  SchemaTypeError,
  SchemaValidation,
  SchemaValueError,
  StringSchema,
} from './schema.js';

/**
 * Validates a value against a schema.
 * @param {Schema<T>} schema
 * @param value
 * @param recursive
 * @param {string} path
 * @param {SchemaType[]} allowTypes
 * @param root
 * @returns {DetailedValidation<T>}
 */
export function validate<T>(
  schema: Schema<T>,
  value: unknown,
  allowTypes = COMMON_SCHEMA_TYPES,
  recursive = true,
  path?: string,
  root = true,
): DetailedValidation<T> {
  const base = schema as BaseSchema<T> & CustomSchema<T>;

  if (
    (typeof base.type === 'string' && !allowTypes.includes(base.type)) ||
    (Array.isArray(base.type) && !base.type.every(t => COMMON_SCHEMA_TYPES.includes(t)))
  ) {
    throw new TypeError(`Schema type "${ base.type }" is not allowed.`);
  }

  const result: SchemaValidation = { errors: [], valid: false };

  if (Array.isArray(base.type)) {
    const invalids = base.type
      .map(t => validate({ ...base, type: t } as never, value, allowTypes, recursive, path, false))
      .filter(r => !r.valid);
    const invalidTypes = invalids
      .flatMap(r => r.errors.filter(e => e.type === SchemaErrorType.Type as never));
    const invalidValues = invalids
      .flatMap(r => r.errors.filter(e => e.type === SchemaErrorType.Value as never));

    if (invalidTypes.length === base.type.length) {
      result.errors.push(err(SchemaErrorType.Type, base.type, typeOf(value), path) as never);
    }

    if (invalidValues.length === base.type.length) {
      result.errors.push(...invalidValues);
    }
  } else {
    if (base.type === SchemaType.Object || base.type === SchemaType.Map) {
      const sch = base as ObjectSchema<T>;
      const actual = typeOf(value);
      const objResult = result as never as DetailedValidation<object>;

      if ((base.required && actual === 'undefined') || (actual !== 'undefined' && actual !== base.type)) {
        result.errors.push(err(SchemaErrorType.Type, base.type, actual, path) as never);
      }

      if (Array.isArray(sch.required) && base.type !== SchemaType.Map) {
        if (typeof sch.properties !== 'object') {
          result.errors.push(err(SchemaErrorType.Type, 'schema properties', sch.properties, path) as never);
        }

        for (const key of sch.required) {
          if (!sch.properties?.[key]) {
            result.errors.push(err(
              SchemaErrorType.Type,
              `schema property: ${ key as string }`,
              sch.properties?.[key],
              key as string,
              path ? `${ path }.${ key as string }` : key as string,
            ) as never);
          }

          if (typeof value?.[key as never] === 'undefined') {
            result.errors.push(err(
              SchemaErrorType.Value,
              `defined property: ${ key as string }`,
              value?.[key as never],
              key as string,
              path ? `${ path }.${ key as string }` : key as string,
            ) as never);
          }
        }
      }

      if (value instanceof Map) {
        for (const [ key, val ] of value) {
          const childPath = path ? `${ path }.${ key as string }` : key as string;
          const keySchema = flattenSchema((schema as MapSchema<string, string>).keys as never);
          const valueSchema = flattenSchema((schema as MapSchema<string, string>).items as never);

          if (keySchema) {
            const keyResult = validate(keySchema, key, allowTypes, recursive, childPath, false);
            if (!keyResult.valid) {
              result.errors.push(...keyResult.errors);
            }
          }

          if (valueSchema) {
            const valueResult = validate(valueSchema, val, allowTypes, recursive, childPath, false);
            if (!valueResult.valid) {
              result.errors.push(...valueResult.errors);
            }
          }
        }
      }

      if (typeof sch.properties === 'object' && base.type !== SchemaType.Map) {
        objResult.properties = {} as never;

        for (const [ k, child ] of entries(sch.properties)) {
          const childPath = path ? `${ path }.${ k as string }` : k;
          const childValue = value instanceof Map ? value.get(k) : (value as T)?.[k as never];
          const childSchema = (typeof child === 'function' ? child() : { ...child }) as Schema<T>;
          const childResult = validate(childSchema, childValue, allowTypes, recursive, childPath as string, false);

          if (!objResult.properties[k as never]) {
            objResult.properties[k as never] = { __valid: false, __errors: [] } as never;
          }

          if (typeof (childResult as ObjectValidation<T>).properties === 'object') {
            Object.assign(objResult.properties[k as never], (childResult as ObjectValidation<T>).properties);
          }

          if (!childResult.valid) {
            result.errors.push(...childResult.errors);
          }
        }
      }

      if (typeof value === 'object' && base.type !== SchemaType.Map) {
        for (const [ k, v ] of value instanceof Map ? value : entries(value as object)) {
          const childPath = path ? `${ path }.${ k }` : k;
          let childSchema = sch.properties?.[k as never];

          if (typeof childSchema === 'function') {
            childSchema = (childSchema as () => Schema<never>)();
          }

          if (!childSchema && !sch.additionalProperties) {
            result.errors.push(err(SchemaErrorType.Type, `no property: ${ k }`, v, k, childPath) as never);
          }
        }
      }
    } else if (base.type === SchemaType.Array || base.type === SchemaType.Set) {
      const actual = typeOf(value);
      const r = result as DetailedValidation<unknown[]>;

      r.items = [] as never;

      if ((base.required && actual === 'undefined') || (actual !== 'undefined' && actual !== base.type)) {
        result.errors.push(err(SchemaErrorType.Type, base.type, actual, path) as never);
      }

      if (Array.isArray(value) || value instanceof Set) {
        const sch = base as ArraySchema<T>;
        let childSchema = sch.items as Schema<T>;

        if (typeof childSchema === 'function') {
          childSchema = (childSchema as () => Schema<never>)();
        }

        const results = (value instanceof Set ? Array.from(value) : value).map((item, i) => {
          const childPath = path ? `${ path }.${ i }` : `${ i }`;
          const childResult = validate(childSchema as Schema<never>, item, allowTypes, recursive, childPath, false);

          r.items[i as never] = { __valid: childResult.valid, __errors: childResult.errors } as never;

          if (childSchema.type === SchemaType.Object) {
            Object.assign(r.items[i as never], (childResult as never as ObjectValidation<unknown>).properties);
          }

          return childResult;
        });
        const invalidTypes = results
          .filter(r => !r.valid)
          .flatMap(r => r.errors.filter(e => e.type === SchemaErrorType.Type as never));
        const invalidValues = results
          .filter(r => !r.valid)
          .flatMap(r => r.errors.filter(e => e.type === SchemaErrorType.Value as never));

        if (invalidTypes.length && !sch.additionalItems) {
          result.errors.push(...invalidTypes);
        }

        if (invalidValues.length) {
          result.errors.push(...invalidValues);
        }
      }
    } else if (base.type !== SchemaType.Custom) {
      let actual = typeOf(value);

      if (typeof value === 'number' && isNaN(value as never)) {
        actual = 'NaN' as never;
      }

      if (typeof value === 'number' && value === Infinity) {
        actual = 'infinity' as never;
      }

      if (typeof value === 'number' && value === -Infinity) {
        actual = '-infinity' as never;
      }

      if ((base.required && actual === 'undefined') || (actual !== 'undefined' && actual !== base.type)) {
        result.errors.push(err(SchemaErrorType.Type, base.type, actual, undefined, path) as never);
      }

      if (base.type === SchemaType.Number && typeof value === 'number') {
        const s = base as NumberSchema;
        const v = value as number;

        if (s.enum && !s.enum.includes(v)) {
          result.errors.push(err(SchemaErrorType.Value, s.enum, v, SchemaErrorKey.Minimum));
        }

        if (s.minimum !== undefined && v < s.minimum) {
          result.errors.push(err(SchemaErrorType.Value, s.minimum, v, SchemaErrorKey.Minimum));
        }

        if (s.maximum !== undefined && v > s.maximum) {
          result.errors.push(err(SchemaErrorType.Value, s.maximum, v, SchemaErrorKey.Maximum));
        }
      }

      if (base.type === SchemaType.String && typeof value === 'string') {
        const s = base as StringSchema;
        const v = value as string;

        if (s.strict && !v.trim()) {
          result.errors.push(err(SchemaErrorType.Value, 'non-empty string', v, path) as never);
        }

        if (s.enum && !s.enum.includes(v)) {
          result.errors.push(err(SchemaErrorType.Value, s.enum, v, SchemaErrorKey.Minimum));
        }

        if (s.minLength !== undefined && v.length < s.minLength) {
          result.errors.push(err(SchemaErrorType.Value, s.minLength, v.length, SchemaErrorKey.MinLength));
        }

        if (s.maxLength !== undefined && v.length > s.maxLength) {
          result.errors.push(err(SchemaErrorType.Value, s.maxLength, v.length, SchemaErrorKey.MaxLength));
        }
      }

      if (base.type === SchemaType.Date && value instanceof Date) {
        const s = base as DateSchema;
        const v = value as Date;

        if (s.minDate && v < s.minDate) {
          result.errors.push(err(SchemaErrorType.Value, s.minDate, v, SchemaErrorKey.Minimum));
        }

        if (s.maxDate && v > s.maxDate) {
          result.errors.push(err(SchemaErrorType.Value, s.maxDate, v, SchemaErrorKey.Maximum));
        }
      }
    }
  }

  if (base.type === SchemaType.Custom && base.required && typeof base.validate !== 'function') {
    result.errors.push(err(SchemaErrorType.Type, 'validate function', base.validate, undefined, path) as never);
  }

  if (typeof base.validate === 'function') {
    const selfValidation = base.validate(value as T);

    if (!selfValidation.valid) {
      result.errors.push(err(SchemaErrorType.Value, selfValidation.expected, value, undefined, path) as never);
    }
  }

  result.valid = !result.errors.length;

  if (!result.valid && root) {
    result.error = new Error('Invalid value.');
  }

  return result as never;
}

function err<T extends SchemaErrorType>(
  type: T,
  expected: unknown,
  actual: unknown,
  key?: string,
  path?: string,
): T extends SchemaErrorType.Type ? SchemaTypeError : SchemaValueError {
  let expectedText = expected;

  if (Array.isArray(expectedText)) {
    expectedText = `[ ${ expectedText.join(', ') } ]`;
  } else if (typeof expectedText === 'object') {
    expectedText = JSON.stringify(expectedText);
  }

  const message = `Expected "${ expectedText }" but got "${ actual }".`;
  const result = { type } as never;

  if (typeof key === 'string') {
    Object.assign(result, { key });
  }

  if (typeof path === 'string') {
    Object.assign(result, { path });
  }

  Object.assign(result, { expected, actual, message });

  return result;
}
