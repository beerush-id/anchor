import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger } from '../../src/index.js';

describe('Anchor Core - Basic Operations', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should not create non-linkable object', () => {
      const failNumber = anchor(1 as never);
      const failString = anchor('1' as never);
      const failBoolean = anchor(true as never);
      const failNull = anchor(null as never);
      const failUndefined = anchor(undefined as never);

      expect(failNumber).toBe(1);
      expect(failString).toBe('1');
      expect(failBoolean).toBe(true);
      expect(failNull).toBe(null);
      expect(failUndefined).toBe(undefined);

      expect(errorSpy).toHaveBeenCalledTimes(5);
    });

    it('should create state for linkable object', () => {
      const objState = anchor({ count: 0 });
      const arrState = anchor([1, 2, 3]);
      const mapState = anchor(new Map([['key', 'value']]));
      const setState = anchor(new Set([1, 2, 3]));

      expect(anchor.get(objState)).toEqual({ count: 0 });
      expect(anchor.get(arrState)).toEqual([1, 2, 3]);
      expect(anchor.get(mapState)).toEqual(new Map([['key', 'value']]));
      expect(anchor.get(setState)).toEqual(new Set([1, 2, 3]));
    });

    it('should handle initialization with existing state', () => {
      const state = anchor({ name: 'John Smith' });
      const profile = anchor.get(state); // Get the underlying init object.

      expect(state).not.toBe(profile); // Should be a new object due to soft clone.
      expect(state.name).toBe(profile.name); // Should have the same name.

      const newState = anchor(profile); // Should return the same state.
      expect(newState).toBe(state);
      expect(newState.name).toBe(profile.name);

      const newState2 = anchor(state);
      expect(newState2).toBe(state);
      expect(newState2.name).toBe(profile.name);
    });

    it('should handle defined deferred option', () => {
      const state = anchor(
        {
          count: 1,
          profile: { name: 'John Smith' },
        },
        { deferred: false } // Should be ignored due to child state always be deferred.
      );
      const profile = anchor.get(state).profile;

      expect(derive.resolve(profile)).toBeUndefined(); // Should be undefined due to child state haven't been accessed.
    });

    it('should change the default options', () => {
      anchor.configure({ immutable: true });

      const state = anchor({ count: 1 });

      state.count++; // Failed due to immutable state.

      expect(state.count).toBe(1);
      expect(errorSpy).toHaveBeenCalled();

      anchor.configure({ immutable: false }); // Reset to default.
    });
  });

  describe('Read and Write', () => {
    it('should create an object', () => {
      const state = anchor({ count: 0 });
      expect(state.count).toBe(0);
    });

    it('should update object properties', () => {
      const state = anchor({ count: 0 });
      state.count = 1;
      expect(state.count).toBe(1);
    });

    it('should track multiple property updates', () => {
      const state = anchor({ x: 0, y: 0 });
      state.x = 1;
      state.y = 2;
      expect(state.x).toBe(1);
      expect(state.y).toBe(2);
    });

    it('should create an array', () => {
      const state = anchor([1, 2, 3]);
      expect(state.length).toBe(3);
      expect(state[0]).toBe(1);
    });

    it('should update array elements', () => {
      const state = anchor([1, 2, 3]);
      state[0] = 10;
      expect(state[0]).toBe(10);
    });

    it('should handle complex nested objects', () => {
      const state = anchor({
        user: {
          name: 'John',
          profile: {
            age: 30,
          },
        },
      });

      state.user.name = 'Jane';
      state.user.profile.age = 31;

      expect(state.user.name).toBe('Jane');
      expect(state.user.profile.age).toBe(31);
    });
  });
});
