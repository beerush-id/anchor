import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, history, logger } from '../../src/index.js';

const defaultOptions = { debounce: 100, maxHistory: 100 };
const timeTravel = (time?: number) => vi.advanceTimersByTime(time ?? defaultOptions.debounce);

describe('Anchor History - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    errorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    errorSpy.mockRestore();
  });

  describe('Edge Cases', () => {
    it('should handle history with maxHistory limit', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 3 });

      // Make more changes than maxHistory
      for (let i = 1; i <= 10; i++) {
        state.count = i;
        timeTravel();
      }

      expect(stateHistory.backwardList).toHaveLength(3);
      expect(state.count).toBe(10);

      // Go back through history
      stateHistory.backward();
      expect(state.count).toBe(9);

      stateHistory.backward();
      expect(state.count).toBe(8);

      stateHistory.backward();
      expect(state.count).toBe(7);

      // Can't go back further
      stateHistory.backward();
      expect(state.count).toBe(7); // No change

      stateHistory.destroy();
    });

    it('should handle rapid successive changes with debouncing', () => {
      const state = anchor({ value: 0 });
      const stateHistory = history(state);

      // Simulate rapid changes (faster than debounce time)
      state.value = 1;
      vi.advanceTimersByTime(10);
      state.value = 2;
      vi.advanceTimersByTime(10);
      state.value = 3;
      vi.advanceTimersByTime(10);
      state.value = 4;
      vi.advanceTimersByTime(10);

      // Before debounce timeout, no history should be recorded
      expect(stateHistory.backwardList).toHaveLength(0);

      // After debounce timeout, only the last change should be recorded
      timeTravel();
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.backwardList[0].value).toBe(4); // Previous value
      expect(stateHistory.backwardList[0].prev).toBe(0); // Original value

      stateHistory.destroy();
    });

    it('should handle complex nested object changes', () => {
      const state = anchor({
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'light',
              notifications: true,
            },
          },
        },
        items: [1, 2, 3],
      });

      const stateHistory = history(state);

      // Make nested changes
      state.user.profile.name = 'Jane';
      timeTravel();

      state.user.profile.settings.theme = 'dark';
      timeTravel();

      state.items.push(4);
      timeTravel();

      state.items.splice(0, 1);
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(4);
      expect(state.user.profile.name).toBe('Jane');
      expect(state.user.profile.settings.theme).toBe('dark');
      expect(state.items).toEqual([2, 3, 4]);

      // Test undo functionality
      stateHistory.backward(); // Undo splice
      expect(state.items).toEqual([1, 2, 3, 4]);

      stateHistory.backward(); // Undo push
      expect(state.items).toEqual([1, 2, 3]);

      stateHistory.backward(); // Undo theme change
      expect(state.user.profile.settings.theme).toBe('light');

      stateHistory.backward(); // Undo name change
      expect(state.user.profile.name).toBe('John');

      stateHistory.destroy();
    });

    it('should handle Map and Set changes in history', () => {
      const state = anchor({
        map: new Map([['key1', 'value1']]),
        set: new Set([1, 2, 3]),
      });

      const stateHistory = history(state);

      // Make changes to Map
      state.map.set('key2', 'value2');
      timeTravel();

      state.map.delete('key1');
      timeTravel();

      // Make changes to Set
      state.set.add(4);
      timeTravel();

      state.set.delete(2);
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(4);

      // Test undo functionality
      stateHistory.backward(); // Undo set.delete
      expect(state.set.has(2)).toBe(true);

      stateHistory.backward(); // Undo set.add
      expect(state.set.has(4)).toBe(false);

      stateHistory.backward(); // Undo map.delete
      expect(state.map.has('key1')).toBe(true);

      stateHistory.backward(); // Undo map.set
      expect(state.map.has('key2')).toBe(false);

      stateHistory.destroy();
    });

    it('should handle history operations when lists are empty', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      // Try to go forward when there's no forward history
      stateHistory.forward();
      expect(state.count).toBe(0);

      // Try to go backward when there's no backward history
      stateHistory.backward();
      expect(state.count).toBe(0);

      // Make a change and test
      state.count = 1;
      timeTravel();

      // Now we can go back
      stateHistory.backward();
      expect(state.count).toBe(0);

      // Can't go back further
      stateHistory.backward();
      expect(state.count).toBe(0);

      // Can go forward
      stateHistory.forward();
      expect(state.count).toBe(1);

      // Can't go forward further
      stateHistory.forward();
      expect(state.count).toBe(1);

      stateHistory.destroy();
    });

    it('should handle history reset and clear operations', () => {
      const state = anchor({ count: 5 });
      const stateHistory = history(state);

      state.count = 10;
      timeTravel();

      state.count = 15;
      timeTravel();

      expect(state.count).toBe(15);
      expect(stateHistory.backwardList).toHaveLength(2);
      expect(stateHistory.forwardList).toHaveLength(0);

      // Clear history
      stateHistory.clear();
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);
      expect(state.count).toBe(15); // State unchanged

      // Test with new changes after clear
      state.count = 20;
      timeTravel();
      expect(stateHistory.backwardList).toHaveLength(1);

      stateHistory.backward();
      expect(state.count).toBe(15);

      // Reset to initial state
      stateHistory.reset();
      expect(state.count).toBe(5); // Back to initial value
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle history with array mutation methods', () => {
      const state = anchor({
        items: [1, 2, 3, 4, 5],
      });

      const stateHistory = history(state);

      // Test various array methods
      state.items.push(6); // [1, 2, 3, 4, 5, 6]
      timeTravel();
      expect(state.items).toEqual([1, 2, 3, 4, 5, 6]);

      state.items.pop(); // [1, 2, 3, 4, 5]
      timeTravel();
      expect(state.items).toEqual([1, 2, 3, 4, 5]);

      state.items.shift(); // [2, 3, 4, 5]
      timeTravel();
      expect(state.items).toEqual([2, 3, 4, 5]);

      state.items.unshift(0); // [0, 2, 3, 4, 5]
      timeTravel();
      expect(state.items).toEqual([0, 2, 3, 4, 5]);

      state.items.splice(1, 2, 10, 20); // [0, 10, 20, 4, 5]
      timeTravel();
      expect(state.items).toEqual([0, 10, 20, 4, 5]);

      expect(stateHistory.backwardList).toHaveLength(5);

      // Test undo operations restore previous arrays correctly
      stateHistory.backward(); // Undo splice - [0, 2, 3, 4, 5]
      expect(state.items).toEqual([0, 2, 3, 4, 5]);

      stateHistory.backward(); // Undo unshift - [2, 3, 4, 5]
      expect(state.items).toEqual([2, 3, 4, 5]);

      stateHistory.backward(); // Undo shift - [1, 2, 3, 4, 5]
      expect(state.items).toEqual([1, 2, 3, 4, 5]);

      stateHistory.backward(); // Undo pop - [1, 2, 3, 4, 5, 6]
      expect(state.items).toEqual([1, 2, 3, 4, 5, 6]);

      stateHistory.backward(); // Undo push
      expect(state.items).toEqual([1, 2, 3, 4, 5]);

      stateHistory.destroy();
    });
  });
});
