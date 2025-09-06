import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Derivation Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // errorSpy = vi.spyOn(console, 'error');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('Derivation', () => {
    it('should handle subscribing to non-reactive objects', () => {
      const plainObject = { count: 0 };
      const handler = vi.fn();

      const unsubscribe = derive(plainObject, handler);

      // Should call handler once with init event
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(plainObject, { type: 'init', keys: [] });
      expect(warnSpy).toHaveBeenCalled();

      // Should not react to changes since it's not reactive
      plainObject.count = 1;
      expect(handler).toHaveBeenCalledTimes(1); // No additional calls

      // Unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle multiple subscribers to the same state', () => {
      const state = anchor({ count: 0 });
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = derive(state, handler1);
      const unsubscribe2 = derive(state, handler2);

      // Both handlers should be called for initialization
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      // Update state
      state.count = 1;

      // Both handlers should be called for the update
      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(2);

      // Unsubscribe first handler
      unsubscribe1();

      // Update state again
      state.count = 2;

      // Only second handler should be called
      expect(handler1).toHaveBeenCalledTimes(2); // No additional call
      expect(handler2).toHaveBeenCalledTimes(3); // Additional call

      // Unsubscribe second handler
      unsubscribe2();

      // Update state again
      state.count = 3;

      // Neither handler should be called
      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(3);
    });

    it('should handle subscriber throwing an error', () => {
      const state = anchor({ count: 0 });
      const errorHandler = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalHandler = vi.fn();

      const unsubscribe1 = derive(state, errorHandler);
      const unsubscribe2 = derive(state, normalHandler);

      // Updating state should not be affected by one subscriber throwing
      state.count = 1;

      // Normal handler should still be called
      expect(normalHandler).toHaveBeenCalledTimes(2); // init + update
      expect(errorSpy).toHaveBeenCalled(); // Error should be logged

      unsubscribe1();
      unsubscribe2();
    });

    it('should handle nested subscriptions', () => {
      const parentState = anchor({ value: 'parent' });
      const childState = anchor({ value: 'child' });

      const parentHandler = vi.fn();
      const childHandler = vi.fn();

      const unsubscribeParent = derive(parentState, (parentValue) => {
        parentHandler(parentValue);
        // Subscribe to child state within parent subscription
        return derive(childState, childHandler); // This return value is ignored by derive
      });

      expect(parentHandler).toHaveBeenCalledTimes(1);
      expect(childHandler).toHaveBeenCalledTimes(1);

      // Update parent
      parentState.value = 'updated parent';
      expect(parentHandler).toHaveBeenCalledTimes(2);
      expect(childHandler).toHaveBeenCalledTimes(2); // Child handler called again

      // Update child
      childState.value = 'updated child';
      expect(parentHandler).toHaveBeenCalledTimes(2); // No change
      expect(childHandler).toHaveBeenCalledTimes(3); // Child handler called again

      unsubscribeParent();
    });

    it('should handle rapid successive updates', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);

      // Perform rapid updates
      for (let i = 1; i <= 100; i++) {
        state.count = i;
      }

      // Handler should be called for each update + init
      expect(handler).toHaveBeenCalledTimes(101); // 100 updates + 1 init

      unsubscribe();
    });

    it('should handle subscribing to deeply nested properties', () => {
      const state = anchor({
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      });

      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Change deeply nested value
      state.level1.level2.level3.value = 'updated';

      // Handler should be called for init and update
      expect(handler).toHaveBeenCalledTimes(2);

      // Check the event structure
      const lastCall = handler.mock.calls[1];
      expect(lastCall[1]).toEqual({
        type: 'set',
        prev: 'deep',
        keys: ['level1', 'level2', 'level3', 'value'],
        value: 'updated',
      });

      unsubscribe();
    });

    it('should handle derive.log() method', () => {
      const state = anchor({ count: 1 });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const unsubscribe = derive.log(state);

      expect(logSpy).toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle invalid state and subscription handler', () => {
      derive(10 as never, 10 as never);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      derive(10 as never, () => {
        throw new Error('Invalid state');
      });

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Controller', () => {
    it('should handle resolve with non-reactive objects', () => {
      const plainObject = { count: 0 };

      const controller = derive.resolve(plainObject);
      expect(controller).toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle subscribing to non-reactive objects', () => {
      const handler = vi.fn();
      const unsubscribe = derive({}, handler);

      expect(handler).toHaveBeenCalledTimes(1); // Init.
      expect(warnSpy).toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle multiple resolves to the same state', () => {
      const state = anchor({ count: 0 });

      const controller1 = derive.resolve(state);
      const controller2 = derive.resolve(state);

      // Should return the same controller
      expect(controller1).toBe(controller2);
      expect(controller1).toBeDefined();
      expect(typeof controller1?.subscribe).toBe('function');
      expect(typeof controller1?.destroy).toBe('function');
    });

    it('should handle destroying controller and then trying to use it', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();

      // Destroy the controller
      controller?.destroy();

      // State should still work
      state.count = 1;
      expect(state.count).toBe(1);
    });

    it('should handle controller after all subscribers unsubscribe', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      const unsubscribe1 = derive(state, vi.fn());
      const unsubscribe2 = derive(state, vi.fn());

      // Unsubscribe all
      unsubscribe1();
      unsubscribe2();

      // Controller should still be accessible
      const controllerAgain = derive.resolve(state);
      expect(controllerAgain).toBe(controller);
    });
  });

  describe('Piping', () => {
    it('should handle piping without transform function', () => {
      const state = anchor({ count: 1 });
      const target = { count: 0 };
      const unsubscribe = derive.pipe(state, target);

      expect(state.count).toBe(1);
      expect(target.count).toBe(1); // Should be updated by pipe.

      state.count++;

      expect(state.count).toBe(2);
      expect(target.count).toBe(2); // Should be updated by pipe.

      unsubscribe();
    });

    it('should handle piping between non-object states', () => {
      derive.pipe(42 as never, {} as never);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      derive.pipe({} as never, 42 as never);
      expect(errorSpy).toHaveBeenCalledTimes(2);

      derive.pipe(anchor({}) as never, 42 as never);
      expect(errorSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle piping with transform function', () => {
      const source = anchor({ count: 5 });
      const target = anchor({ value: 0 });

      const unsubscribe = derive.pipe(source, target, (src) => ({
        value: src.count * 2,
      }));

      expect(target.value).toBe(10); // 5 * 2

      source.count = 7;
      expect(target.value).toBe(14); // 7 * 2

      unsubscribe();
    });

    it('should handle piping with complex nested objects', () => {
      const source = anchor({
        user: {
          profile: {
            name: 'John',
            age: 30,
          },
        },
      });

      const target = anchor({
        fullName: '',
        years: 0,
      });

      const unsubscribe = derive.pipe(source, target, (src) => ({
        fullName: src.user.profile.name,
        years: src.user.profile.age,
      }));

      expect(target.fullName).toBe('John');
      expect(target.years).toBe(30);

      source.user.profile.name = 'Jane';
      source.user.profile.age = 25;

      expect(target.fullName).toBe('Jane');
      expect(target.years).toBe(25);

      unsubscribe();
    });
  });

  describe('Binding', () => {
    it('should handle binding non-reactive states', () => {
      const left = { value: 1 };
      const right = { value: 2 };

      const unsubscribe = derive.bind(left, right);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      // Values should remain unchanged
      expect(left.value).toBe(1);
      expect(right.value).toBe(2);

      unsubscribe();
    });

    it('should handle binding with non-reactive left state', () => {
      const left = { value: 1 };
      const right = anchor({ value: 2 });

      const unsubscribe = derive.bind(left, right);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      // Values should remain unchanged
      expect(left.value).toBe(1);
      expect(right.value).toBe(2);

      unsubscribe();
    });

    it('should handle binding with non-reactive right state', () => {
      const left = anchor({ value: 2 });
      const right = { value: 1 };

      const unsubscribe = derive.bind(left, right);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      // Values should remain unchanged
      expect(left.value).toBe(2);
      expect(right.value).toBe(1);

      unsubscribe();
    });

    it('should prevent infinite loops during binding', () => {
      const left = anchor({ count: 0 });
      const right = anchor({ count: 0 });

      // Create binding without transformations (which could cause loops)
      const unsubscribe = derive.bind(left, right);

      // Initial sync - right should take left's value
      expect(left.count).toBe(0);
      expect(right.count).toBe(0);

      // Update left and ensure no infinite loop occurs
      left.count = 5;
      expect(left.count).toBe(5);
      expect(right.count).toBe(5);

      // Update right and ensure no infinite loop occurs
      right.count = 10;
      expect(left.count).toBe(10);
      expect(right.count).toBe(10);

      unsubscribe();
    });

    it('should handle binding with complex transformation functions', () => {
      type Shape = { items?: number[]; count?: number };
      const left = anchor<Shape>({ items: [1, 2, 3] });
      const right = anchor<Shape>({ count: 0 });

      const unsubscribe = derive.bind(
        left,
        right,
        (current) => ({ count: current.items.length }),
        (current) => ({ items: Array(current.count).fill(0) })
      );

      // Initial binding
      expect(left.items).toEqual([0, 0, 0]);
      expect(right.count).toBe(3);

      // Update left
      left.items = [1, 2, 3, 4, 5];
      expect(left.items).toEqual([1, 2, 3, 4, 5]);
      expect(right.count).toBe(5);

      // Update right
      right.count = 2;
      expect(left.items).toEqual([0, 0]);
      expect(right.count).toBe(2);

      unsubscribe();
    });

    it('should handle binding with transformation functions that return undefined', () => {
      const left = anchor({ value: 1 });
      const right = anchor({ value: 2 });

      const unsubscribe = derive.bind(
        left,
        right,
        () => undefined, // Return undefined
        () => undefined // Return undefined
      );

      // Initial binding - no transformations should be applied
      expect(left.value).toBe(1);
      expect(right.value).toBe(2); // Right should still sync to left's value

      // Updates should still work even with undefined returns
      left.value = 5;
      expect(left.value).toBe(5);
      expect(right.value).toBe(2);

      right.value = 10;
      expect(left.value).toBe(5);
      expect(right.value).toBe(10);

      unsubscribe();
    });

    it('should properly clean up both subscriptions when unsubscribed', () => {
      const left = anchor({ value: 1 });
      const right = anchor({ value: 2 });
      const leftHandler = vi.fn();
      const rightHandler = vi.fn();

      // Set up additional listeners to verify cleanup
      const unsubscribeDeriveLeft = derive(left, leftHandler);
      const unsubscribeDeriveRight = derive(right, rightHandler);

      // Bind the states
      const unsubscribeBind = derive.bind(left, right);

      // Clear initial calls
      leftHandler.mockClear();
      rightHandler.mockClear();

      // Update left - both bound states and separate listeners should be notified
      left.value = 10;
      expect(leftHandler).toHaveBeenCalled();
      expect(rightHandler).toHaveBeenCalled();

      // Clear mocks
      leftHandler.mockClear();
      rightHandler.mockClear();

      // Unsubscribe the binding
      unsubscribeBind();

      // Update left again - only separate listeners should be notified
      left.value = 20;
      expect(leftHandler).toHaveBeenCalled();
      expect(rightHandler).not.toHaveBeenCalled(); // Right should not be updated through binding
      expect(right.value).toBe(10); // Should retain previous value

      // Clean up
      unsubscribeDeriveLeft();
      unsubscribeDeriveRight();
    });

    it('should handle rapid successive updates without conflicts', () => {
      const left = anchor({ value: 0 });
      const right = anchor({ value: 0 });

      const unsubscribe = derive.bind(left, right);

      // Perform rapid updates
      left.value = 1;
      left.value = 2;
      left.value = 3;
      right.value = 4;
      right.value = 5;
      left.value = 6;

      // Final values should be consistent
      expect(left.value).toBe(6);
      expect(right.value).toBe(6);

      unsubscribe();
    });

    it('should handle binding with nested object transformations', () => {
      const left = anchor({
        user: {
          profile: {
            name: 'John',
            settings: { theme: 'dark' },
          },
        },
      });

      const right = anchor({
        userData: {
          fullName: 'John',
          preferences: { mode: 'dark' },
        },
      });

      const unsubscribe = derive.bind(
        left,
        right,
        (current) => ({
          userData: {
            fullName: current.user.profile.name,
            preferences: {
              mode: current.user.profile.settings.theme,
            },
          },
        }),
        (current) => ({
          user: {
            profile: {
              name: current.userData.fullName,
              settings: {
                theme: current.userData.preferences.mode,
              },
            },
          },
        })
      );

      // Initial binding
      expect(left.user.profile.name).toBe('John');
      expect(right.userData.fullName).toBe('John');

      // Update nested property on left
      left.user.profile.name = 'Jane';
      expect(right.userData.fullName).toBe('Jane');

      // Update nested property on right
      right.userData.preferences.mode = 'light';
      expect(left.user.profile.settings.theme).toBe('light');

      unsubscribe();
    });
  });
});
