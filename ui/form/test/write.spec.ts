import { anchor } from '@airlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createBaseline, FormContext } from '../src/context.js';
import { initField } from '../src/init.js';
import type { FormStateOptions } from '../src/types.js';
import { clearField, resetField, setter, wipeChildren } from '../src/write.js';

const schema = z.object({
  name: z.string().min(3),
  age: z.number().min(18),
  tags: z.array(z.string()).default(['new']),
  address: z.object({
    city: z.string(),
    zip: z.string().min(5),
  }),
});

function createCtx(data: Record<string, unknown> = {}, options: FormStateOptions = {}) {
  const ctx = new FormContext(schema, { value: data }, options);
  ctx.baseline = createBaseline(structuredClone(data));

  for (const key of ctx.schemas.keys()) {
    if (key.includes('.$')) continue;
    initField(ctx, key);
  }

  return { ctx, value: data };
}

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});

describe('setter', () => {
  it('writes valid values to source and clears errors', () => {
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Bob');

    expect(value.name).toBe('Bob');
    expect(ctx.store.errors['name']).toBeUndefined();
  });

  it('writes invalid values and populates errors', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Al');

    expect(ctx.store.errors['name']).toBeDefined();
    expect(ctx.errorKeys.has('name')).toBe(true);
  });

  it('marks fields as touched', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    expect(ctx.store.touched).toBeFalsy();

    setter(ctx, 'name', 'Bob');

    expect(ctx.store.touched).toBe(true);
  });

  it('tracks changes against baseline', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Bob');
    expect(ctx.changeKeys.has('name')).toBe(true);

    setter(ctx, 'name', 'Alice');
    expect(ctx.changeKeys.has('name')).toBe(false);
  });

  it('rejects unknown fields in strict mode (default)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'unknown_field', 'test');

    expect(value.unknown_field).toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('allows unknown fields in non-strict mode', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx, value } = createCtx(
      { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
      { strict: false }
    );

    setter(ctx, 'unknown_field', 'test');

    expect(value.unknown_field).toBe('test');
    errSpy.mockRestore();
  });

  it('fires onChange callback', () => {
    const onChange = vi.fn();
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } }, { onChange });

    setter(ctx, 'name', 'Bob');

    expect(onChange).toHaveBeenCalledWith(ctx.store.changes, ctx.store.errors);
  });
});

describe('wipeChildren', () => {
  it('clears all descendant tracking for a parent path', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'address.city', 'LA');
    setter(ctx, 'address.zip', '123');

    expect(ctx.store.touched).toBe(true);
    expect(ctx.store.errors['address.zip']).toBeDefined();

    wipeChildren(ctx, 'address');

    expect(ctx.store.errors['address.zip']).toBeUndefined();
    expect(ctx.initialized.has('address.city')).toBe(false);
  });

  it('does nothing when parent has no children', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    expect(() => wipeChildren(ctx, 'name')).not.toThrow();
  });
});

describe('clearField', () => {
  it('resets field to schema default', () => {
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Bob');
    clearField(ctx, 'name');

    // String default is undefined (no .default() on name schema)
    expect(value.name).toBeUndefined();
  });

  it('resets field with .default() to its defined default', () => {
    const { ctx, value } = createCtx({
      name: 'Alice',
      age: 25,
      address: { city: 'NY', zip: '10001' },
      tags: ['admin'],
    });

    clearField(ctx, 'tags');

    expect(value.tags).toEqual(['new']);
  });
});

describe('resetField', () => {
  it('resets field to baseline value', () => {
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Bob');
    resetField(ctx, 'name');

    expect(value.name).toBe('Alice');
    expect(ctx.changeKeys.has('name')).toBe(false);
  });

  it('falls back to clearField when no baseline exists', () => {
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    // Remove baseline entry to simulate a field with no baseline
    ctx.baseline.delete('name');

    resetField(ctx, 'name');

    // clearField sets to schema default (undefined for string without .default())
    expect(value.name).toBeUndefined();
  });

  it('resets to invalid baseline and populates errors', () => {
    // name baseline is 'Al' (too short for min(3))
    const { ctx, value } = createCtx({ name: 'Al', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'name', 'Alice');
    expect(ctx.store.errors['name']).toBeUndefined();

    resetField(ctx, 'name');

    expect(value.name).toBe('Al');
    expect(ctx.store.errors['name']).toBeDefined();
    expect(ctx.errorKeys.has('name')).toBe(true);
  });

  it('wipes children when resetting to an object baseline', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'address.city', 'LA');
    resetField(ctx, 'address');

    expect(ctx.initialized.has('address.city')).toBe(false);
  });
});

describe('branch coverage', () => {
  it('clearField is a no-op for unknown fields', () => {
    const { ctx, value } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    clearField(ctx, 'nonexistent');
    expect(value.name).toBe('Alice');
  });

  it('clearField fires onChange when provided', () => {
    const onChange = vi.fn();
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } }, { onChange });

    clearField(ctx, 'name');
    expect(onChange).toHaveBeenCalled();
  });

  it('resetField fires onChange when provided', () => {
    const onChange = vi.fn();
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } }, { onChange });

    setter(ctx, 'name', 'Bob');
    onChange.mockClear();

    resetField(ctx, 'name');
    expect(onChange).toHaveBeenCalled();
  });

  it('clearField resets array to default', () => {
    const { ctx, value } = createCtx({
      name: 'Alice',
      age: 25,
      address: { city: 'NY', zip: '10001' },
      tags: ['admin'],
    });

    clearField(ctx, 'tags');
    expect(value.tags).toEqual(['new']);
  });

  it('clearField resets array to [] when no .default() is defined', () => {
    const noDefaultSchema = z.object({
      name: z.string(),
      items: z.array(z.string()),
    });

    const data: Record<string, unknown> = { name: 'Alice', items: ['a', 'b'] };
    const ctx = new FormContext(noDefaultSchema, { value: data });
    ctx.baseline = createBaseline(structuredClone(data));
    for (const key of ctx.schemas.keys()) {
      if (key.includes('.$')) continue;
      initField(ctx, key);
    }

    clearField(ctx, 'items');
    expect(data.items).toEqual([]);
  });

  it('clearField resets object field to empty object', () => {
    const { ctx } = createCtx({ name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } });

    setter(ctx, 'address.city', 'LA');
    clearField(ctx, 'address');
    expect(ctx.initialized.has('address.city')).toBe(false);
  });
});
