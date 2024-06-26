import { assert, expect, test } from 'vitest';
import { anchor, AnchorSchema, configure, StateEvent } from '../../lib/esm';
import { SchemaPresets, SchemaType } from '../../lib/esm/schema';

type Foo = {
  foo: string;
  bar?: {
    baz: string;
  };
};
type Bar = string[];

const objectSchema: AnchorSchema<Foo> = {
  type: SchemaType.Object,
  properties: {
    foo: SchemaPresets.Str,
  },
};

const arraySchema: AnchorSchema<Bar> = {
  type: SchemaType.Array,
  items: SchemaPresets.Str,
};

const fooTemplate: Foo = {
  foo: 'bar',
  bar: {
    baz: 'qux',
  },
};

test('validates anchored object immutability', () => {
  const result = anchor(fooTemplate);
  expect(result.foo).toBe('bar');

  result.foo = 'baz';
  expect(result.foo).toBe('baz');
  expect(fooTemplate.foo).toBe('bar');

  result.bar!.baz = 'foo';
  expect(result.bar!.baz).toBe('foo');
  expect(fooTemplate.bar!.baz).toBe('qux');
});

test('validates reused anchored object immutability', () => {
  const result = anchor(fooTemplate);
  expect(result.foo).toBe('bar');
  expect(result.bar.baz).toBe('qux');

  result.foo = 'baz';
  result.bar.baz = 'quux';

  expect(fooTemplate.foo).toBe('bar');
  expect(result.foo).toBe('baz');
  expect(result.bar.baz).toBe('quux');
  expect(fooTemplate.bar.baz).toBe('qux');
});

test('validates anchored array immutability', () => {
  const origin = ['foo', 'bar'];
  const result = anchor(origin);

  expect(result[0]).toBe('foo');
  expect(result[1]).toBe('bar');

  let event: StateEvent<unknown>;
  result.subscribe((_, e) => (event = e as never), false);

  result[0] = 'foz';
  expect(origin[0]).toBe('foo');
  expect(origin[1]).toBe('bar');
  expect(result[0]).toBe('foz');
  expect(result[1]).toBe('bar');

  expect(event.type).toBe('set');
  expect(event.path).toBe('0');
  expect(event.oldValue).toBe('foo');
  expect(event.value).toBe('foz');

  origin.push('qux');
  expect(origin.length).toBe(3);
  expect(result.length).toBe(2);

  result.push('qux');
  expect(origin.length).toBe(3);
  expect(result.length).toBe(3);
  expect(result[2]).toBe('qux');

  expect(event.type).toBe('push');
  expect(event.oldValue).toEqual(['foz', 'bar']);
  expect(event.value).toEqual(['foz', 'bar', 'qux']);

  result.push({ a: 1, b: 2 } as never);
  expect(origin.length).toBe(3);
  expect(result.length).toBe(4);
  expect(result[3]).toEqual({ a: 1, b: 2 });

  result.splice(0, 1);
  expect(origin.length).toBe(3);
  expect(result.length).toBe(3);
  expect(result[0]).toBe('bar');
  expect(result[1]).toBe('qux');
  expect(result[2]).toEqual({ a: 1, b: 2 });
});

test('validates anchored object', () => {
  const result = anchor({ foo: 'bar' });

  assert(result.foo === 'bar', 'Expected to have the same properties.');
  assert(typeof result.set === 'function', 'Expected to have a set method.');
  assert(typeof result.subscribe === 'function', 'Expected to have a subscribe method.');
});

test('validates anchored array', () => {
  const result = anchor(['foo', 'bar']);

  assert(result[0] === 'foo', 'Expected to have the same properties.');
  assert(result[1] === 'bar', 'Expected to have the same properties.');
  assert(typeof result.set === 'function', 'Expected to have a set method.');
  assert(typeof result.subscribe === 'function', 'Expected to have a subscribe method.');
});

test('validates anchored object with schema and pass validation', () => {
  const result = anchor<Foo>({ foo: 'bar' }, true, true, objectSchema);

  assert(result.foo === 'bar', 'Expected to have the same properties.');
});

test('validates anchored array with schema and pass validation', () => {
  const result = anchor<string[]>(['foo', 'bar'], true, true, arraySchema);

  assert(result[0] === 'foo', 'Expected to have the same item.');
  assert(result[1] === 'bar', 'Expected to have the same item.');
});

test('success to set new property with a valid value', () => {
  const state = anchor<Foo>({ foo: 'bar' }, true, true, objectSchema);
  assert(state.foo === 'bar', 'Expected to have the same properties.');

  state.foo = 'baz';
  assert(state.foo === 'baz', 'Expected to have the same properties.');
});

test('success to add new item with a valid value', () => {
  const state = anchor(['foo', 'bar'], true, true, arraySchema);
  assert(state[0] === 'foo', 'Expected to have the same item.');

  state.push('baz');
  assert(state[2] === 'baz', 'Expected to have the same item.');
});

test('fails to add new item with invalid value', () => {
  const state = anchor(['foo', 'bar'], true, true, arraySchema);
  assert(state[0] === 'foo', 'Expected to have the same item.');
});

configure({ validationExit: true });

test('fails to anchor non-object init', () => {
  try {
    anchor(undefined as never);
    anchor(null as never);
    anchor(1 as never);
    anchor('foo' as never);
    anchor(true as never);
    anchor(Symbol('foo') as never);

    throw new Error('Expected to throw a TypeError.');
  } catch (error) {
    assert.ok(error instanceof TypeError, 'Expected to throw a TypeError.');
  }
});

test('fails anchored object with schema and do not pass validation', () => {
  try {
    anchor<Foo>({ foo: 1 as never }, true, false, objectSchema);

    throw new Error('Expected to throw a TypeError.');
  } catch (error) {
    assert.ok(error instanceof TypeError, 'Expected to throw a TypeError.');
  }
});

test('fails to set new property with invalid value', () => {
  const state = anchor<Foo>({ foo: 'bar' }, true, true, objectSchema);

  assert(state.foo === 'bar', 'Expected to have the same properties.');

  try {
    state.foo = 10 as never;

    throw new Error('Expected to throw a TypeError.');
  } catch (error) {
    assert.ok(error instanceof TypeError, 'Expected to throw a TypeError.');
  }
});
