import { assert, test } from 'vitest';
import { Schema, SchemaType, validate } from '../../lib/esm/schema';

test('validates provided array', () => {
  const schema = { type: SchemaType.Array };
  const value = [];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on missing but required array', () => {
  const schema = { type: SchemaType.Array, required: true };
  const value = undefined;
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates missing but optional array', () => {
  const schema = { type: SchemaType.Array };
  const value = undefined;
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('validates string item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.String } };
  const value = [ 'Example' ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid string item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.String } };
  const value = [ 123 ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates number item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Number } };
  const value = [ 123 ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid number item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Number } };
  const value = [ 'Example' ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates boolean item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Boolean } };
  const value = [ true ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid boolean item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Boolean } };
  const value = [ 123 ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates date item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Date } };
  const value = [ new Date() ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid date item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Date } };
  const value = [ 'Example' ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates object item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Object } };
  const value = [ {} ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid object item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Object } };
  const value = [ 'Example' ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates array item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Array } };
  const value = [ [] ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid array item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Array } };
  const value = [ 'Example' ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates nested array item', () => {
  const schema = { type: SchemaType.Array, items: { type: SchemaType.Array, items: { type: SchemaType.String } } };
  const value = [ [ 'Example' ] ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid nested array item', () => {
  const schema: Schema<Array<(string | number)[]>> = {
    type: SchemaType.Array,
    items: {
      type: SchemaType.Array,
      items: {
        type: SchemaType.String,
      },
    },
  };
  const value = [ [ 123 ] ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates array with multiple items', () => {
  const schema = { type: SchemaType.Array, items: { type: [ SchemaType.String, SchemaType.Number ] } };
  const value = [ 'Example', 123 ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid array with multiple items', () => {
  const schema = { type: SchemaType.Array, items: { type: [ SchemaType.Boolean, SchemaType.Number ] } };
  const value = [ 'Example', 'Example' ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});

test('validates array with multiple items and additional items', () => {
  const schema = {
    type: SchemaType.Array,
    items: {
      type: [
        SchemaType.String,
        SchemaType.Number,
      ],
    },
    additionalItems: true,
  };
  const value = [ 'Example', 123, true ];
  const result = validate(schema, value);
  assert(result.valid, 'Expected validation to pass');
});

test('fails on invalid array with multiple items and additional items', () => {
  const schema = {
    type: SchemaType.Array,
    items: {
      type: [
        SchemaType.String,
        SchemaType.Number,
      ],
    },
  };
  const value = [ 'Example', 123, true ];
  const result = validate(schema, value);
  assert(!result.valid, 'Expected validation to fail');
});
