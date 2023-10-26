import { expect, test } from 'vitest';
import { SchemaPresets, SchemaType, validateSchema } from '../../lib/esm';

test('validates Set object', () => {
  const result = validateSchema<Set<number>>({
    type: SchemaType.Set,
    items: SchemaPresets.Int,
  }, new Set([ 1, 2, 3 ]));

  expect(result.valid).toBe(true);
});

test('validates Set object with multiple types', () => {
  const schema = { type: SchemaType.Set, items: { type: [ SchemaType.String, SchemaType.Number ] } };
  const result = validateSchema(schema, new Set([ '1', 2, '3' ]));

  expect(result.valid).toBe(true);
});

test('fails to validate Set object with invalid value', () => {
  const result = validateSchema<Set<number>>({
    type: SchemaType.Set,
    items: {
      type: SchemaType.Number,
    },
  }, new Set([ 1, 2, '3' ]));

  expect(result.valid).toBe(false);
});

test('fails to validate Set object with invalid value (recursive)', () => {
  const result = validateSchema<Set<object>>({
    type: SchemaType.Set,
    items: {
      type: SchemaType.Object,
      properties: {
        foo: {
          type: SchemaType.String,
        },
      },
    },
  }, new Set([ { foo: 'valid' }, { foo: 0 }, '3' ]));

  expect(result.valid).toBe(false);
  expect(result.items[0].__valid).toBe(true);
  expect(result.items[1].__valid).toBe(false);
  expect(result.items[2].__valid).toBe(false);
});
