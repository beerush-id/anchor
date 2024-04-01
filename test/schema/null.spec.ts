import { assert, test } from 'vitest';
import { SchemaType, validate } from '../../lib/esm/schema';

test('validates provided null', () => {
  const schema = { type: SchemaType.Null };
  const value = null;
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on missing but required null', () => {
  const schema = { type: SchemaType.Null, required: true };
  const value = undefined;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates missing but optional null', () => {
  const schema = { type: SchemaType.Null };
  const value = undefined;
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on provided non-null', () => {
  const schema = { type: SchemaType.Null };
  const value = 0;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on provided non-null and required', () => {
  const schema = { type: SchemaType.Null, required: true };
  const value = 0;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on provided non-null and optional', () => {
  const schema = { type: SchemaType.Null };
  const value = 0;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});
