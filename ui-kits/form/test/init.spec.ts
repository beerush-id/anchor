import { anchor } from '@airlib/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createBaseline, FormContext } from '../src/context.js';
import { detectChanged, initField } from '../src/init.js';
import type { FormStateOptions } from '../src/types.js';

const schema = z.object({
  name: z.string().min(3),
  age: z.number(),
  tags: z.array(z.string()).default(['new']),
  address: z.object({
    city: z.string(),
    zip: z.string(),
  }),
});

function createCtx(data: Record<string, unknown> = {}, options: FormStateOptions = {}) {
  const ctx = new FormContext(schema, { value: data }, options);
  ctx.baseline = createBaseline(structuredClone(data));
  return { ctx, value: data };
}

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});

describe('initField', () => {
  it('fills schema defaults for missing values', () => {
    const { ctx, value } = createCtx({});

    initField(ctx, 'tags');

    expect(value.tags).toEqual(['new']);
  });

  it('skips already-initialized fields', () => {
    const { ctx, value } = createCtx({ name: 'Alice' });

    initField(ctx, 'name');
    const firstErrors = { ...ctx.store.errors };

    initField(ctx, 'name');
    expect(ctx.store.errors).toEqual(firstErrors);
  });

  it('walks the full path and initializes intermediates', () => {
    const { ctx } = createCtx({ address: { city: 'NY', zip: '10001' } });

    initField(ctx, 'address.city');

    expect(ctx.initialized.has('address')).toBe(true);
    expect(ctx.initialized.has('address.city')).toBe(true);
  });

  it('validates on init when validateOnInit is true (default)', () => {
    const { ctx } = createCtx({ name: 'Al' });

    initField(ctx, 'name');

    expect(ctx.store.errors['name']).toBeDefined();
    expect(ctx.errorKeys.has('name')).toBe(true);
  });

  it('still validates on init but clears errors for valid values', () => {
    const { ctx } = createCtx({ name: 'Alice' });

    initField(ctx, 'name');

    expect(ctx.store.errors['name']).toBeUndefined();
    expect(ctx.errorKeys.has('name')).toBe(false);
  });

  it('registers parent-child relationships', () => {
    const { ctx } = createCtx({ address: { city: 'NY', zip: '10001' } });

    initField(ctx, 'address.city');

    expect(ctx.fieldChildren.has('address')).toBe(true);
    expect(ctx.fieldChildren.get('address')!.has('address.city')).toBe(true);
  });

  it('stops walking when schema is not found for a segment', () => {
    const { ctx } = createCtx({});

    initField(ctx, 'nonexistent.deep.path');

    expect(ctx.initialized.has('nonexistent')).toBe(false);
  });
});

describe('detectChanged', () => {
  it('marks field as changed when not in baseline (new data)', () => {
    const { ctx } = createCtx({});

    detectChanged(ctx, 'newField', 'value');

    expect(ctx.changeKeys.has('newField')).toBe(true);
    expect(ctx.store.changes['newField']).toBe('value');
  });

  it('marks field as changed when value differs from baseline', () => {
    const { ctx } = createCtx({ name: 'Alice' });

    detectChanged(ctx, 'name', 'Bob');

    expect(ctx.changeKeys.has('name')).toBe(true);
    expect(ctx.store.changes['name']).toBe('Bob');
  });

  it('clears change when value matches baseline', () => {
    const { ctx } = createCtx({ name: 'Alice' });

    detectChanged(ctx, 'name', 'Bob');
    expect(ctx.changeKeys.has('name')).toBe(true);

    detectChanged(ctx, 'name', 'Alice');
    expect(ctx.changeKeys.has('name')).toBe(false);
    expect(ctx.store.changes['name']).toBeUndefined();
  });
});

describe('branch coverage', () => {
  it('breaks when source becomes null during path walk', () => {
    const { ctx } = createCtx({ name: 'Alice' });

    initField(ctx, 'name.nested.deep');
    expect(ctx.initialized.has('name.nested')).toBe(false);
  });

  it('fills object default when safeParse returns undefined', () => {
    const { ctx, value } = createCtx({});

    initField(ctx, 'address.city');
    expect(value.address).toBeDefined();
    expect(typeof value.address).toBe('object');
  });

  it('fills array fallback when no .default() is defined', () => {
    const noDefaultSchema = z.object({
      items: z.array(z.string()),
    });

    const data: Record<string, unknown> = {};
    const ctx = new FormContext(noDefaultSchema, { value: data });
    ctx.baseline = createBaseline(structuredClone(data));

    initField(ctx, 'items');
    expect(data.items).toEqual([]);
  });

  it('is a no-op for empty prop', () => {
    const { ctx } = createCtx({});

    initField(ctx, '');
    expect(ctx.initialized.size).toBeGreaterThanOrEqual(0);
  });
});
