import { describe, expect, it, vi } from 'vitest';
import { anchor, type Linkable, subscribe } from '../../src/index.js';

describe('Anchor Core - State Side-Effects & Underlying Object Preservation', () => {
  describe('Non-Recursive State ({ recursive: false })', () => {
    it('should read raw nested objects and reactive states without unwrapping or side-effects on target', () => {
      const childState = anchor({ role: 'admin' });
      const rawProfile = { name: 'Alice' };
      const target = {
        user: childState,
        profile: rawProfile,
      };

      const state = anchor(target, { recursive: false });

      // 1. Getting raw nested object returns exact raw reference without wrapping to state
      expect(state.profile).toBe(rawProfile);
      expect(anchor.has(state.profile)).toBe(false);
      expect(target.profile).toBe(rawProfile);

      // 2. Getting pre-existing state property returns exact state reference without unwrapping on target
      expect(state.user).toBe(childState);
      expect(target.user).toBe(childState); // Must NOT be unwrapped to raw object { role: 'admin' }
      expect(state.user).toBe(state.user);
    });

    it('should set reactive state and raw object values without side-effects or unwrapping on target', () => {
      const target: Record<string, Linkable> = {};
      const state = anchor(target, { recursive: false });

      const childState = anchor({ score: 100 });
      const rawConfig = { theme: 'dark' };

      // 1. Assigning a reactive state as property value
      state.game = childState;
      expect(state.game).toBe(childState);
      expect(target.game).toBe(childState); // Must strictly remain the state proxy on the underlying object
      expect(target.game).not.toBe(anchor.get(childState));

      // 2. Assigning a raw object as property value
      state.config = rawConfig;
      expect(state.config).toBe(rawConfig);
      expect(anchor.has(state.config)).toBe(false);
      expect(target.config).toBe(rawConfig);
    });
  });

  describe('Recursive State ({ recursive: true }) Short-Circuiting', () => {
    it('should short-circuit when getting pre-existing state properties without mutating target', () => {
      const childState = anchor({ city: 'New York' });
      const target = { address: childState };

      const parentState = anchor(target); // default recursive: true

      const handler = vi.fn();
      const unsubscribe = subscribe(parentState, handler);

      // Getting parentState.address should short-circuit via INIT_REGISTRY and return childState
      expect(parentState.address).toBe(childState);

      // Verify getting address did NOT cause side-effect unwrapping on target.address
      expect(target.address).toBe(childState);
      expect(target.address).not.toBe(anchor.get(childState));

      expect(handler).toHaveBeenCalled();
      delete (parentState as { address?: unknown }).address;

      unsubscribe();
    });

    it('should preserve underlying object state reference when assigning state to recursive proxy', () => {
      const parentState = anchor<Record<string, unknown>>({});
      const childState = anchor({ active: true });
      const underlyingParent = anchor.get(parentState) as Record<string, unknown>;

      parentState.child = childState;

      // Both proxy and underlying object must point to childState exactly
      expect(parentState.child).toBe(childState);
      expect(underlyingParent.child).toBe(childState);
      expect(underlyingParent.child).not.toBe(anchor.get(childState));
    });

    it('should maintain reactivity across state reads without degrading underlying object', () => {
      const childState = anchor({ count: 1 });
      const parentState = anchor({ nested: childState });
      const underlyingParent = anchor.get(parentState);

      let observedCount = 0;
      const unsubscribe = subscribe(parentState, (snap) => {
        observedCount = snap.nested.count;
      });

      // Mutate child state directly and through parent
      childState.count = 2;
      expect(parentState.nested.count).toBe(2);
      expect(underlyingParent.nested).toBe(childState); // Still intact after get/set

      parentState.nested.count = 3;
      expect(childState.count).toBe(3);
      expect(underlyingParent.nested).toBe(childState); // Still intact after nested mutation

      unsubscribe();
    });
  });

  describe('Real-World Integration: Shared Domain Store in Mixed Recursive & Non-Recursive Wrappers', () => {
    it('should share domain state cleanly across recursive app store and non-recursive payload wrapper', () => {
      const userStore = anchor({ id: 'usr_123', preferences: { notifications: true } });

      // 1. Non-recursive payload/analytics wrapper
      const logPayloadTarget = { event: 'user_action', user: userStore };
      const logPayloadState = anchor(logPayloadTarget, { recursive: false });

      // 2. Recursive app state store
      const appStateTarget = { currentSession: { user: userStore } };
      const appState = anchor(appStateTarget, { recursive: true });

      // Access from both wrappers
      expect(logPayloadState.user).toBe(userStore);
      expect(appState.currentSession.user).toBe(userStore);

      // Mutate domain store via appState
      appState.currentSession.user.preferences.notifications = false;
      expect(userStore.preferences.notifications).toBe(false);

      // Verify underlying targets across both wrappers never suffered side-effect unwrapping
      expect(logPayloadTarget.user).toBe(userStore);
      expect((appStateTarget.currentSession as Record<string, unknown>).user).toBe(userStore);
    });
  });
});
