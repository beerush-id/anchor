import { anchor } from '@airlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createBaseline, FormContext } from '../src/context.js';
import { initField } from '../src/init.js';
import { synchronize } from '../src/sync.js';
import type { FormStateOptions } from '../src/types.js';

const schema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
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

describe('synchronize', () => {
  it('skips init events', () => {
    const { ctx } = createCtx({ name: 'Alice', tags: ['a'] });

    synchronize(ctx, undefined, { type: 'init', keys: ['name'], value: 'Alice' } as any);
    expect(ctx.changeKeys.size).toBe(0);
  });

  it('skips when locked', () => {
    const { ctx } = createCtx({ name: 'Alice', tags: ['a'] });
    ctx.locked = true;

    synchronize(ctx, undefined, { type: 'set', keys: ['name'], value: 'Bob' } as any);
    expect(ctx.changeKeys.size).toBe(0);

    ctx.locked = false;
  });
});

describe('branch coverage', () => {
  it('syncArray handles non-array value at path gracefully', () => {
    const { ctx, value } = createCtx({ name: 'Alice', tags: ['a', 'b'] });

    (value as any).tags = 'not-an-array';

    synchronize(ctx, undefined, { type: 'push', keys: ['tags'], value: 'c' } as any);

    expect(value.tags).toBe('not-an-array');
  });

  it('syncArray fires onChange when provided', () => {
    const onChange = vi.fn();
    const { ctx, value } = createCtx({ name: 'Alice', tags: ['a'] }, { onChange });

    onChange.mockClear();
    synchronize(ctx, undefined, { type: 'push', keys: ['tags'], value: 'b' } as any);

    expect(onChange).toHaveBeenCalled();
  });
});
