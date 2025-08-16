import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger, type ObjLike } from '../../src/index.js';

describe('Anchor Helpers', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('State Assignment', () => {
    it('should assign values to Object state', () => {
      const state = anchor({ a: 1, b: 2 });

      anchor.assign<ObjLike>(state, { a: 3, c: 4 });

      expect(state).toEqual({ a: 3, b: 2, c: 4 });
    });

    it('should assign values to Array state', () => {
      const state = anchor([1, 2, 3]);

      anchor.assign(state, { 0: 4, 1: 5, 2: 6 });

      expect(state).toEqual([4, 5, 6]);
    });

    it('should assign values to Map state', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );

      anchor.assign(state, {
        a: 3,
        c: 4,
      });

      expect(anchor.get(state)).toEqual(
        new Map([
          ['a', 3],
          ['b', 2],
          ['c', 4],
        ])
      );
      expect(state instanceof Map).toBe(true);
    });

    it('should assign and replace nested properties', () => {
      const state = anchor({ a: { b: 1, c: 2 } });

      anchor.assign<ObjLike>(state, { a: { b: 3, d: 4 } });

      expect(state).toEqual({ a: { b: 3, d: 4 } });
    });

    it('should notify for an assignment changes', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      anchor.assign(state, { a: 4, c: 5 });

      expect(state).toEqual({ a: 4, b: 2, c: 5 });
      expect(handler).toHaveBeenCalledTimes(2); // init + assign
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'assign',
        keys: [],
        prev: { a: 1, c: 3 },
        value: { a: 4, c: 5 },
      });

      unsubscribe();
    });

    it('should throw error when assigning to non-assignable state', () => {
      expect(() => {
        anchor.assign('string' as never, { a: 1 } as never);
      }).toThrow('Cannot assign to non-assignable state.');
    });

    it('should throw error when assigning using non-object value', () => {
      const state = anchor({ a: 1, b: 2 });

      expect(() => {
        anchor.assign(state, 'string' as never);
      }).toThrow('Cannot assign using non-object value.');
    });

    it('should work with array indices correctly', () => {
      const state = anchor(['a', 'b', 'c']);

      anchor.assign(state, { 0: 'x', 2: 'z' });

      expect(state).toEqual(['x', 'b', 'z']);
    });
  });

  describe('State Property Removal', () => {
    it('should remove properties from Object state', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });

      anchor.remove(state, 'a', 'c');

      expect(state).toEqual({ b: 2 });
    });

    it('should remove properties from Map state', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
          ['c', 3],
        ])
      );

      anchor.remove(state, 'a', 'c');

      expect(anchor.get(state)).toEqual(new Map([['b', 2]]));
    });

    it('should remove elements from Array state', () => {
      const state = anchor(['a', 'b', 'c']);

      anchor.remove(state, '0', '2');

      expect(state).toEqual(['b']);
    });

    it('should throw error when removing from non-assignable state', () => {
      expect(() => {
        anchor.remove('string' as never, 'a');
      }).toThrow('Cannot remove from non-assignable state.');
    });

    it('should notify for removal changes', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      anchor.remove(state, 'a', 'c');

      expect(state).toEqual({ b: 2 });
      expect(handler).toHaveBeenCalledTimes(2); // init + remove
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'remove',
        keys: [],
        prev: { a: 1, c: 3 },
        value: ['a', 'c'],
      });

      unsubscribe();
    });

    it('should handle removing non-existent properties', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      anchor.remove(state, 'nonexistent' as never, 'a');

      expect(state).toEqual({ b: 2 });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'remove',
        keys: [],
        prev: { nonexistent: undefined, a: 1 },
        value: ['nonexistent', 'a'],
      });

      unsubscribe();
    });
  });

  describe('State Cleaner', () => {
    it('should clean up state', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });

      expect(state.a).toBe(1);
      expect(state.b).toBe(2);

      anchor.clear(state);

      expect(state.a).toBe(undefined);
      expect(state.b).toBe(undefined);
      expect(state.c).toBe(undefined);
    });

    it('should clean up array state', () => {
      const state = anchor([1, 2, 3]);

      expect(state.length).toBe(3);
      expect(state[0]).toBe(1);
      expect(state[1]).toBe(2);
      expect(state[2]).toBe(3);

      anchor.clear(state);

      expect(state.length).toBe(0);
      expect(state[0]).toBe(undefined);
      expect(state[1]).toBe(undefined);
      expect(state[2]).toBe(undefined);
    });

    it('should clean up map state', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
          ['c', 3],
        ])
      );

      expect(state.size).toBe(3);
      expect(state.get('a')).toBe(1);
      expect(state.get('b')).toBe(2);
      expect(state.get('c')).toBe(3);

      anchor.clear(state);

      expect(state.size).toBe(0);
      expect(state.get('a')).toBe(undefined);
      expect(state.get('b')).toBe(undefined);
      expect(state.get('c')).toBe(undefined);
    });

    it('should throw error when clearing non-assignable state', () => {
      expect(() => {
        anchor.clear('string' as never);
      }).toThrow('Cannot clear non-assignable state.');
    });

    it('should notify for clear changes', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      anchor.clear(state);

      expect(state).toEqual({});
      expect(handler).toHaveBeenCalledTimes(2); // init + clear
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'clear',
        keys: [],
        prev: {},
        value: undefined,
      });

      unsubscribe();
    });
  });
});
