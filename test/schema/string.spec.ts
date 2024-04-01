import { assert, test } from 'vitest';
import { satisfy, Schema, SchemaType, validate } from '../../lib/esm/schema';

test('validates provided string', () => {
  const schema = { type: SchemaType.String };
  const value = 'Example';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on missing but required string', () => {
  const schema = { type: SchemaType.String, required: true };
  const value = undefined;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates missing but optional string', () => {
  const schema = { type: SchemaType.String };
  const value = undefined;
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('validates if meets minLength', () => {
  const schema = { type: SchemaType.String, minLength: 5 };
  const value = 'ABCDE';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if is under minLength', () => {
  const schema = { type: SchemaType.String, minLength: 5 };
  const value = 'ABCD';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates if meets maxLength', () => {
  const schema = { type: SchemaType.String, maxLength: 5 };
  const value = 'ABCDE';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if exceeds maxLength', () => {
  const schema = { type: SchemaType.String, maxLength: 5 };
  const value = 'ABCDEF';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates string within length constraints and required', () => {
  const schema = { type: SchemaType.String, required: true, minLength: 5, maxLength: 10 };
  const value = 'Example';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails string under minLength and required', () => {
  const schema = { type: SchemaType.String, required: true, minLength: 5, maxLength: 10 };
  const value = 'Exa';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails string exceeds maxLength and required', () => {
  const schema = { type: SchemaType.String, required: true, minLength: 5, maxLength: 10 };
  const value = 'Example Example';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on missing but required string with length constraints', () => {
  const schema = { type: SchemaType.String, required: true, minLength: 5, maxLength: 10 };
  const value = undefined;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates empty string for optional field', () => {
  const schema = { type: SchemaType.String };
  const value = '';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('validates empty string for required field', () => {
  const schema = { type: SchemaType.String, required: true };
  const value = '';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating empty string for required field with strict option', () => {
  const schema = { type: SchemaType.String, required: true, strict: true };
  const value = '';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates non-empty string for required field with strict option', () => {
  const schema = { type: SchemaType.String, required: true, strict: true };
  const value = 'notEmpty';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});
test('validates string in enum', () => {
  const schema = { type: SchemaType.String, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = 'Banana';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails if string not in enum', () => {
  const schema = { type: SchemaType.String, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = 'Pear';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates empty string in enum', () => {
  const schema = { type: SchemaType.String, enum: [ 'Apple', 'Banana', 'Cherry', '' ] };
  const value = '';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating empty string against enum without empty string', () => {
  const schema = { type: SchemaType.String, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = '';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates omitted string in enum', () => {
  const schema = { type: SchemaType.String, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = undefined;
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating empty string under strict', () => {
  const schema = { type: SchemaType.String, strict: true };
  const value = '';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates non-empty string under strict', () => {
  const schema = { type: SchemaType.String, strict: true };
  const value = 'notEmpty';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating empty string under strict with enum', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = '';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates non-empty string under strict with enum', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = 'Banana';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating string under strict with enum', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry' ] };
  const value = 'Pear';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails validating empty string under strict with enum and empty string', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry', '' ] };
  const value = '';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates non-empty string under strict with enum and empty string', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry', '' ] };
  const value = 'Banana';
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails validating string under strict with enum and empty string', () => {
  const schema = { type: SchemaType.String, strict: true, enum: [ 'Apple', 'Banana', 'Cherry', '' ] };
  const value = 'Pear';
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates string with default value', () => {
  const schema = { type: SchemaType.String, default: 'Example' } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('validates string with default value and enum', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    enum: [
      'Example',
      'Another Example',
    ],
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('validates string with default value and minLength', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    minLength: 5,
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('validates string with default value and maxLength', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    maxLength: 10,
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('validates string with default value and minLength and maxLength', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    minLength: 5,
    maxLength: 10,
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('validates string with default value and minLength and maxLength and enum', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    minLength: 5,
    maxLength: 10,
    enum: [
      'Example',
      'Another Example',
    ],
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(result.valid, 'Expected default value to be set and valid');
});

test('fails validating string with default value and minLength and maxLength and enum', () => {
  const schema = {
    type: SchemaType.String,
    default: 'Example',
    minLength: 5,
    maxLength: 10,
    enum: [
      'Another Example',
    ],
  } as Schema<string>;
  const value = satisfy(schema, undefined);
  assert(value === 'Example', 'Expected default value to be set');

  const result = validate(schema, value);
  assert(!result.valid, 'Expected default value to be set and valid');
});
