import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger } from '../../src/index.js';
import { createGetter, createRemover, createSetter } from '../../src/trap.js';

describe('Anchor Core - Edge Cases', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Edge Cases - Basic', () => {
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

  describe('Edge Cases - Trap Factory Integrity', () => {
    it('should throw error for using createGetter trap with no reference', () => {
      expect(() => {
        createGetter({} as never);
      }).toThrowError('Get trap factory called on non-reactive state.');
    });

    it('should throw error for using createSetter trap with no reference', () => {
      expect(() => {
        createSetter({} as never);
      }).toThrowError('Set trap factory called on non-reactive state.');
    });

    it('should throw error for using createRemover trap with no reference', () => {
      expect(() => {
        createRemover({} as never);
      }).toThrowError('Delete trap factory called on non-reactive state.');
    });
  });

  describe('Edge Cases - Mutation Unlink', () => {
    it('should unlink the previous subscription after changing prop', () => {
      const state = anchor({
        id: 1,
        profile: {
          name: 'John Doe',
        },
      });
      const profile = state.profile;
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      state.id = 2;
      expect(handler).toHaveBeenCalledTimes(2); // Init + change id.

      profile.name = 'Jane Doe';
      expect(handler).toHaveBeenCalledTimes(2); // Not notified due no actual read from the root state.
      expect(state.profile.name).toBe('Jane Doe'); // Trigger subscription to the profile (read: state.profile).

      profile.name = 'John Smith';
      expect(handler).toHaveBeenCalledTimes(3);
      expect(state.profile.name).toBe('John Smith');

      state.profile = { name: 'Jim Doe' };
      expect(handler).toHaveBeenCalledTimes(4); // ... + change profile
      expect(state.profile.name).toBe('Jim Doe');
      expect(profile.name).toBe('John Smith');

      profile.name = 'Jane Smith';
      expect(handler).toHaveBeenCalledTimes(4); // No change since the previous profile no longer its children.
      expect(state.profile.name).toBe('Jim Doe');
      expect(profile.name).toBe('Jane Smith');

      unsubscribe();
    });

    it('should unlink the previous subscriptions after deleting prop', () => {
      const state = anchor({
        id: 1,
        profile: {
          name: 'John Doe',
        },
      });
      const profile = state.profile;
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      profile.name = 'Jane Doe';
      expect(handler).toHaveBeenCalledTimes(1); // Only init due no actual read from the root state after subscription.
      state.profile.name = 'John Smith'; // Read to profile (state.profile) will trigger subscription.
      expect(state.profile.name).toBe('John Smith');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).profile;
      expect(handler).toHaveBeenCalledTimes(3); // ... change name ('John Smith') + delete profile
      expect(state.profile).toBeUndefined();
      expect(profile.name).toBe('John Smith');

      profile.name = 'Jane Smith';
      expect(handler).toHaveBeenCalledTimes(3); // No change since the previous profile no longer its children.
      expect(state.profile).toBeUndefined();
      expect(profile.name).toBe('Jane Smith');

      unsubscribe();
    });
  });
});
