import { assert, expect, it } from 'vitest';
import { SchemaPresets, SchemaType, validateSchema } from '../../lib/esm';

it('Should allow validating type "string"', () => {
  const result = validateSchema({ type: SchemaType.String } as never, '');
  expect(result.valid).toBe(true);
});

it('Should allow validating type "number"', () => {
  const result = validateSchema({ type: SchemaType.Number } as never, 0);
  expect(result.valid).toBe(true);
});

it('Should allow validating type "boolean"', () => {
  const result = validateSchema({ type: SchemaType.Boolean } as never, true);
  expect(result.valid).toBe(true);
});

it('Should allow validating type "object"', () => {
  const result = validateSchema({ type: SchemaType.Object } as never, {});
  expect(result.valid).toBe(true);
});

it('Should allow validating type "array"', () => {
  const result = validateSchema({ type: SchemaType.Array } as never, []);
  expect(result.valid).toBe(true);
});

it('Should allow validating type "null"', () => {
  const result = validateSchema({ type: SchemaType.Null } as never, null);
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["string"]', () => {
  const result = validateSchema({ type: [ SchemaType.String ] } as never, '');
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["number"]', () => {
  const result = validateSchema({ type: [ SchemaType.Number ] } as never, 0);
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["boolean"]', () => {
  const result = validateSchema({ type: [ SchemaType.Boolean ] } as never, true);
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["object"]', () => {
  const result = validateSchema({ type: [ SchemaType.Object ] } as never, {});
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["array"]', () => {
  const result = validateSchema({ type: [ SchemaType.Array ] } as never, []);
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["null"]', () => {
  const result = validateSchema({ type: [ SchemaType.Null ] } as never, null);
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["string", "number"]', () => {
  const result = validateSchema({ type: [ SchemaType.String, SchemaType.Number ] } as never, '');
  expect(result.valid).toBe(true);
});

it('Should allow validating type ["string", "boolean"], mark input "null" as invalid', () => {
  const result = validateSchema({ type: [ SchemaType.String, SchemaType.Boolean ] } as never, null);
  expect(result.valid).toBe(false);
});

it('Should allow validating type ["string", "boolean"], mark input "undefined" as invalid if required', () => {
  const result = validateSchema(
    { type: [ SchemaType.String, SchemaType.Boolean ], required: true } as never,
    undefined,
  );
  expect(result.valid).toBe(false);
});

it('Should allow validating type ["string", "boolean"], mark input "undefined" as valid if not required', () => {
  const result = validateSchema({ type: [ SchemaType.String, SchemaType.Boolean ] } as never, undefined);
  expect(result.valid).toBe(true);
});

it('Should allow validating custom schema', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    validate: () => {
      return { valid: true };
    },
  } as never, '');
  expect(result.valid).toBe(true);
});

it('Should allow validating custom schema with "required" set to true', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    required: true,
    validate: () => {
      return { valid: true };
    },
  } as never, '');
  expect(result.valid).toBe(true);
});

it('Should allow adding additional properties when "additionalProperties" is "true"', () => {
  const result = validateSchema<object>({
    type: SchemaType.Object,
    properties: {
      name: SchemaPresets.Str,
    },
    additionalProperties: true,
  }, {
    name: '',
    age: 0,
  });

  expect(result.valid).toBe(true);
});

it('Should prevent validating type "unknown"', () => {
  try {
    validateSchema({ type: 'unknown' as never } as never, '');

    throw new Error('Should not reach here.');
  } catch (e) {
    assert.ok(e instanceof TypeError);
  }
});

it('Should prevent validating type ["unknown"]', () => {
  try {
    validateSchema({ type: [ 'unknown' ] as never } as never, '');

    throw new Error('Should not reach here.');
  } catch (e) {
    assert.ok(e instanceof TypeError);
  }
});

it('Should prevent validating type ["unknown", "string"]', () => {
  try {
    validateSchema({ type: [ 'unknown', 'string' ] as never } as never, '');

    throw new Error('Should not reach here.');
  } catch (e) {
    assert.ok(e instanceof TypeError);
  }
});

it('Should mark as invalid if custom schema does not return "valid" property', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    validate: () => {
      return {} as never;
    },
  } as never, '');
  expect(result.valid).toBe(false);
});

it('Should mark as invalid if custom schema returns "valid" property as "false"', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    validate: () => {
      return { valid: false };
    },
  } as never, '');
  expect(result.valid).toBe(false);
});

it('Should mark as invalid if custom schema does not have a "validate" function, but is required.', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    required: true,
  } as never, '');
  expect(result.valid).toBe(false);
});

it('Should mark as valid if custom schema does not have a "validate" function, but not required.', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
  } as never, '');
  expect(result.valid).toBe(true);
});

it('Should mark as invalid when adding additional properties with "additionalProperties" set to "false" or' +
  ' "undefined"', () => {
  const result = validateSchema<object>({
    type: SchemaType.Object,
    properties: {
      name: SchemaPresets.Str,
    },
  }, {
    name: '',
    age: 0,
  });

  expect(result.valid).toBe(false);
});

it('Should validates only specific types', () => {
  const result = validateSchema({
    type: SchemaType.Custom,
    validate: () => {
      return { valid: false };
    },
  } as never, '', [ SchemaType.Custom ]);
  expect(result.valid).toBe(false);
});

it('Should fails when validating only specific types, but the type is not included', () => {
  try {
    validateSchema({ type: SchemaType.Custom } as never, '', [ SchemaType.String ]);

    throw new Error('Should not reach here.');
  } catch (error) {
    assert.ok(error instanceof TypeError);
  }
});

it('Should fails when validating only specific types, but the type is not included in the array', () => {
  try {
    validateSchema({ type: [ SchemaType.Custom, SchemaType.Date ] } as never, '', [ SchemaType.String ]);

    throw new Error('Should not reach here.');
  } catch (error) {
    assert.ok(error instanceof TypeError);
  }
});
