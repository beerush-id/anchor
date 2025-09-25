import { describe, expect, it, vi } from 'vitest';
import { anchor, undoable } from '../../src/index.js';

describe('Anchor History - Undoable', () => {
  describe('Basic Operations', () => {
    it('should create an undoable operation that can be reverted', () => {
      const state = anchor({ count: 0 });

      expect(state.count).toBe(0);

      const [undo] = undoable(() => {
        state.count = 1;
        state.count = 2;
      });

      expect(state.count).toBe(2);

      undo();
      expect(state.count).toBe(0);
    });

    it('should handle nested object changes', () => {
      const state = anchor({
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'light',
            },
          },
        },
      });

      const [undo] = undoable(() => {
        state.user.profile.name = 'Jane';
        state.user.profile.settings.theme = 'dark';
      });

      expect(state.user.profile.name).toBe('Jane');
      expect(state.user.profile.settings.theme).toBe('dark');

      undo();
      expect(state.user.profile.name).toBe('John');
      expect(state.user.profile.settings.theme).toBe('light');
    });

    it('should handle array operations', () => {
      const state = anchor({
        items: [1, 2, 3],
      });

      const [undo] = undoable(() => {
        state.items.push(4);
        state.items.splice(0, 1);
      });

      expect(state.items).toEqual([2, 3, 4]);

      undo();
      expect(state.items).toEqual([1, 2, 3]);
    });

    it('should handle Map and Set operations', () => {
      const state = anchor({
        map: new Map([['key1', 'value1']]),
        set: new Set([1, 2, 3]),
      });

      const [undo] = undoable(() => {
        state.map.set('key2', 'value2');
        state.map.delete('key1');
        state.set.add(4);
        state.set.delete(2);
      });

      expect(state.map.has('key1')).toBe(false);
      expect(state.map.has('key2')).toBe(true);
      expect(state.set.has(2)).toBe(false);
      expect(state.set.has(4)).toBe(true);

      undo();

      expect(state.set.has(2)).toBe(true);
      expect(state.set.has(4)).toBe(false);
      expect(state.map.has('key1')).toBe(true);
      expect(state.map.has('key2')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty operations', () => {
      const state = anchor({ count: 0 });

      const [undo] = undoable(() => {
        // Empty operation
      });

      expect(state.count).toBe(0);
      undo();
      expect(state.count).toBe(0);
    });

    it('should handle operations with no state changes', () => {
      const state = anchor({ count: 0 });

      const [undo] = undoable(() => {
        const x = 1 + 1; // No state changes
        return x;
      });

      expect(state.count).toBe(0);
      undo();
      expect(state.count).toBe(0);
    });

    it('should handle multiple sequential undoable operations', () => {
      const state = anchor({ count: 0 });

      const [undo1] = undoable(() => {
        state.count = 1;
      });

      const [undo2] = undoable(() => {
        state.count = 2;
      });

      expect(state.count).toBe(2);

      undo2();
      expect(state.count).toBe(1);

      undo1();
      expect(state.count).toBe(0);
    });

    it('should handle error in operation', () => {
      const state = anchor({ count: 0 });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const [undo] = undoable(() => {
        state.count = 1;
        throw new Error('Test error');
      });

      expect(state.count).toBe(1);
      expect(errorSpy).toHaveBeenCalled();

      undo();
      expect(state.count).toBe(0);

      errorSpy.mockRestore();
    });

    it('should not throw error when undo is called multiple times', () => {
      const state = anchor({ count: 0 });

      const [undo] = undoable(() => {
        state.count = 1;
      });

      expect(state.count).toBe(1);

      undo();
      expect(state.count).toBe(0);

      expect(() => {
        undo();
      }).not.toThrow();

      expect(state.count).toBe(0);
    });

    it('should handle non-function argument', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // @ts-expect-error Testing invalid argument
      const result = undoable('not a function');

      expect(errorSpy).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('function');
      expect(typeof result[1]).toBe('function');

      const [undo, clear] = result;
      expect(() => {
        undo();
        clear();
      }).not.toThrow();

      errorSpy.mockRestore();
    });

    it('should handle clear function to clear changes', () => {
      const state = anchor({ count: 0 });

      const [undo, clear] = undoable(() => {
        state.count = 1;
      });

      expect(state.count).toBe(1);

      // Clear the changes
      clear();

      // Undo should have no effect after clear
      undo();
      expect(state.count).toBe(1);
    });
  });
});
