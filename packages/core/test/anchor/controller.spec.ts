import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Controller', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
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

      controller?.destroy();

      expect(derive.resolve(state)).toBeUndefined();

      // Ensure destroying multiple times should not throw.
      expect(() => {
        controller?.destroy();
      }).not.toThrow();
    });

    it('should destroy nested states', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const profile = state.profile;
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      const stateCtrl = derive.resolve(state);
      const profileCtrl = derive.resolve(profile);

      expect(stateCtrl).toBeDefined();
      expect(profileCtrl).toBeDefined();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(stateCtrl.meta.subscribers.size).toBe(1); // Subscription from handler
      expect(profileCtrl.meta.subscribers.size).toBe(1); // Subscription from state to profile

      stateCtrl.destroy();

      expect(derive.resolve(state)).toBeUndefined();
      expect(derive.resolve(profile)).toBeUndefined();

      unsubscribe(); // Should not throw.
    });

    it('should prevent destroying nested state that still active', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const profile = state.profile;

      const controller = derive.resolve(state);
      const profileController = derive.resolve(profile);

      const handler = vi.fn();
      const profileHandler = vi.fn();

      derive(state, handler);
      derive(profile, profileHandler);

      expect(controller).toBeDefined();
      expect(profileController).toBeDefined();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(profileHandler).toHaveBeenCalledTimes(1);

      controller?.destroy();

      expect(derive.resolve(state)).toBeUndefined();
      expect(derive.resolve(profile)).toBe(profileController);

      // Simulate internal destroy and should be prevented with warning.
      (profileController.destroy as (force?: boolean) => void)(true);

      expect(derive.resolve(profile)).toBe(profileController);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      profileController.destroy();
      expect(derive.resolve(profile)).toBeUndefined();
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

      unsubscribe(); // Mark the state as inactive to allows clean up.
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
      expect(warnSpy).toHaveBeenCalled();

      unsubscribeFirst();
      unsubscribeSecond();
    });
  });
});
