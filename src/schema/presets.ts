import { isDateString, isFloat } from '../utils/index.js';
import { Schema, SchemaType } from './schema.js';

export const SchemaPresets = {
  Null: {
    type: SchemaType.Null,
    message: 'Invalid null value',
  } as Schema<null>,
  Bool: {
    type: SchemaType.Boolean,
    message: 'Invalid boolean value',
  } as Schema<boolean>,
  Arr: {
    type: SchemaType.Array,
    message: 'Invalid array value',
  } as Schema<unknown[]>,
  Set: {
    type: SchemaType.Set,
    message: 'Invalid set value',
  } as Schema<Set<unknown>>,
  Obj: {
    type: SchemaType.Object,
    message: 'Invalid object value',
  } as Schema<Record<string, unknown>>,
  Map: {
    type: SchemaType.Map,
    message: 'Invalid map value',
  } as Schema<Map<unknown, unknown>>,

  Str: {
    type: SchemaType.String,
    message: 'Invalid string value',
  } as Schema<string>,

  StrURL: {
    type: SchemaType.String,
    message: 'Invalid URL format',
    minLength: 5,
    maxLength: 255,
    validate: (value) => {
      return {
        valid: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value),
        expected: 'URL',
      };
    },
  } as Schema<string>,

  Email: {
    type: SchemaType.String,
    message: 'Invalid email address',
    minLength: 5,
    maxLength: 255,
    validate: (value) => {
      return {
        valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        expected: 'email address',
      };
    },
  } as Schema<string>,
  Password: {
    type: SchemaType.String,
    message:
      'Password must be at least 8 characters, contain at least 1 uppercase letter, 1 number, and 1 special character.',
    minLength: 8,
    maxLength: 255,
    validate: (value) => {
      return {
        valid: /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(value),
        expected: 'password',
      };
    },
  } as Schema<string>,

  Int: {
    type: SchemaType.Number,
    message: 'Invalid integer number',
    validate: (value) => {
      return {
        valid: Number.isInteger(value),
        expected: 'integer',
      };
    },
  } as Schema<number>,
  IntSafe: {
    type: SchemaType.Number,
    message: 'Invalid safe integer number',
    validate: (value) => {
      return {
        valid: Number.isSafeInteger(value),
        expected: 'safe integer',
      };
    },
  } as Schema<number>,
  Float: {
    type: SchemaType.Number,
    message: 'Invalid float number',
    validate: (value) => {
      return {
        valid: isFloat(value),
        expected: 'float',
      };
    },
  } as Schema<number>,

  Date: {
    type: SchemaType.Date,
    message: 'Invalid date value',
  } as Schema<Date>,
  DateStr: {
    type: SchemaType.String,
    message: 'Invalid date string format',
    validate: (value) => {
      return {
        valid: !isDateString(value),
        expected: 'date-string',
      };
    },
  } as Schema<string>,
  DateFuture: {
    type: SchemaType.Date,
    message: 'Invalid future date',
    minDate: new Date(),
  } as Schema<Date>,
  DatePast: {
    type: SchemaType.Date,
    message: 'Invalid past date',
    maxDate: new Date(),
  } as Schema<Date>,
};
