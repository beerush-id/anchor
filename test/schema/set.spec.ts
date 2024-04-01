import { expect, test } from 'vitest';
import { SchemaPresets, SchemaType, validate } from '../../lib/esm/schema';

test('validates Set object', () => {
  const result = validate<Set<number>>({
    type: SchemaType.Set,
    items: SchemaPresets.Int,
  }, new Set([ 1, 2, 3 ]));

  expect(result.valid).toBe(true);
});

test('validates Set object with multiple types', () => {
  const schema = { type: SchemaType.Set, items: { type: [ SchemaType.String, SchemaType.Number ] } };
  const result = validate(schema, new Set([ '1', 2, '3' ]));

  expect(result.valid).toBe(true);
});

test('fails to validate Set object with invalid value', () => {
  const result = validate<Set<number>>({
    type: SchemaType.Set,
    items: {
      type: SchemaType.Number,
    },
  }, new Set([ 1, 2, '3' ]));

  expect(result.valid).toBe(false);
});

test('fails to validate Set object with invalid value (recursive)', () => {
  const result = validate<Set<object>>({
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
