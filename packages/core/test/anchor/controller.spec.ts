import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, type StateController, subscribe } from '../../src/index.js';

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
      const controller = subscribe.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.subscribe).toBe('function');
      expect(controller?.subscribe).toBeInstanceOf(Function);
    });

    it('should provide destroy function to clean up', () => {
      const state = anchor({ count: 0 });
      const controller = subscribe.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.destroy).toBe('function');

      controller?.destroy();

      expect(subscribe.resolve(state)).toBeUndefined();

      // Ensure destroying multiple times should not throw.
      expect(() => {
        controller?.destroy();
      }).not.toThrow();
    });

    it('should destroy nested states', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const profile = state.profile;
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      const stateCtrl = subscribe.resolve(state) as StateController;
      const profileCtrl = subscribe.resolve(profile) as StateController;

      expect(stateCtrl).toBeDefined();
      expect(profileCtrl).toBeDefined();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(stateCtrl.meta.subscribers.size).toBe(1); // Subscription from handler
      expect(profileCtrl.meta.subscribers.size).toBe(1); // Subscription from state to profile

      stateCtrl.destroy();

      expect(subscribe.resolve(state)).toBeUndefined();
      expect(subscribe.resolve(profile)).toBeUndefined();

      unsubscribe(); // Should not throw.
    });

    it('should prevent destroying nested state that still active', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const profile = state.profile;

      const controller = subscribe.resolve(state) as StateController;
      const profileController = subscribe.resolve(profile) as StateController;

      const handler = vi.fn();
      const profileHandler = vi.fn();

      subscribe(state, handler);
      subscribe(profile, profileHandler);

      expect(controller).toBeDefined();
      expect(profileController).toBeDefined();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(profileHandler).toHaveBeenCalledTimes(1);

      controller?.destroy();

      expect(subscribe.resolve(state)).toBeUndefined();
      expect(subscribe.resolve(profile)).toBe(profileController);

      // Simulate internal destroy and should be prevented with warning.
      (profileController.destroy as (force?: boolean) => void)(true);

      expect(subscribe.resolve(profile)).toBe(profileController);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      profileController.destroy();
      expect(subscribe.resolve(profile)).toBeUndefined();
    });

    it('should not get notified for changes after destroying state', () => {
      const state = anchor({ count: 0, profile: { name: 'test' } });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);
      const profile = state.profile; // This trigger subscription to profile state.

      expect(handler).toHaveBeenCalledTimes(1); // Init.

      state.count++;
      expect(handler).toHaveBeenCalledTimes(2); // Increment.
      expect(state.count).toBe(1);

      profile.name = 'John Doe';
      expect(handler).toHaveBeenCalledTimes(3);
      expect(state.profile.name).toBe('John Doe');

      const controller = subscribe.resolve(state);
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
      const unsubscribeFirst = subscribe(state, handler);
      const unsubscribeSecond = subscribe(state, handler);

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
