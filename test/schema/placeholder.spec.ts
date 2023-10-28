import { assert, test } from 'vitest';
import { createPlaceholder } from '../../lib/esm/schema/placeholder';
import { Schema, SchemaType } from '../../lib/esm';

test('creates a placeholder for an object', () => {
  const schema = {
    type: SchemaType.Object,
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(Object.keys(result).length === 0, 'Expected to be an empty object.');
});

test('creates a placeholder for an array', () => {
  const schema = {
    type: SchemaType.Array,
  };

  const result = createPlaceholder(schema);
  assert(Array.isArray(result), 'Expected to be an array.');
  assert(result.length === 0, 'Expected to be an empty array.');
});

test('creates a placeholder for a set', () => {
  const schema = {
    type: SchemaType.Set,
  };

  const result = createPlaceholder(schema);
  assert(result instanceof Set, 'Expected to be a set.');
  assert(result.size === 0, 'Expected to be an empty set.');
});

test('creates a placeholder for a string', () => {
  const schema = {
    type: SchemaType.String,
  };

  const result = createPlaceholder(schema);
  console.log(result);
  assert(typeof result === 'string', 'Expected to be a string.');
  assert(result.length === 0, 'Expected to be an empty string.');
});

test('creates a placeholder for a number', () => {
  const schema = {
    type: SchemaType.Number,
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'number', 'Expected to be a number.');
  assert(result === 0, 'Expected to be 0.');
});

test('creates a placeholder for a boolean', () => {
  const schema = {
    type: SchemaType.Boolean,
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'boolean', 'Expected to be a boolean.');
});

test('creates a placeholder for a date', () => {
  const schema = {
    type: SchemaType.Date,
  };

  const result = createPlaceholder(schema);
  assert(result instanceof Date, 'Expected to be a date.');
});

test('creates a placeholder for a null', () => {
  const schema = {
    type: SchemaType.Null,
  };

  const result = createPlaceholder(schema);
  assert(result === null, 'Expected to be null.');
});

test('creates a placeholder for a custom type', () => {
  const schema = {
    type: SchemaType.Custom,
  };

  const result = createPlaceholder(schema);
  assert(result === undefined, 'Expected to be undefined.');
});

test('creates a placeholder an object with default value', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    default: () => {
      return { foo: 'bar' };
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(result.foo === 'bar', 'Expected to be foo.');
});

test('creates a placeholder an array with default value', () => {
  const schema: Schema<string[]> = {
    type: SchemaType.Array,
    default: () => {
      return [ 'foo', 'bar' ];
    },
  };

  const result = createPlaceholder(schema);
  assert(Array.isArray(result), 'Expected to be an array.');
  assert(result[0] === 'foo', 'Expected to be foo.');
  assert(result[1] === 'bar', 'Expected to be bar.');
});

test('creates a placeholder a set with default value', () => {
  const schema: Schema<Set<string>> = {
    type: SchemaType.Set,
    default: () => {
      return new Set([ 'foo', 'bar' ]);
    },
  };

  const result = createPlaceholder(schema);
  assert(result instanceof Set, 'Expected to be a set.');
  assert(result.has('foo'), 'Expected to have foo.');
  assert(result.has('bar'), 'Expected to have bar.');
});

test('creates a placeholder a string with default value', () => {
  const schema: Schema<string> = {
    type: SchemaType.String,
    default: 'foo',
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'string', 'Expected to be a string.');
  assert(result === 'foo', 'Expected to be foo.');
});

test('creates a placeholder a number with default value', () => {
  const schema: Schema<number> = {
    type: SchemaType.Number,
    default: 1,
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'number', 'Expected to be a number.');
  assert(result === 1, 'Expected to be 1.');
});

test('creates a placeholder a boolean with default value', () => {
  const schema: Schema<boolean> = {
    type: SchemaType.Boolean,
    default: true,
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'boolean', 'Expected to be a boolean.');
  assert(result === true, 'Expected to be true.');
});

test('creates a placeholder a date with default value', () => {
  const schema: Schema<Date> = {
    type: SchemaType.Date,
    default: () => new Date('2020-01-01'),
  };

  const result = createPlaceholder(schema);
  assert(result instanceof Date, 'Expected to be a date.');
  assert(result.getTime() === new Date('2020-01-01').getTime(), 'Expected to be 2020-01-01.');
});

test('creates a placeholder a null with default value', () => {
  const schema: Schema<null> = {
    type: SchemaType.Null,
    default: null,
  };

  const result = createPlaceholder(schema);
  assert(result === null, 'Expected to be null.');
});

test('creates a placeholder a custom type with default value', () => {
  const schema: Schema<undefined> = {
    type: SchemaType.Custom,
    default: undefined,
  };

  const result = createPlaceholder(schema);
  assert(result === undefined, 'Expected to be undefined.');
});

test('creates a placeholder of a nested object', () => {
  const schema: Schema<{ foo: { bar: string } }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Object,
        properties: {
          bar: {
            type: SchemaType.String,
          },
        },
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.foo === 'object', 'Expected to be an object.');
  assert(typeof result.foo.bar === 'string', 'Expected to be a string.');
  assert(result.foo.bar.length === 0, 'Expected to be an empty string.');
});

