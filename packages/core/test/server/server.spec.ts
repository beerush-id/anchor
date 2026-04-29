import '../../src/server/index.js';
import { describe, expect, it, vi } from 'vitest';
import { AsyncStore, awaited, getAsyncStore, getScope, setScope, withScope } from '../../src/index.js';

describe('Anchor - Server binding', () => {
  it('should assign AsyncLocalStorage', async () => {
    vi.unstubAllGlobals();

    expect(getAsyncStore()).toBeInstanceOf(AsyncStore);
    expect(getScope('test')).toBeUndefined();
  });

  it('should handle async context', async () => {
    await withScope(async () => {
      setScope('test', 'test');

      await withScope(async () => {
        setScope('foo', 'bar');
        expect(getScope('test')).toBe('test');

        await awaited(() => Promise.resolve());

        // Native await should survive, but usage is discouraged.
        await Promise.resolve();

        expect(getScope('test')).toBe('test');
        expect(getScope('foo')).toBe('bar');
      });
    });

    expect(getScope('test')).toBeUndefined();
  });
});
