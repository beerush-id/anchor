import { assert, test } from 'vitest';
import { satisfy, Schema, SchemaPresets, SchemaType, validate } from '../../lib/esm/schema';

test('validates object', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
    },
  };
  const result = validate(schema, { foo: 'bar' });

  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid object', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
    },
  };
  const result = validate(schema, { foo: 123 });

  assert(!result.valid, 'Expected validation to fail');
});

test('validates object with additional properties', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
    },
    additionalProperties: true,
  };
  const result = validate(schema, { foo: 'bar', baz: 'qux' });

  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid additional properties', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
    },
    additionalProperties: false,
  };
  const result = validate(schema, { foo: 'bar', baz: 'qux' });

  assert(!result.valid, 'Expected validation to fail');
});

test('validates nested object', () => {
  const schema: Schema<{ foo: { bar: string } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: SchemaPresets.Str,
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: 'baz' } });

  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid nested object', () => {
  const schema: Schema<{ foo: { bar: string } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: SchemaPresets.Str,
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: 123 } });

  assert(!result.valid, 'Expected validation to fail');
});

test('validates nested object with nested array', () => {
  const schema: Schema<{ foo: { bar: string[] } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: {
            type: SchemaType.Array,
            items: SchemaPresets.Str,
          },
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: [ 'baz' ] } });

  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid nested object with nested array', () => {
  const schema: Schema<{ foo: { bar: string[] } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: {
            type: SchemaType.Array,
            items: SchemaPresets.Str,
          },
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: [ 123 ] } });
  assert(!result.valid, 'Expected validation to fail');
});

test('validates nested object with nested object', () => {
  const schema: Schema<{ foo: { bar: { baz: string } } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: {
            type: SchemaType.Object,
            properties: {
              baz: SchemaPresets.Str,
            },
          },
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: { baz: 'qux' } } });

  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid nested object with nested object', () => {
  const schema: Schema<{ foo: { bar: { baz: string } } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: {
            type: SchemaType.Object,
            properties: {
              baz: SchemaPresets.Str,
            },
          },
        },
      },
    },
  };
  const result = validate(schema, { foo: { bar: { baz: 123 } } });

  assert(!result.valid, 'Expected validation to fail');
});

test('validates required object', () => {
  const schema: Schema<{ foo: string, bar: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
      bar: SchemaPresets.Str,
    },
    required: [ 'foo' ],
  };
  const result = validate(schema, { foo: 'bar' });
  assert(result.valid, 'Expected validation pass');
});

test('fails on invalid required object', () => {
  const schema: Schema<{ foo: string, bar: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
      bar: SchemaPresets.Str,
    },
    required: [ 'foo' ],
  };
  const result = validate(schema, { bar: 'baz' });
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on required property with invalid schema', () => {
  const schema: Schema<{ foo: string, bar: string }> = {
    type: SchemaType.Object,
    properties: {
      bar: SchemaPresets.Str,
    } as never,
    required: [ 'foo' ],
  };
  const result = validate(schema, { baz: 123 });
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid required nested object', () => {
  const schema = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
      bar: SchemaPresets.Str,
      baz: {
        type: SchemaType.Object,
        properties: {
          qux: SchemaPresets.Str,
          qix: {
            type: SchemaType.Object,
            properties: {
              qax: SchemaPresets.Str,
            },
            required: [ 'qex' ],
          },
        },
      },
    },
    required: [ 'foo' ],
  };
  const result = validate(schema as never, {
    bar: 'baz',
    baz: {
      qux: 123,
      qix: {
        qax: 123,
      },
    },
  });
  assert(!result.valid, 'Expected validation to fail');
});

test('validates object with required value property', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: { ...SchemaPresets.Str, required: true },
    },
  };
  const result = validate(schema, {});
  assert(!result.valid, 'Expected validation to fail');
});

test('fails on invalid object with required value property', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: { ...SchemaPresets.Str, required: true },
    },
  };
  const result = validate(schema, { foo: 123 });
  assert(!result.valid, 'Expected validation to fail');
});

test('validates object with default value', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: SchemaPresets.Str,
    },
    default: () => ({ foo: 'baz' }),
  };
  const value = satisfy(schema);
  assert(value.foo === 'baz', 'Expected default value');

  const result = validate(schema, value);
  assert(result.valid, 'Expected validation pass');
});

test('validates object with default property value', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: { ...SchemaPresets.Str, default: 'bar' },
    },
  };
  const value = satisfy(schema, {});
  assert(value.foo === 'bar', 'Expected default value');

  const result = validate(schema, value);
  assert(result.valid, 'Expected validation pass');
});

test('validates object with default property value function', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: { ...SchemaPresets.Str, default: () => 'bar' },
    },
  };
  const value = satisfy(schema, {});
  assert(value.foo === 'bar', 'Expected default value');

  const result = validate(schema, value);
  assert(result.valid, 'Expected validation pass');
});
