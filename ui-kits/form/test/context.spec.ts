import { anchor } from '@airlib/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { context, createBaseline, FormContext, schemaOf, setContextBridge, toSchemaPath } from '../src/context.js';

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});

describe('createBaseline', () => {
  it('flattens a nested object into path → value map', () => {
    const map = createBaseline({ name: 'Alice', address: { city: 'NY' } });
    expect(map.get('name')).toBe('Alice');
    expect(map.get('address.city')).toBe('NY');
  });

  it('flattens arrays with numeric indices', () => {
    const map = createBaseline({ tags: ['a', 'b'] });
    expect(map.get('tags')).toEqual(['a', 'b']);
    expect(map.get('tags.0')).toBe('a');
    expect(map.get('tags.1')).toBe('b');
  });

  it('handles Date as a primitive', () => {
    const d = new Date('2024-01-01');
    const map = createBaseline({ created: d });
    expect(map.get('created')).toBe(d);
  });

  it('handles null and undefined', () => {
    const map = createBaseline({ a: null, b: undefined });
    expect(map.get('a')).toBeNull();
    // undefined at root won't set, but as child it does
  });

  it('returns empty map for empty object', () => {
    const map = createBaseline({});
    expect(map.size).toBe(0);
  });
});

describe('toSchemaPath', () => {
  it('replaces purely numeric segments with $', () => {
    expect(toSchemaPath('tags.0')).toBe('tags.$');
    expect(toSchemaPath('items.3.name')).toBe('items.$.name');
  });

  it('preserves non-numeric segments', () => {
    expect(toSchemaPath('address.city')).toBe('address.city');
    expect(toSchemaPath('venue23')).toBe('venue23');
  });

  it('handles deeply nested numeric paths', () => {
    expect(toSchemaPath('a.0.b.1.c')).toBe('a.$.b.$.c');
  });
});

describe('FormContext', () => {
  const schema = z.object({
    name: z.string().min(3),
    age: z.number(),
  });

  it('initializes with schemas from the zod schema', () => {
    const ctx = new FormContext(schema, { value: {} });
    expect(ctx.schemas.has('name')).toBe(true);
    expect(ctx.schemas.has('age')).toBe(true);
  });

  it('initializes store with idle status and upfront validation', () => {
    const ctx = new FormContext(schema, { value: {} });
    expect(ctx.store.status).toBe('idle');

    // buildShell validates upfront — name and age are required
    expect(ctx.store.errors['name']).toBeDefined();
    expect(ctx.store.errors['age']).toBeDefined();
    expect(ctx.errorKeys.has('name')).toBe(true);
    expect(ctx.errorKeys.has('age')).toBe(true);

    // No defaults in schema — no changes
    expect(ctx.store.changes).toEqual({});
    expect(ctx.store.touched).toBeFalsy();
  });

  it('merges options with defaults', () => {
    const ctx = new FormContext(schema, { value: {} }, { strict: false });
    expect(ctx.options.strict).toBe(false);
    expect(ctx.options.validateOnInit).toBe(true);
    expect(ctx.options.settleOnSubmit).toBe(true);
  });

  it('cleanup clears all tracking state', () => {
    const ctx = new FormContext(schema, { value: { name: 'test' } });
    ctx.initialized.add('name');
    ctx.errorKeys.add('name');
    ctx.changeKeys.add('name');
    ctx.store.errors['name'] = ['error'];
    ctx.store.changes['name'] = 'test';
    ctx.store.touched = true;

    ctx.cleanup();

    expect(ctx.initialized.size).toBe(0);
    expect(ctx.errorKeys.size).toBe(0);
    expect(ctx.changeKeys.size).toBe(0);
    expect(ctx.store.errors).toEqual({});
    expect(ctx.store.changes).toEqual({});
    expect(ctx.store.touched).toBeFalsy();
    expect(ctx.store.status).toBe('idle');
  });

  it('cleanupSource deletes all keys from props.value', () => {
    const value = { name: 'Alice', age: 25 };
    const ctx = new FormContext(schema, { value });

    ctx.cleanupSource();

    expect(value.name).toBeUndefined();
    expect(value.age).toBeUndefined();
  });
});

describe('schemaOf', () => {
  const schema = z.object({
    name: z.string(),
    tags: z.array(z.string()),
  });

  it('returns schema for known field', () => {
    const ctx = new FormContext(schema);
    const result = schemaOf(ctx, 'name');
    expect(result).toBeDefined();
    expect(result!.type).toBe('string');
  });

  it('returns schema for array element via toSchemaPath', () => {
    const ctx = new FormContext(schema);
    const result = schemaOf(ctx, 'tags.0');
    expect(result).toBeDefined();
    expect(result!.type).toBe('string');
  });

  it('returns undefined for unknown field', () => {
    const ctx = new FormContext(schema);
    expect(schemaOf(ctx, 'nonexistent')).toBeUndefined();
  });
});

describe('context bridge', () => {
  it('setContextBridge replaces read/write functions', () => {
    const store = new Map<symbol, unknown>();
    const customRead = <T>(key: symbol) => store.get(key) as T | undefined;
    const customWrite = (key: symbol, value: unknown) => store.set(key, value);

    const originalRead = context.read;
    const originalWrite = context.write;

    setContextBridge({ read: customRead, write: customWrite });

    expect(context.read).toBe(customRead);
    expect(context.write).toBe(customWrite);

    // Restore
    setContextBridge({ read: originalRead, write: originalWrite });
  });
});

describe('branch coverage', () => {
  it('createBaseline handles root-level array (no path prefix)', () => {
    const map = createBaseline(['a', 'b']);
    expect(map.get('0')).toBe('a');
    expect(map.get('1')).toBe('b');
  });

  it('cleanupSource is a no-op when props.value is undefined', () => {
    const schema = z.object({ name: z.string() });
    const ctx = new FormContext(schema, {});
    ctx.props.value = undefined;
    expect(() => ctx.cleanupSource()).not.toThrow();
  });

  it('schemaOf returns undefined for non-string field', () => {
    const schema = z.object({ name: z.string() });
    const ctx = new FormContext(schema);
    expect(schemaOf(ctx, 123 as any)).toBeUndefined();
  });
});
