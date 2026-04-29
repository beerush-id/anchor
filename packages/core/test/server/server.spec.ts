import '../../src/server/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AsyncStore,
  awaited,
  effect,
  getAsyncStore,
  getScope,
  mutable,
  setScope,
  sleep,
  withScope,
} from '../../src/index.js';

describe('Anchor - Server binding', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should assign AsyncLocalStorage', async () => {
    vi.unstubAllGlobals();

    expect(getAsyncStore()).toBeInstanceOf(AsyncStore);
    expect(getScope('test')).toBeUndefined();
  });

  it('should handle async context', async () => {
    expect(getAsyncStore()).toBeInstanceOf(Map);

    await withScope(async () => {
      expect(getAsyncStore()).toBeInstanceOf(Map);

      setScope('test', 'test');

      await withScope(async () => {
        setScope('foo', 'bar');
        expect(getScope('test')).toBe('test');

        await awaited(() => Promise.resolve());
        await awaited(Promise.resolve());

        // Native await should survive, but usage is discouraged.
        await Promise.resolve();

        expect(getScope('test')).toBe('test');
        expect(getScope('foo')).toBe('bar');
      });
    });

    expect(getScope('test')).toBeUndefined();
  });

  it('should handle error in async effect runner', async () => {
    const handler = vi.fn().mockImplementation(() => {
      throw new Error('Execution error');
    });

    effect.async(() => handler());

    await sleep(0);

    expect(errorSpy).toHaveBeenCalled();
  });

  it('should handle async effect', async () => {
    const state = mutable({ foo: 1, bar: 2 });

    const cleanupHandler = vi.fn();
    const trackEffectRun = vi.fn();

    let foo: number;
    let bar: number;

    const cleanup = effect.async(async () => {
      foo = state.foo;

      await awaited(() => Promise.resolve());

      bar = state.bar;

      trackEffectRun();
      return cleanupHandler;
    });

    await sleep(0);

    effect.async(async () => {
      foo = state.foo;
    });

    expect(foo!).toBe(1);
    expect(bar!).toBe(2);

    expect(trackEffectRun).toHaveBeenCalled();
    expect(trackEffectRun).toHaveBeenCalledTimes(1);

    state.foo = 3;
    await sleep(0);

    expect(foo!).toBe(3);
    expect(trackEffectRun).toHaveBeenCalledTimes(2);

    state.bar = 4;
    await sleep(0);

    expect(bar!).toBe(4);
    expect(trackEffectRun).toHaveBeenCalledTimes(3);

    cleanup();
  });
});
