import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, logger } from '../src/index.js';
import { history } from '../src/history/index.js';

describe('Anchor History', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize a history object', () => {
      const state = anchor({ a: 1, b: 2 });
      const stateHistory = history(state);

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toEqual([]);
      expect(stateHistory.forwardList).toEqual([]);
      expect(() => {
        stateHistory.destroy();
      }).not.toThrow();
    });

    it('should work with custom maxHistory option', () => {
      const state = anchor({ a: 1 });
      const stateHistory = history(state, { maxHistory: 5 });

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
    });

    it('should throw error for non-reactive objects', () => {
      expect(() => {
        history({ a: 1, b: 2 });
      }).toThrow('[history] Cannot create history state from non-reactive object.');
    });
  });

  describe('Basic Operations', () => {
    it('should track state changes', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;

      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle backward operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;

      expect(state.count).toBe(2);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.backward();

      expect(state.count).toBe(1);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle forward operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;

      stateHistory.backward();
      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.forward();

      expect(state.count).toBe(1);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.forward();

      expect(state.count).toBe(2);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);

      stateHistory.destroy();
    });

    it('should clear forward list when making new changes', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;

      // Go backward to create forward list
      stateHistory.backward();
      expect(stateHistory.forwardList).toHaveLength(1);
      expect(stateHistory.backwardList).toHaveLength(1);

      // Make a new change, which should clear forward list
      state.count = 3;
      expect(stateHistory.forwardList).toHaveLength(0);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle clear operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;

      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.clear();

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle reset operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;

      stateHistory.backward();
      expect(state.count).toBe(1);

      stateHistory.reset();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxHistory limit', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      // Make more changes than maxHistory
      state.count = 1;
      state.count = 2;
      state.count = 3;
      state.count = 4;

      expect(stateHistory.backwardList).toHaveLength(2);
      // Should only keep the last 2 changes

      stateHistory.destroy();
    });

    it('should handle backward with maxHistory limit', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      state.count = 2;
      state.count = 3;

      // At this point we should have 2 changes in backwardList
      expect(stateHistory.backwardList).toHaveLength(2);
      expect(state.count).toBe(3);

      // Go backward
      stateHistory.backward();
      expect(state.count).toBe(2);
      expect(stateHistory.forwardList).toHaveLength(1);
      expect(stateHistory.backwardList).toHaveLength(1);

      // Add a new change
      state.count = 4;
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle forward with maxHistory limit in backward list', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      state.count = 2;
      state.count = 3;

      stateHistory.backward();

      expect(state.count).toBe(2);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();

      expect(state.count).toBe(1);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(2);

      state.count = 4;

      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle forward with maxHistory limit in forward list', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      state.count = 2;
      state.count = 3;
      state.count = 4;

      // Go back to create forwardList
      stateHistory.backward();
      expect(state.count).toBe(3);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();
      expect(state.count).toBe(2);
      expect(stateHistory.forwardList).toHaveLength(2);

      // Add new change when forwardList is at max
      stateHistory.backward();
      expect(state.count).toBe(2); // No change since we're at the limit
      expect(stateHistory.forwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle multiple backward/forward operations', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      state.count = 2;
      state.count = 3;

      // Go back to the beginning
      stateHistory.backward();
      stateHistory.backward();
      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);

      // Go forward to the end
      stateHistory.forward();
      stateHistory.forward();
      stateHistory.forward();

      expect(state.count).toBe(3);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);

      stateHistory.destroy();
    });

    it('should not track init events', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      expect(stateHistory.backwardList).toHaveLength(0);

      state.count = 1;
      expect(stateHistory.backwardList).toHaveLength(1);

      stateHistory.destroy();
    });

    it('should handle destroy operation properly', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      expect(stateHistory.backwardList).toHaveLength(1);

      stateHistory.destroy();

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      // Should not track changes after destroy
      state.count = 2;
      expect(stateHistory.backwardList).toHaveLength(0);
    });
  });

  describe('Complex Data Structures', () => {
    it('should handle array operations', () => {
      const state = anchor({ items: [1, 2, 3] });
      const stateHistory = history(state);

      state.items.push(4);
      expect(state.items).toEqual([1, 2, 3, 4]);

      stateHistory.backward();
      expect(state.items).toEqual([1, 2, 3]);

      stateHistory.forward();
      expect(state.items).toEqual([1, 2, 3, 4]);

      stateHistory.destroy();
    });

    it('should handle object nesting', () => {
      const state = anchor({ user: { name: 'John', age: 30 } });
      const stateHistory = history(state);

      state.user.name = 'Jane';
      expect(state.user.name).toBe('Jane');

      stateHistory.backward();
      expect(state.user.name).toBe('John');

      stateHistory.forward();
      expect(state.user.name).toBe('Jane');

      stateHistory.destroy();
    });

    it('should handle Map operations', () => {
      const state = anchor({ map: new Map([['key1', 'value1']]) });
      const stateHistory = history(state);

      state.map.set('key2', 'value2');
      expect(state.map.get('key2')).toBe('value2');

      stateHistory.backward();
      expect(state.map.has('key2')).toBe(false);

      stateHistory.forward();
      expect(state.map.get('key2')).toBe('value2');

      stateHistory.destroy();
    });

    it('should handle Set operations', () => {
      const state = anchor({ set: new Set([1, 2, 3]) });
      const stateHistory = history(state);

      state.set.add(4);
      expect(state.set.has(4)).toBe(true);

      stateHistory.backward();
      expect(state.set.has(4)).toBe(false);

      stateHistory.forward();
      expect(state.set.has(4)).toBe(true);

      stateHistory.destroy();
    });
  });

  describe('Special Cases', () => {
    it('should handle Map delete operations', () => {
      const state = anchor({
        map: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      });
      const stateHistory = history(state);

      state.map.delete('key1');
      expect(state.map.has('key1')).toBe(false);

      stateHistory.backward();
      expect(state.map.has('key1')).toBe(true);
      expect(state.map.get('key1')).toBe('value1');

      stateHistory.forward();
      expect(state.map.has('key1')).toBe(false);

      stateHistory.destroy();
    });

    it('should handle Set delete operations', () => {
      const state = anchor({ set: new Set([1, 2, 3]) });
      const stateHistory = history(state);

      state.set.delete(2);
      expect(state.set.has(2)).toBe(false);

      stateHistory.backward();
      expect(state.set.has(2)).toBe(true);

      stateHistory.forward();
      expect(state.set.has(2)).toBe(false);

      stateHistory.destroy();
    });
  });
});
