import type { Linkable } from '@airlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState, safeAssign, safeRead } from '../src/store.js';

describe('Store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('create state', () => {
    const primitive = createState(0);
    const object = createState({});

    expect(primitive.value).toBe(0);
    expect(object).toEqual({});
  });

  it('safe read', () => {
    const handler = vi.fn();
    safeRead(handler);
    expect(handler).toHaveBeenCalled();
  });

  it('safe assign', () => {
    const left = { a: 1 };
    const right = { b: 2 };

    safeAssign(left as Linkable, right);

    expect(left).toEqual({ a: 1, b: 2 });
  });
});
