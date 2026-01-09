import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createArrayMutator } from '../../src/array.js';
import { createCollectionGetter, createCollectionMutator } from '../../src/collection.js';
import { createLinkFactory } from '../../src/factory.js';
import { anchor, type Linkable, subscribe } from '../../src/index.js';
import { createGetter, createRemover, createSetter } from '../../src/trap.js';

describe('Anchor Core - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // errorSpy = vi.spyOn(console, 'error');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Edge Cases - Basic', () => {
    it('should handle setting same value', () => {
      const state = anchor({ count: 1 });
      const handler = vi.fn();

      const unsubscribe = subscribe(state, handler);
      state.count = 1; // Same value

      // Should not trigger update
      expect(handler).toHaveBeenCalledTimes(1); // only init
      unsubscribe();
    });

    it('should handle setting an existing state as value', () => {
      const user = anchor({ name: 'John' });
      const state = anchor<Record<string, unknown>>({ jane: { name: 'Jane' } });

      state.john = user;

      expect(state.john).toBe(user);
      expect(state.jane).toEqual({ name: 'Jane' });
      expect(anchor.get(state.john as Linkable)).toBe(anchor.get(user));
      expect(anchor.get(state.jane as Linkable)).not.toBe(user);
      expect(state.jane).not.toBe(anchor.get(user));
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

    it('should handle getting the underlying object of non-reactive', () => {
      const profile = { name: 'John Doe' };
      const init = anchor.get(profile);

      expect(init).toBe(profile); // Should return the given input itself.
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle snapshotting non-reactive objects', () => {
      const snapshot = anchor.snapshot({ name: 'John Doe' });
      expect(snapshot).toEqual({ name: 'John Doe' });
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle destroying non reactive object', () => {
      anchor.destroy({ name: 'John Doe' });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle destroying non reactive object with warning', () => {
      (anchor.destroy as (state: unknown, warn: boolean) => void)({ name: 'John Doe' }, true);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle stringify state', () => {
      const state = anchor({ name: 'John Doe' });
      const stringified = anchor.stringify(state);

      expect(stringified).toBe('{"name":"John Doe"}');
    });

    it('should handle stringify non-existence state', () => {
      const state = { name: 'John Doe' };
      const stringified = anchor.stringify(state);

      expect(stringified).toBe('{"name":"John Doe"}');
      expect(errorSpy).toHaveBeenCalled();
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
    it('should throw when trying to create array mutator with no reference', () => {
      expect(() => {
        createArrayMutator([] as never);
      }).toThrow('Array trap factory called on non-reactive state.');
    });

    it('should throw when trying to create collection getter with no reference', () => {
      expect(() => {
        createCollectionGetter({} as never);
      }).toThrow('Get trap factory called on non-reactive state.');
    });

    it('should throw when trying to create collection mutator with no reference', () => {
      expect(() => {
        createCollectionMutator({} as never);
      }).toThrow('Collection trap factory called on non-reactive state.');
    });

    it('should handle linking with existing subscription', () => {
      const subscriptions = new WeakMap();
      const state = anchor({ count: 1 });
      subscriptions.set(state, {} as never);

      const link = createLinkFactory({}, { subscriptions } as never);
      const result = link('', state);

      expect(result).toBeUndefined();
      expect(subscriptions.has(result as never)).toBe(false);
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
      const unsubscribe = subscribe(state, handler);

      state.id = 2;
      expect(handler).toHaveBeenCalledTimes(2); // Init + change id.

      profile.name = 'Jane Doe';
      expect(handler).toHaveBeenCalledTimes(3); // Not notified due no actual read from the root state.
      expect(state.profile.name).toBe('Jane Doe'); // Trigger subscription to the profile (read: state.profile).

      profile.name = 'John Smith';
      expect(handler).toHaveBeenCalledTimes(4);
      expect(state.profile.name).toBe('John Smith');

      state.profile = { name: 'Jim Doe' };
      expect(handler).toHaveBeenCalledTimes(5); // ... + change profile
      expect(state.profile.name).toBe('Jim Doe');
      expect(profile.name).toBe('John Smith');

      profile.name = 'Jane Smith';
      expect(handler).toHaveBeenCalledTimes(5); // No change since the previous profile no longer its children.
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
      const unsubscribe = subscribe(state, handler);

      profile.name = 'Jane Doe';
      expect(handler).toHaveBeenCalledTimes(2); // Init + name change.
      state.profile.name = 'John Smith'; // Read to profile (state.profile) will trigger subscription.
      expect(state.profile.name).toBe('John Smith');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).profile;
      expect(handler).toHaveBeenCalledTimes(4); // ... change name ('John Smith') + delete profile
      expect(state.profile).toBeUndefined();
      expect(profile.name).toBe('John Smith');

      profile.name = 'Jane Smith';
      expect(handler).toHaveBeenCalledTimes(4); // No change since the previous profile no longer its children.
      expect(state.profile).toBeUndefined();
      expect(profile.name).toBe('Jane Smith');

      unsubscribe();
    });

    it('should unlink the previous item after mutating array', () => {
      const state = anchor([{ name: 'John Smith' }]);
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);
      const profile = state[0];

      expect(profile.name).toBe('John Smith');
      expect(handler).toHaveBeenCalledTimes(1); // Init.

      profile.name = 'Jane Smith';
      expect(profile.name).toBe('Jane Smith');
      expect(state[0].name).toBe('Jane Smith');
      expect(handler).toHaveBeenCalledTimes(2);

      state.splice(0, 1, { name: 'Jim Smith' });
      expect(profile.name).toBe('Jane Smith');
      expect(state[0].name).toBe('Jim Smith');
      expect(handler).toHaveBeenCalledTimes(3); // From splice.

      profile.name = 'Michael Smith';
      expect(profile.name).toBe('Michael Smith');
      expect(state[0].name).toBe('Jim Smith');

      expect(handler).toHaveBeenCalledTimes(3); // No change due to no link to the old profile.

      unsubscribe();
    });

    it('should unlink the previous subscriptions after mutating Map', () => {
      const state = anchor(new Map([['profile', { name: 'John Smith' }]]));
      const handler = vi.fn();
      const unsubscribe = subscribe(state, handler);
      const profile = state.get('profile') as { name: string };

      expect(profile.name).toBe('John Smith');
      expect(handler).toHaveBeenCalledTimes(1); // Init.

      profile.name = 'Jane Smith';
      expect(profile.name).toBe('Jane Smith');
      expect(handler).toHaveBeenCalledTimes(2); // Change name.

      state.set('profile', { name: 'John Doe' });
      expect(state.get('profile')).toEqual({ name: 'John Doe' });
      expect(handler).toHaveBeenCalledTimes(3); // Change profile.

      profile.name = 'Michael Smith';
      expect(profile.name).toBe('Michael Smith');
      expect(state.get('profile')).toEqual({ name: 'John Doe' }); // No change
      expect(handler).toHaveBeenCalledTimes(3); // No change due to invalidated subscription.

      (state.get('profile') as { name: string }).name = 'Michael Doe';
      expect(profile.name).toBe('Michael Smith'); // Doesn't interfere with the original object.
      expect(state.get('profile')).toEqual({ name: 'Michael Doe' });

      expect(handler).toHaveBeenCalledTimes(4); // Change new profile name.

      const newProfile = state.get('profile') as { name: string };
      expect(newProfile.name).toBe('Michael Doe');

      state.clear(); // Cleaning up all subscriptions.
      newProfile.name = 'Undefined';
      expect(newProfile.name).toBe('Undefined');
      expect(state.get('profile')).toBeUndefined();
      expect(handler).toHaveBeenCalledTimes(5); // Only from the clear() event.

      unsubscribe();
    });
  });
});
