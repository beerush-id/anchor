import { assert, test } from 'vitest';
import { satisfySchema, Schema, SchemaType, validateSchema } from '../../lib/esm';
import { DateSchema } from '../../lib/esm/schema';

test('validates provided date', () => {
  const schema = { type: SchemaType.Date };
  const value = new Date();
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on missing but required date', () => {
  const schema = { type: SchemaType.Date, required: true };
  const value = undefined;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates missing but optional date', () => {
  const schema = { type: SchemaType.Date };
  const value = undefined;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('validates if meets minDate', () => {
  const schema = { type: SchemaType.Date, minDate: new Date(2020, 0, 1) };
  const value = new Date(2020, 0, 1);
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if is under minDate', () => {
  const schema = { type: SchemaType.Date, minDate: new Date(2020, 0, 1) };
  const value = new Date(2019, 11, 31);
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates if meets maxDate', () => {
  const schema = { type: SchemaType.Date, maxDate: new Date(2020, 0, 1) };
  const value = new Date(2020, 0, 1);
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if exceeds maxDate', () => {
  const schema = { type: SchemaType.Date, maxDate: new Date(2020, 0, 1) };
  const value = new Date(2020, 0, 2);
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates date within date constraints and required', () => {
  const schema = {
    type: SchemaType.Date, required: true, minDate: new Date(2020, 0, 1), maxDate: new Date(
      2020,
      11,
      31,
    ),
  };
  const value = new Date(2020, 0, 1);
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails date under minDate and required', () => {
  const schema = {
    type: SchemaType.Date, required: true, minDate: new Date(2020, 0, 1), maxDate: new Date(
      2020,
      11,
      31,
    ),
  };
  const value = new Date(2019, 11, 31);
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails date over maxDate and required', () => {
  const schema = {
    type: SchemaType.Date, required: true, minDate: new Date(2020, 0, 1), maxDate: new Date(
      2020,
      11,
      31,
    ),
  };
  const value = new Date(2021, 0, 1);
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date', () => {
  const schema = { type: SchemaType.Date };
  const value = 'Example';
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date string', () => {
  const schema = { type: SchemaType.Date };
  const value = '2020-01-01';
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date number', () => {
  const schema = { type: SchemaType.Date };
  const value = 20200101;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date object', () => {
  const schema = { type: SchemaType.Date };
  const value = { year: 2020, month: 1, day: 1 };
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date array', () => {
  const schema = { type: SchemaType.Date };
  const value = [ 2020, 1, 1 ];
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date boolean', () => {
  const schema = { type: SchemaType.Date };
  const value = true;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid date null', () => {
  const schema = { type: SchemaType.Date };
  const value = null;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates date width default value function', () => {
  const schema = { type: SchemaType.Date, default: () => new Date() };
  const value = satisfySchema(schema);
  assert(value instanceof Date, 'Expected value to be a date');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected value to be set and valid');
});

test('validates date width default value string', () => {
  const schema = { type: SchemaType.Date, default: '2020-01-01' };
  const value = satisfySchema(schema as Schema<Date>);
  assert(value instanceof Date, 'Expected value to be a date');

  const result = validateSchema(schema as Schema<Date>, value);
  assert(result.valid, 'Expected value to be set and valid');
});

test('validates date width default value number', () => {
  const schema = { type: SchemaType.Date, default: 20200101 } as DateSchema;
  const value = satisfySchema(schema as Schema<Date>);
  assert(value instanceof Date, 'Expected value to be a date');

  const result = validateSchema(schema as Schema<Date>, value);
  assert(result.valid, 'Expected value to be set and valid');
});
