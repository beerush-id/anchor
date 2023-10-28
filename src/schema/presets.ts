import { isDateString, isFloat } from '../utils/index.js';
import { Schema, SchemaType } from './schema.js';

export const SchemaPresets = {
  Null: { type: SchemaType.Null } as Schema<null>,
  Bool: { type: SchemaType.Boolean } as Schema<boolean>,
  Arr: { type: SchemaType.Array } as Schema<unknown[]>,
  Set: { type: SchemaType.Set } as Schema<Set<unknown>>,
  Obj: { type: SchemaType.Object } as Schema<Record<string, unknown>>,
  Map: { type: SchemaType.Map } as Schema<Map<unknown, unknown>>,

  Str: { type: SchemaType.String } as Schema<string>,
  StrURL: {
    type: SchemaType.String,
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
    minLength: 8,
    maxLength: 255,
    validate: (value) => {
      return {
        valid: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value),
        expected: 'password',
      };
    },
  } as Schema<string>,

  Int: {
    type: SchemaType.Number,
    validate: (value) => {
      return {
        valid: Number.isInteger(value),
        expected: 'integer',
      };
    },
  } as Schema<number>,
  IntSafe: {
    type: SchemaType.Number,
    validate: (value) => {
      return {
        valid: Number.isSafeInteger(value),
        expected: 'safe integer',
      };
    },
  } as Schema<number>,
  Float: {
    type: SchemaType.Number,
    validate: (value) => {
      return {
        valid: isFloat(value),
        expected: 'float',
      };
    },
  } as Schema<number>,

  Date: { type: SchemaType.Date } as Schema<Date>,
  DateStr: {
    type: SchemaType.String,
    validate: (value) => {
      return {
        valid: !isDateString(value),
        expected: 'date-string',
      };
    },
  } as Schema<string>,
  DateFuture: { type: SchemaType.Date, minDate: new Date() } as Schema<Date>,
  DatePast: { type: SchemaType.Date, maxDate: new Date() } as Schema<Date>,
};
