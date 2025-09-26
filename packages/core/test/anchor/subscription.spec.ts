import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, MapMutations, SetMutations, subscribe } from '../../src/index.js';

describe('Anchor Core - Subscription', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Subscription', () => {
    it('should verify that the emitted value is not the state itself', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();

      let sameState = false;

      const unsubscribe = subscribe(state, (value, event) => {
        handler(value, event);

        if (event?.type !== 'init') {
          sameState = value === state;
        }
      });

      state.b = 10;

      expect(sameState).toBe(false);
      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'set', prev: 2, keys: ['b'], value: 10 });

      unsubscribe();
    });

    it('should notify subscribers of Object property changes', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);
      state.count = 1;

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'set', prev: 0, keys: ['count'], value: 1 });

      unsubscribe();
    });

    it('should handle property deletion and notify subscribers', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      delete (state as { a?: number }).a;

      expect(state).toEqual({ b: 2 }); // Check final state
      expect(handler).toHaveBeenCalledTimes(2); // init + delete
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'delete', prev: 1, keys: ['a'] });

      unsubscribe();
    });

    it('should notify subscribers of Array mutations', () => {
      const state = anchor([1, 2, 3]);
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);
      state.push(4);

      expect(handler).toHaveBeenCalledTimes(2); // init + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'push', prev: [1, 2, 3], keys: [], value: [4] });

      unsubscribe();
    });

    it('should notify subscribers of Map changes', () => {
      const map = new Map([['a', 1]]);
      const state = anchor({ map });
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      state.map.set('b', 2);

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(2, anchor.get(state), {
        type: MapMutations.SET,
        prev: undefined,
        keys: ['map', 'b'],
        value: 2,
      }); // assuming nested path
      expect(state.map.get('b')).toBe(2);

      unsubscribe();
    });

    it('should notify subscribers of Set changes', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      state.set.add(3);

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(2, anchor.get(state), {
        type: SetMutations.ADD,
        prev: undefined,
        keys: ['set'],
        value: 3,
      }); // assuming nested path
      expect(state.set.has(3)).toBe(true);

      unsubscribe();
    });

    it('should notify subscribers of Nested Array mutations', () => {
      const state = anchor({
        todos: [{ id: 1, title: 'foo', completed: false }],
      });

      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);

      state.todos[0].completed = true;
      state.todos.push({ id: 2, title: 'bar', completed: false });

      expect(handler).toHaveBeenCalledTimes(3); // init + set + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'set',
        prev: false,
        keys: ['todos', '0', 'completed'],
        value: true,
      });
      expect(handler).toHaveBeenNthCalledWith(3, state, {
        type: 'push',
        prev: [{ id: 1, title: 'foo', completed: true }],
        keys: ['todos'],
        value: [{ id: 2, title: 'bar', completed: false }],
      });

      unsubscribe();
    });

    it('should properly unsubscribe', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);
      unsubscribe();

      state.count = 1;
      expect(handler).toHaveBeenCalledTimes(1); // only init, no set
    });
  });

  describe('Flat Subscription', () => {
    it('should notify subscribers of flat array mutations', () => {
      const state = anchor(['a', 'b'], { recursive: 'flat' });
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);
      state.push('c');

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'push',
        keys: [],
        prev: ['a', 'b'],
        value: ['c'],
      });
      expect(state).toEqual(['a', 'b', 'c']);

      unsubscribe();
    });

    it('should not notify subscribers of nested path in array changes', () => {
      const state = anchor([{ name: 'John' }], { recursive: 'flat' });
      const handler = vi.fn();
      const childHandler = vi.fn();
      const unsubscribe = subscribe(state, handler);
      const childUnsubscribe = subscribe(state[0], childHandler);

      // This change should trigger a notification.
      state.push({ name: 'Jane' });

      expect(handler).toHaveBeenCalledTimes(2); // init + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'push',
        prev: [{ name: 'John' }],
        keys: [],
        value: [{ name: 'Jane' }],
      });

      // This change should not trigger a top-level notification, but should trigger a child notification.
      state[0].name = 'John Smith';

      expect(handler).not.toHaveBeenCalledTimes(3);
      expect(childHandler).toHaveBeenCalledTimes(2); // init + set
      expect(childHandler).toHaveBeenNthCalledWith(1, state[0], { type: 'init', keys: [] });
      expect(childHandler).toHaveBeenNthCalledWith(2, state[0], {
        type: 'set',
        prev: 'John',
        keys: ['name'],
        value: 'John Smith',
      });
      expect(state).toEqual([{ name: 'John Smith' }, { name: 'Jane' }]);
      expect(state[0].name).toBe('John Smith');

      unsubscribe();
      childUnsubscribe();
    });
  });
});
