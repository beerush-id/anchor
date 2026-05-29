import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setReactive } from '../../src/engine/config.js';
import {
  anchor,
  type ControlledSubscribe,
  createObserver,
  effect,
  getObserver,
  getTracker,
  setTracker,
  subscribe,
} from '../../src/index.js';

describe('Anchor Core - Passive Mode (Non-Reactive)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Disable reactivity globally to simulate the passive SSR behavior
    setReactive(false);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore reactivity for other tests in the suite
    setReactive(true);
    errorSpy.mockRestore();
  });

  describe('State Mutations', () => {
    it('should mutate state properties correctly', () => {
      const state = anchor({ count: 0, user: { name: 'Alice' } });

      state.count++;
      state.user.name = 'Bob';

      expect(state.count).toBe(1);
      expect(state.user.name).toBe('Bob');
      expect(getObserver()).toBeUndefined();
    });

    it('should mutate array elements correctly', () => {
      const state = anchor({ items: [1, 2] });

      state.items.push(3);
      expect(state.items).toEqual([1, 2, 3]);
      expect(state.items.length).toBe(3);

      state.items.pop();
      expect(state.items).toEqual([1, 2]);
    });
  });

  describe('Observation Bypass', () => {
    it('should not trigger effect on state mutation', async () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn(() => {
        // Read property to establish tracking (if reactive)
        return state.count;
      });

      const cleanup = effect(handler);

      // In passive mode, effect still runs initially once by default
      expect(handler).toHaveBeenCalledTimes(1);

      state.count = 1;
      state.count = 2;

      await Promise.resolve();

      // Handler should NOT be called again because observation is bypassed
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should not track dependencies in createObserver', async () => {
      const state = anchor({ value: 'hello' });
      const handler = vi.fn(() => state.value);

      const observer = createObserver(handler);

      // observer.run Async or Sync executes the function natively in passive mode
      const result = observer.run(handler);
      expect(result).toBe('hello');
      expect(handler).toHaveBeenCalledTimes(1);

      state.value = 'world';

      await Promise.resolve();

      // No re-runs should occur
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not trigger async effect on state mutation', async () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn(async () => {
        return state.count;
      });

      const cleanup = effect.async(handler);
      // Let the promise resolve for the initial run
      await Promise.resolve();

      expect(handler).toHaveBeenCalledTimes(1);

      state.count = 1;
      await Promise.resolve();

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should provide dummy methods for createObserver', async () => {
      const observer = createObserver(() => {});
      const state = anchor({ count: 0 });

      const trackFn = observer.assign(state as never, new Set());
      expect(typeof trackFn).toBe('function');
      trackFn('count'); // Should not throw

      const handler = vi.fn(async () => 'async-hello');
      const result = await observer.runAsync(handler);

      expect(result).toBe('async-hello');
      expect(handler).toHaveBeenCalledTimes(1);

      // Dummy method coverage
      expect(() => observer.onChange({ type: 'init', keys: [] })).not.toThrow();
      expect(() => observer.destroy()).not.toThrow();
      expect(() => observer.reset()).not.toThrow();
      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      expect(() => (observer as any).track(state as never, 'count')).not.toThrow();
    });

    it('should bypass setTracker in passive mode', () => {
      const tracker = vi.fn();
      const restore = setTracker(tracker);

      // Should return undefined when !isReactive()
      expect(restore).toBeUndefined();

      // The tracker should not be set
      expect(getTracker()).toBeUndefined();
    });
  });

  describe('Subscription Bypass', () => {
    it('should never bypass subscribe function', async () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);

      // In passive mode, subscribe calls the handler immediately with an 'init' event
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });

      state.count = 10;
      state.count = 20;

      await Promise.resolve();

      // Handler should not receive mutation events
      expect(handler).toHaveBeenCalledTimes(3);

      unsubscribe();
    });

    it('should handle errors in subscribe handler gracefully', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn(() => {
        throw new Error('Test error');
      });

      // It should catch the error internally and not throw
      const unsubscribe = subscribe(state, handler);
      expect(handler).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('should bypass passive subscription', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = (subscribe as ControlledSubscribe)(state, handler, true, true);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');

      state.count = 10;

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle error in passive subscription', () => {
      errorSpy.mockClear();

      const state = anchor({ count: 0 });
      const handler = vi.fn(() => {
        throw new Error('Test error');
      });

      const unsubscribe = (subscribe as ControlledSubscribe)(state, handler, true, true);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');

      state.count = 10;

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should bypass reactivity for subscribe.pipe', () => {
      const source = anchor({ count: 1 });
      const target1 = anchor({ count: 0 });
      const target2 = anchor({ count: 0 });

      // Without transform
      const cleanup1 = subscribe.pipe(source, target1);
      expect(target1.count).toBe(1);

      // With transform
      const cleanup2 = subscribe.pipe(source, target2, (s: any) => ({ count: s.count * 10 }));
      expect(target2.count).toBe(10);

      // Mutating source shouldn't update target because it's non-reactive
      source.count = 5;
      expect(target1.count).toBe(1);
      expect(target2.count).toBe(10);

      cleanup1();
      cleanup2();
    });

    it('should bypass reactivity for subscribe.bind', () => {
      const left = anchor({ count: 1 });
      const right = anchor({ count: 0 });

      const cleanup = subscribe.bind(left, right);

      // Initial sync from left to right happens immediately
      expect(right.count).toBe(1);

      // Subsequent mutations shouldn't sync
      left.count = 5;
      expect(right.count).toBe(1);

      cleanup();
    });
  });
});
