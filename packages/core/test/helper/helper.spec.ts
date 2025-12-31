import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, effect, type ObjLike, subscribe } from '../../src/index.js';

describe('Anchor Helpers', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    it('should assign values to Set state', () => {
      const state = anchor(new Set([1, 2]));
      anchor.assign(state, [3, 4] as never);

      expect(anchor.get(state)).toEqual(new Set([1, 2, 3, 4]));
    });

    it('should assign and replace nested properties', () => {
      const state = anchor({ a: { b: 1, c: 2 } });

      anchor.assign<ObjLike>(state, { a: { b: 3, d: 4 } });

      expect(state).toEqual({ a: { b: 3, d: 4 } });
    });

    it('should notify for an assignment changes', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      anchor.assign(state, { a: 4, c: 5 });

      expect(state).toEqual({ a: 4, b: 2, c: 5 });
      expect(handler).toHaveBeenCalledTimes(2); // init + assign
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'assign',
        keys: [],
        changes: ['a', 'c'],
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

    it('should remove elements from Set state', () => {
      const state = anchor(new Set(['a', 'b', 'c']));
      const handler = vi.fn().mockImplementation(() => {
        expect(state.has('a'));
      });
      const cleanup = effect(handler);

      anchor.remove(state, 'a' as never);

      expect(Array.from(state)).toEqual(['b', 'c']);
      expect(handler).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('should handle single element removal from Array state', () => {
      const state = anchor(['a', 'b', 'c']);
      anchor.remove(state, '1');
      expect(state).toEqual(['a', 'c']);
    });

    it('should throw error when removing from non-assignable state', () => {
      expect(() => {
        anchor.remove('string' as never, 'a');
      }).toThrow('Cannot remove from non-assignable state.');
    });

    it('should notify for removal changes', () => {
      const state = anchor({ a: 1, b: 2, c: 3 });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      anchor.remove(state, 'a', 'c');

      expect(state).toEqual({ b: 2 });
      expect(handler).toHaveBeenCalledTimes(2); // init + remove
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'remove',
        keys: [],
        changes: ['a', 'c'],
        prev: { a: 1, c: 3 },
        value: ['a', 'c'],
      });

      unsubscribe();
    });

    it('should handle removing non-existent properties', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      anchor.remove(state, 'nonexistent' as never, 'a');

      expect(state).toEqual({ b: 2 });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'remove',
        keys: [],
        changes: ['a'],
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
      const unsubscribe = subscribe(state, handler);

      anchor.clear(state);

      expect(state).toEqual({});
      expect(handler).toHaveBeenCalledTimes(2); // init + clear
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'clear',
        keys: [],
        changes: ['a', 'b', 'c'],
        prev: {},
        value: undefined,
      });

      unsubscribe();
    });
  });

  describe('String Operations', () => {
    it('should append string value to existing string property', () => {
      const state = anchor({ text: 'Hello' });

      anchor.append(state, 'text', ' World');

      expect(state.text).toBe('Hello World');
    });

    it('should prepend string value to existing string property', () => {
      const state = anchor({ text: 'World' });

      anchor.prepend(state, 'text', 'Hello ');

      expect(state.text).toBe('Hello World');
    });

    it('should handle empty string append', () => {
      const state = anchor({ text: 'Hello' });

      anchor.append(state, 'text', '');

      expect(state.text).toBe('Hello');
    });

    it('should handle empty string prepend', () => {
      const state = anchor({ text: 'World' });

      anchor.prepend(state, 'text', '');

      expect(state.text).toBe('World');
    });

    it('should handle append with anchor.get', () => {
      const state = anchor({ text: 'Hello' });

      anchor.append(state, 'text', ' World');

      expect(anchor.get(state)).toEqual({ text: 'Hello World' });
    });

    it('should handle prepend with anchor.get', () => {
      const state = anchor({ text: 'World' });

      anchor.prepend(state, 'text', 'Hello ');

      expect(anchor.get(state)).toEqual({ text: 'Hello World' });
    });

    it('should throw error when appending to non-string property', () => {
      const state = anchor({ num: 42 });

      expect(() => {
        anchor.append(state, 'num', 'text' as never);
      }).toThrow('Cannot append to non-string property.');
    });

    it('should throw error when prepending to non-string property', () => {
      const state = anchor({ num: 42 });

      expect(() => {
        anchor.prepend(state, 'num', 'text' as never);
      }).toThrow('Cannot prepend to non-string property.');
    });

    it('should throw error when appending non-string value', () => {
      const state = anchor({ text: 'Hello' });

      expect(() => {
        anchor.append(state, 'text', 123 as never);
      }).toThrow('Cannot append non-string value.');
    });

    it('should throw error when prepending non-string value', () => {
      const state = anchor({ text: 'Hello' });

      expect(() => {
        anchor.prepend(state, 'text', 123 as never);
      }).toThrow('Cannot prepend non-string value.');
    });

    it('should throw error when appending to non-object target', () => {
      expect(() => {
        anchor.append('string' as never, 'prop' as never, 'value' as never);
      }).toThrow('Cannot append to non-object target.');
    });

    it('should throw error when prepending to non-object target', () => {
      expect(() => {
        anchor.prepend('string' as never, 'prop' as never, 'value' as never);
      }).toThrow('Cannot prepend to non-object target.');
    });

    it('should notify for append changes', () => {
      const state = anchor({ text: 'Hello' });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      anchor.append(state, 'text', ' World');

      expect(state.text).toBe('Hello World');
      expect(handler).toHaveBeenCalledTimes(2); // init + append
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'append',
        keys: ['text'],
        prev: 'Hello',
        value: ' World',
      });

      unsubscribe();
    });

    it('should notify for prepend changes', () => {
      const state = anchor({ text: 'World' });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      anchor.prepend(state, 'text', 'Hello ');

      expect(state.text).toBe('Hello World');
      expect(handler).toHaveBeenCalledTimes(2); // init + prepend
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'prepend',
        keys: ['text'],
        prev: 'World',
        value: 'Hello ',
      });

      unsubscribe();
    });
  });
});
