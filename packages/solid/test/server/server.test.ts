// @vitest-environment node
import { getScope, isBrowser, setReactive } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Server Module', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should set async scope from server entry', async () => {
    await import('../../src/server/index.js');
    const result = getScope('global');
    expect(result).toBeUndefined();
  });

  it('should disable reactivity when not in browser', () => {
    expect(isBrowser()).toBe(false);

    if (!isBrowser()) {
      setReactive(false);
    }

    expect(isBrowser()).toBe(false);
  });
});