test('creates a placeholder of a nested array', () => {
  const schema: Schema<{ foo: string[] }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Array,
        items: {
          type: SchemaType.String,
        },
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(Array.isArray(result.foo), 'Expected to be an array.');
  assert(result.foo.length === 0, 'Expected to be an empty array.');
});

test('creates a placeholder of a nested set', () => {
  const schema: Schema<{ foo: Set<string> }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Set,
        items: {
          type: SchemaType.String,
        },
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(result.foo instanceof Set, 'Expected to be a set.');
  assert(result.foo.size === 0, 'Expected to be an empty set.');
});

test('creates a placeholder of a nested string', () => {
  const schema: Schema<{ foo: string }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.String,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.foo === 'string', 'Expected to be a string.');
  assert(result.foo.length === 0, 'Expected to be an empty string.');
});

test('creates a placeholder of a nested number', () => {
  const schema: Schema<{ foo: number }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Number,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.foo === 'number', 'Expected to be a number.');
  assert(result.foo === 0, 'Expected to be 0.');
});

test('creates a placeholder of a nested boolean', () => {
  const schema: Schema<{ foo: boolean }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Boolean,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.foo === 'boolean', 'Expected to be a boolean.');
});

test('creates a placeholder of a nested date', () => {
  const schema: Schema<{ foo: Date }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Date,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(result.foo instanceof Date, 'Expected to be a date.');
});

test('creates a placeholder of a nested null', () => {
  const schema: Schema<{ foo: null }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Null,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(result.foo === null, 'Expected to be null.');
});

test('creates a placeholder of a nested custom type', () => {
  const schema: Schema<{ foo: undefined }> = {
    type: SchemaType.Object,
    properties: {
      foo: {
        type: SchemaType.Custom,
      },
    },
  };

  const result = createPlaceholder(schema);
  assert(typeof result === 'object', 'Expected to be an object.');
  assert(result.foo === undefined, 'Expected to be undefined.');
});

test('creates a placeholder of a user object', () => {
  type User = {
    name: string;
    age: number;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: number;
    };
    tags: string[];
    tagSet: Set<string>;
  }

  const schema: Schema<User> = {
    type: SchemaType.Object,
    properties: {
      name: {
        type: SchemaType.String,
      },
      age: {
        type: SchemaType.Number,
      },
      email: {
        type: SchemaType.String,
      },
      address: {
        type: SchemaType.Object,
        properties: {
          street: {
            type: SchemaType.String,
          },
          city: {
            type: SchemaType.String,
          },
          state: {
            type: SchemaType.String,
          },
          zip: {
            type: SchemaType.Number,
          },
        },
      },
      tags: {
        type: SchemaType.Array,
        items: {
          type: SchemaType.String,
          default: () => `${ performance.now() }`,
        },
      },
      tagSet: {
        type: SchemaType.Set,
        items: {
          type: SchemaType.String,
          default: () => `${ performance.now() }`,
        },
      },
    },
  };

  const result = createPlaceholder(schema, undefined, 10);

  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.name === 'string', 'Expected to be a string.');
  assert(result.name.length === 0, 'Expected to be an empty string.');
  assert(typeof result.age === 'number', 'Expected to be a number.');
  assert(result.age === 0, 'Expected to be 0.');
  assert(typeof result.email === 'string', 'Expected to be a string.');
  assert(result.email.length === 0, 'Expected to be an empty string.');
  assert(typeof result.address === 'object', 'Expected to be an object.');
  assert(typeof result.address.street === 'string', 'Expected to be a string.');
  assert(result.address.street.length === 0, 'Expected to be an empty string.');
  assert(typeof result.address.city === 'string', 'Expected to be a string.');
  assert(result.address.city.length === 0, 'Expected to be an empty string.');
  assert(typeof result.address.state === 'string', 'Expected to be a string.');
  assert(result.address.state.length === 0, 'Expected to be an empty string.');
  assert(typeof result.address.zip === 'number', 'Expected to be a number.');
  assert(result.address.zip === 0, 'Expected to be 0.');
  assert(Array.isArray(result.tags), 'Expected to be an array.');
  assert(result.tags.length === 10, 'Expected to be an array with 10 items.');
  assert(result.tagSet instanceof Set, 'Expected to be a set.');
  assert(result.tagSet.size === 10, 'Expected to be a set with 10 items.');
});

