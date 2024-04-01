import { assert, test } from 'vitest';
import { SchemaType, validate } from '../../lib/esm/schema';

test('validates "true"', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean }, true);
  assert(result.valid, 'should be valid');
});

test('validates "false"', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean }, false);
  assert(result.valid, 'should be valid');
});

test('fails on missing but required boolean', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean, required: true }, undefined);
  assert(!result.valid, 'should be invalid');
});

test('validates missing but optional boolean', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean }, undefined);
  assert(result.valid, 'should be valid');
});

test('fails on non-boolean value "true"', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean }, 'true');
  assert(!result.valid, 'should be invalid');
});

test('fails on non-boolean value "false"', () => {
  const result = validate<boolean>({ type: SchemaType.Boolean }, 'false');
  assert(!result.valid, 'should be invalid');
});
