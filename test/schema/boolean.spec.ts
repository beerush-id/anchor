import { assert, test } from 'vitest';
import { SchemaType, validateSchema } from '../../lib/esm';

test('validates "true"', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean }, true);
  assert(result.valid, 'should be valid');
});

test('validates "false"', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean }, false);
  assert(result.valid, 'should be valid');
});

test('fails on missing but required boolean', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean, required: true }, undefined);
  assert(!result.valid, 'should be invalid');
});

test('validates missing but optional boolean', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean }, undefined);
  assert(result.valid, 'should be valid');
});

test('fails on non-boolean value "true"', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean }, 'true');
  assert(!result.valid, 'should be invalid');
});

test('fails on non-boolean value "false"', () => {
  const result = validateSchema<boolean>({ type: SchemaType.Boolean }, 'false');
  assert(!result.valid, 'should be invalid');
});