test('creates a placeholder of a user object with optional schema', () => {
  type User = {
    name: string;
    age: number;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: number;
    };
    tags: string[];
    tagSet: Set<string>;
    createdAt: Date;
    socials: Array<{
      name: string;
      url: string;
    }>
  }

  const schema: Schema<User> = {
    type: SchemaType.Object,
    properties: {
      name: {
        type: SchemaType.String,
        minLength: 1,
        maxLength: 10,
      },
      age: {
        type: SchemaType.Number,
        minimum: 1,
        maximum: 10,
      },
      email: {
        type: SchemaType.String,
        minLength: 5,
        maxLength: 20,
      },
      address: {
        type: SchemaType.Object,
        properties: {
          street: {
            type: SchemaType.String,
            minLength: 5,
            maxLength: 20,
          },
          city: {
            type: SchemaType.String,
            minLength: 3,
            maxLength: 15,
          },
          state: {
            type: SchemaType.String,
            minLength: 2,
            maxLength: 30,
          },
          zip: {
            type: SchemaType.Number,
            minimum: 10000,
            maximum: 99999,
          },
        },
      },
      tags: {
        type: SchemaType.Array,
        items: {
          type: SchemaType.String,
          default: () => `${ performance.now() }`,
        },
      },
      tagSet: {
        type: SchemaType.Set,
        items: {
          type: SchemaType.String,
          default: () => `${ performance.now() }`,
        },
      },
      createdAt: {
        type: SchemaType.Date,
        minDate: new Date('2020-01-01'),
        maxDate: new Date('2020-12-31'),
      },
      socials: {
        type: SchemaType.Array,
        items: {
          type: SchemaType.Object,
          properties: {
            name: {
              type: SchemaType.String,
            },
            url: {
              type: SchemaType.String,
            },
          },
        },
      },
    },
  };

  const result = createPlaceholder(schema, undefined, 5);

  assert(typeof result === 'object', 'Expected to be an object.');
  assert(typeof result.name === 'string', 'Expected to be a string.');
  assert(result.name.length > 0 && result.name.length <= 10, 'Expected to be a string with length between 1 and 10.');
  assert(typeof result.age === 'number', 'Expected to be a number.');
  assert(result.age >= 1 && result.age <= 10, 'Expected to be a number between 1 and 10.');
  assert(typeof result.email === 'string', 'Expected to be a string.');
  assert(
    result.email.length >= 5 && result.email.length <= 20,
    'Expected to be a string with length between 5 and 20.',
  );
  assert(typeof result.address === 'object', 'Expected to be an object.');
  assert(typeof result.address.street === 'string', 'Expected to be a string.');
  assert(
    result.address.street.length >= 5 && result.address.street.length <= 20,
    'Expected to be a string with length between 5 and 20.',
  );
  assert(typeof result.address.city === 'string', 'Expected to be a string.');
  assert(
    result.address.city.length >= 3 && result.address.city.length <= 15,
    'Expected to be a string with length between 3 and 15.',
  );
  assert(typeof result.address.state === 'string', 'Expected to be a string.');
  assert(
    result.address.state.length >= 2 && result.address.state.length <= 30,
    'Expected to be a string with length between 2 and 30.',
  );
  assert(typeof result.address.zip === 'number', 'Expected to be a number.');
  assert(
    result.address.zip >= 10000 && result.address.zip <= 99999,
    'Expected to be a number between 10000 and 99999.',
  );
  assert(Array.isArray(result.tags), 'Expected to be an array.');
  assert(result.tags.length === 5, 'Expected to be an array with 5 items.');
  assert(result.tagSet instanceof Set, 'Expected to be a set.');
  assert(result.tagSet.size === 5, 'Expected to be a set with 5 items.');
  assert(result.createdAt instanceof Date, 'Expected to be a date.');
  assert(
    result.createdAt.getTime() >= new Date('2020-01-01').getTime()
    && result.createdAt.getTime() <= new Date('2020-12-31').getTime(),
    'Expected to be a date between 2020-01-01 and 2020-12-31.',
  );
  assert(Array.isArray(result.socials), 'Expected to be an array.');
  assert(result.socials.length === 5, 'Expected to be an array with 5 items.');
  assert(typeof result.socials[0] === 'object', 'Expected to be an object.');
  assert(typeof result.socials[0].name === 'string', 'Expected to be a string.');
  assert(typeof result.socials[0].url === 'string', 'Expected to be a string.');
});
