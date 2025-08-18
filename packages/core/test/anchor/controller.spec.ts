import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Controller', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Controller', () => {
    it('should provide subscribe function to listen for changes', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.subscribe).toBe('function');
      expect(controller?.subscribe).toBeInstanceOf(Function);
    });

    it('should provide destroy function to clean up', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.destroy).toBe('function');

      // After destroy, state should still work but cleanup internal references
      controller?.destroy();
    });

    it('should not get notified for changes after destroying state', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);
      const profile = state.profile; // This trigger subscription to profile state.

      expect(handler).toHaveBeenCalledTimes(1); // Init.

      state.count++;
      expect(handler).toHaveBeenCalledTimes(2); // Increment.
      expect(state.count).toBe(1);

      profile.name = 'John Doe';
      expect(handler).toHaveBeenCalledTimes(3);
      expect(state.profile.name).toBe('John Doe');

      const controller = derive.resolve(state);
      expect(typeof controller?.destroy).toBe('function');
      controller?.destroy();

      state.count++;
      profile.name = 'Jane Doe';

      expect(state.count).toBe(2); // Increment applied.
      expect(state.profile.name).toBe('Jane Doe'); // Name change applied.
      expect(handler).toHaveBeenCalledTimes(3); // No notification since subscriptions are no longer available.

      unsubscribe();
    });

    it('should prevent duplicated subscription handler', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();
      const unsubscribeFirst = derive(state, handler);
      const unsubscribeSecond = derive(state, handler);

      expect(handler).toHaveBeenCalledTimes(2); // Init (1st + 2nd).

      state.count++;
      expect(state.count).toBe(1);
      expect(handler).toHaveBeenCalledTimes(3); // Increment (only one notification).
      expect(errorSpy).toHaveBeenCalled();

      unsubscribeFirst();
      unsubscribeSecond();
    });
  });
});
