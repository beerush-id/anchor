import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger } from '../../src/index.js';

describe('Anchor Core - Edge Cases', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Edge Cases', () => {
    it('should handle setting same value', () => {
      const state = anchor({ count: 1 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      state.count = 1; // Same value

      // Should not trigger update
      expect(handler).toHaveBeenCalledTimes(1); // only init
      unsubscribe();
    });

    it('should handle nested array operations', () => {
      const state = anchor({
        todos: [
          { id: 1, text: 'Task 1' },
          { id: 2, text: 'Task 2' },
        ],
      });

      state.todos.push({ id: 3, text: 'Task 3' });
      expect(state.todos.length).toBe(3);
      expect(state.todos[2].text).toBe('Task 3');
    });

    it('should handle Map objects', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const state = anchor({ map });

      expect(state.map).toBeInstanceOf(Map);
      expect(state.map.get('key1')).toBe('value1');
    });

    it('should handle Set objects', () => {
      const set = new Set(['value1', 'value2']);
      const state = anchor({ set });

      expect(state.set).toBeInstanceOf(Set);
      expect(state.set.has('value1')).toBe(true);
    });
  });
});
