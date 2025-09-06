import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, type ObjLike } from '../../src/index.js';
import { z } from 'zod';

describe('Anchor Core - Read-Only', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Strict Immutability', () => {
    it('should prevent updating property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.count = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent adding property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (state as ObjLike).newProperty = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent deleting property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      delete (state as ObjLike).count;
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should prevent updating nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.profile.name = 'John Smith';

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent deleting nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      delete (state.profile as ObjLike).name;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent adding nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (state.profile as ObjLike).newProperty = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent mutating array', () => {
      const state = anchor([1, 2, 3], { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.push(4);
      state.pop();
      state.unshift(0);
      state.shift();
      state.splice(1, 1);
      state.reverse();
      state.sort();
      state.fill(0);
      state.copyWithin(0, 1);

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(9);

      errorSpy.mockRestore();
    });

    it('should create an immutable state with schema', () => {
      const handler = vi.fn();
      const schema = z.object({
        name: z.string().min(2),
      });
      const state = anchor.immutable({ name: 'John' }, schema);

      expect(state).toEqual({ name: 'John' });

      // Invalid assignment.
      (state as { name: number }).name = 30;
      expect(errorSpy).toHaveBeenCalledTimes(1);

      const writer = anchor.writable(state);
      const unsubscribe = anchor.catch(state, handler);

      writer.name = 'Jane';
      expect(state).toEqual({ name: 'Jane' });
      expect(handler).not.toHaveBeenCalled();

      writer.name = 'J';
      expect(handler).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should handle catching exception of non reactive state', () => {
      const handler = vi.fn();
      const unsubscribe = anchor.catch({}, handler);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('Read Function', () => {
    it('should create a read-only proxy of a state object', () => {
      const state = anchor({ count: 1, text: 'hello' });
      const readOnly = anchor.read(state);

      // Should be able to read values
      expect(readOnly.count).toBe(1);
      expect(readOnly.text).toBe('hello');
    });

    it('should prevent mutations on read-only proxy', () => {
      const state = anchor({ count: 1 });
      const readOnly = anchor.read(state);

      // Try to mutate the read-only proxy
      (readOnly as ObjLike).count = 2;

      // Should trigger an error
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should recursively create read-only proxies for nested objects', () => {
      const state = anchor({
        count: 1,
        profile: {
          name: 'John',
          settings: {
            theme: 'dark',
          },
        },
      });

      const readOnly = anchor.read(state);

      // Should be able to read nested values
      expect(readOnly.profile.name).toBe('John');
      expect(readOnly.profile.settings.theme).toBe('dark');

      // Nested objects should also be read-only
      expect(typeof readOnly.profile).toBe('object');
      expect(typeof readOnly.profile.settings).toBe('object');
    });

    it('should prevent mutations on nested objects in read-only proxy', () => {
      const state = anchor({
        count: 1,
        profile: {
          name: 'John',
          settings: {
            theme: 'dark',
          },
        },
      });
      const readOnly = anchor.read(state);

      // Try to mutate nested objects
      (readOnly.profile as ObjLike).name = 'Jane';
      (readOnly.profile.settings as ObjLike).theme = 'light';

      // Should trigger errors
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });

    it('should work with arrays', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = anchor<any>([1, 2, { nested: 'value' }]);
      const readOnly = anchor.read(state);

      // Should be able to read values
      expect(readOnly[0]).toBe(1);
      expect(readOnly[1]).toBe(2);
      expect(readOnly[2].nested).toBe('value');
    });

    it('should prevent mutations on read-only arrays', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = anchor<any>([1, 2, 3]);
      const readOnly = anchor.read(state);

      // Try to mutate the array
      readOnly[0] = 10;
      readOnly.push(4);

      // Should trigger errors
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should prevent deleting a property', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = anchor<any>({ a: 1 });
      const readOnly = anchor.read(state);

      delete readOnly.a;
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should prevent mutating a collection', () => {
      const map = anchor(new Map());
      const set = anchor(new Set());
      const readonlyMap = anchor.read(map);
      const readonlySet = anchor.read(set);

      (readonlyMap as Map<unknown, unknown>).set('a', 1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(anchor.get(map)).toEqual(new Map());

      (readonlySet as Set<unknown>).add(1);
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(anchor.get(set)).toEqual(new Set());

      (readonlyMap as Map<unknown, unknown>).delete('a');
      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(anchor.get(map)).toEqual(new Map());

      (readonlySet as Set<unknown>).delete(1);
      expect(errorSpy).toHaveBeenCalledTimes(4);
      expect(anchor.get(set)).toEqual(new Set());

      (readonlyMap as Map<unknown, unknown>).clear();
      expect(errorSpy).toHaveBeenCalledTimes(5);
      expect(anchor.get(map)).toEqual(new Map());

      (readonlySet as Set<unknown>).clear();
      expect(errorSpy).toHaveBeenCalledTimes(6);
      expect(anchor.get(set)).toEqual(new Set());
    });

    it('should not affect the original state when creating a read-only proxy', () => {
      const state = anchor({ count: 1 });
      const originalCount = state.count;

      const readOnly = anchor.read(state);

      // Modifying the original state should not be affected by the read-only proxy creation
      state.count = 2;

      expect(state.count).toBe(2);
      expect(originalCount).toBe(1);
      // The read-only proxy should reflect the current state
      expect(readOnly.count).toBe(2);
    });
  });
});
