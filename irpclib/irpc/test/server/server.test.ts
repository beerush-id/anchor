import '../../src/server/index.js';
import { anchor, mutable, sleep } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContextStore, getContext, setContext, withContext } from '../../src/context.js';

describe('Server Module', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useRealTimers();
    anchor.configure({ globalScopeWarning: true });
    warnSpy = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should set and get context within withContext', async () => {
    const result = await withContext(createContextStore(), async () => {
      const state = mutable(0);

      setContext('key', 'value');
      setContext('state', state);

      await sleep(0);

      expect(getContext('key')).toBe('value');
      expect(getContext('state')).toBe(state);
      expect(state.value).toBe(0);

      return getContext('key');
    });

    expect(result).toBe('value');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
