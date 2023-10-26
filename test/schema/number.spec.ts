import { assert, test } from 'vitest';
import { satisfySchema, SchemaType, validateSchema } from '../../lib/esm';
import { NumberSchema } from '../../lib/esm/schema';

test('validates provided number', () => {
  const schema = { type: SchemaType.Number };
  const value = 123;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on missing but required number', () => {
  const schema = { type: SchemaType.Number, required: true };
  const value = undefined;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates missing but optional number', () => {
  const schema = { type: SchemaType.Number };
  const value = undefined;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('validates if meets minimum value', () => {
  const schema = { type: SchemaType.Number, minimum: 10 };
  const value = 10;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if is below minimum value', () => {
  const schema = { type: SchemaType.Number, minimum: 10 };
  const value = 9;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates if meets maximum value', () => {
  const schema = { type: SchemaType.Number, maximum: 10 };
  const value = 10;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if exceeds maximum value', () => {
  const schema = { type: SchemaType.Number, maximum: 10 };
  const value = 11;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number within min and max constraints', () => {
  const schema = { type: SchemaType.Number, required: true, minimum: 10, maximum: 20 };
  const value = 15;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails number below minimum and required', () => {
  const schema = { type: SchemaType.Number, required: true, minimum: 10, maximum: 20 };
  const value = 5;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails number exceeding maximum and required', () => {
  const schema = { type: SchemaType.Number, required: true, minimum: 10, maximum: 20 };
  const value = 25;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on missing but required number with min and max', () => {
  const schema = { type: SchemaType.Number, required: true, minimum: 10, maximum: 20 };
  const value = undefined;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number in enum', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ] };
  const value = 2;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if number not in enum', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ] };
  const value = 4;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number in enum with min and max', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ], minimum: 1, maximum: 3 };
  const value = 2;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if number not in enum with min and max', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ], minimum: 1, maximum: 3 };
  const value = 4;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number in enum with min and max and required', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ], minimum: 1, maximum: 3, required: true };
  const value = 2;
  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if number not in enum with min and max and required', () => {
  const schema = { type: SchemaType.Number, enum: [ 1, 2, 3 ], minimum: 1, maximum: 3, required: true };
  const value = 4;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails if number is NaN', () => {
  const schema = { type: SchemaType.Number };
  const value = NaN;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails if number is Infinity', () => {
  const schema = { type: SchemaType.Number };
  const value = Infinity;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails if number is -Infinity', () => {
  const schema = { type: SchemaType.Number };
  const value = -Infinity;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails if number is not finite', () => {
  const schema = { type: SchemaType.Number };
  const value = Number.NaN;
  const result = validateSchema(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number with default value', () => {
  const schema = { type: SchemaType.Number, default: 123 } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and required', () => {
  const schema = { type: SchemaType.Number, default: 123, required: true } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and min and max', () => {
  const schema = { type: SchemaType.Number, default: 123, minimum: 100, maximum: 200 } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and min and max and required', () => {
  const schema = { type: SchemaType.Number, default: 123, minimum: 100, maximum: 200, required: true } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and enum', () => {
  const schema = { type: SchemaType.Number, default: 123, enum: [ 123, 456, 789 ] } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and enum and required', () => {
  const schema = { type: SchemaType.Number, default: 123, enum: [ 123, 456, 789 ], required: true } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and enum and min and max', () => {
  const schema = {
    type: SchemaType.Number,
    default: 123,
    enum: [ 123, 456, 789 ],
    minimum: 100,
    maximum: 200,
  } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});

test('validates number with default value and enum and min and max and required', () => {
  const schema = {
    type: SchemaType.Number,
    default: 123,
    enum: [ 123, 456, 789 ],
    minimum: 100,
    maximum: 200,
    required: true,
  } as NumberSchema;
  const value = satisfySchema(schema);
  assert(value === 123, 'Expected default value to be set');

  const result = validateSchema(schema, value);
  assert(result.valid, 'Expected validation to be set and valid');
});
