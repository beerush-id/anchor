import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, getDevTool, setDevTool, subscribe } from '../../src/index.js';
import { createDevTool } from '../../mocks/devtool.js';

describe('Anchor Dev Tool', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let restoreDevTool: () => void;

  beforeEach(() => {
    // eslint-disable-next-line
    // @ts-ignore
    restoreDevTool = setDevTool(createDevTool());
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    restoreDevTool?.();
    errorSpy.mockRestore();
  });

  describe('Dev Tool - Registration', () => {
    it('should register a dev tool', () => {
      const devTool = createDevTool();

      const unset = setDevTool(devTool);
      expect(getDevTool()).toBe(devTool);

      unset?.();
    });

    it('should unregister a dev tool', () => {
      const devTool = createDevTool();

      const unset = setDevTool(devTool);
      expect(getDevTool()).toBe(devTool);

      unset?.();
      expect(getDevTool()).not.toBe(devTool);
    });

    it('should restore to the previous dev tool', () => {
      const devTool = createDevTool();
      const devTool2 = createDevTool();

      setDevTool(devTool);

      expect(getDevTool()).toBe(devTool);

      const unset = setDevTool(devTool2);
      expect(getDevTool()).toBe(devTool2);

      unset?.();
      expect(getDevTool()).toBe(devTool);
    });

    it('should handle invalid dev tool registration', () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(setDevTool(null)).toBeUndefined();
      // eslint-disable-next-line
      // @ts-ignore
      expect(setDevTool(undefined)).toBeUndefined();
      expect(setDevTool('invalid' as never)).toBeUndefined();
      expect(setDevTool(123 as never)).toBeUndefined();
    });

    it('should handle dev tool with invalid callbacks', () => {
      const devTool = {
        onInit: 'not-a-function' as never,
        onGet: 123 as never,
      };

      expect(setDevTool(devTool)).toBeUndefined();
      expect(getDevTool()).not.toBe(devTool);
    });

    it('should handle dev tool with no valid callbacks', () => {
      const devTool = {
        notValid: 'callback',
        anotherInvalid: 123,
      };

      // @ts-expect-error - Testing invalid input
      expect(setDevTool(devTool)).toBeDefined();
      expect(getDevTool()).toBe(devTool);
    });

    it('should handle dev tool with partial callbacks', () => {
      const devTool = {
        onInit: vi.fn(),
      };
      setDevTool(devTool);

      const state = anchor({ name: 'John' });

      expect(state.name).toBe('John');
      expect(() => {
        // eslint-disable-next-line
        // @ts-ignore
        delete state.name;
      }).not.toThrow();
    });
  });

  describe('Dev Tool - Reactive', () => {
    it('should get notified when a state is initialized', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      expect(state.count).toBe(1);
      expect(devTool?.onInit).toHaveBeenCalledTimes(1);
    });

    it('should get notified when a property is accessed', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      // Access property
      const value = state.count;
      expect(value).toBe(1);

      expect(devTool?.onGet).toHaveBeenCalledTimes(1);
      expect(devTool?.onGet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'count'
      );
    });

    it('should get notified when a property is set', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      // Set property
      state.count = 5;
      expect(state.count).toBe(5);

      expect(devTool?.onSet).toHaveBeenCalledTimes(1);
      expect(devTool?.onSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'count',
        5
      );
    });

    it('should get notified when a property is deleted', () => {
      const devTool = getDevTool();
      const state = anchor<{ count?: number }>({ count: 1 });

      // Delete property
      delete state.count;
      expect(state.count).toBeUndefined();

      expect(devTool?.onDelete).toHaveBeenCalledTimes(1);
      expect(devTool?.onDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'count'
      );
    });

    it('should not get notified when deleting non existent property', () => {
      const devTool = getDevTool();
      const state = anchor<{ count?: number }>({ count: 1 });

      // Delete property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).foo;
      expect(state.count).toBe(1);

      expect(devTool?.onDelete).not.toHaveBeenCalled();
    });

    it('should get notified when a method is called (array mutation)', () => {
      const devTool = getDevTool();
      const state = anchor([1, 2, 3]);

      // Call array method
      state.push(4);
      expect(state.length).toBe(4);

      expect(devTool?.onCall).toHaveBeenCalledTimes(1);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'push',
        [4]
      );
    });

    it('should get notified when a method is called (map mutation)', () => {
      const devTool = getDevTool();
      const state = anchor(new Map([['a', 1]]));

      state.set('b', 2);
      expect(state.get('b')).toBe(2);

      expect(devTool?.onCall).toHaveBeenCalledTimes(1);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'set',
        ['b', 2]
      );

      state.delete('b');

      expect(state.get('b')).toBeUndefined();
      expect(devTool?.onCall).toHaveBeenCalledTimes(2);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'delete',
        ['b']
      );

      state.clear();

      expect(state.size).toBe(0);
      expect(devTool?.onCall).toHaveBeenCalledTimes(3);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'clear',
        []
      );
    });

    it('should get notified when a method is called (set mutation)', () => {
      const devTool = getDevTool();
      const state = anchor(new Set([1]));

      state.add(2);
      expect(state.has(2)).toBe(true);

      expect(devTool?.onCall).toHaveBeenCalledTimes(1);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'add',
        [2]
      );

      state.delete(2);

      expect(state.has(2)).toBe(false);
      expect(devTool?.onCall).toHaveBeenCalledTimes(2);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'delete',
        [2]
      );

      state.clear();

      expect(state.size).toBe(0);
      expect(devTool?.onCall).toHaveBeenCalledTimes(3);
      expect(devTool?.onCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        'clear',
        []
      );
    });

    it('should get notified when assign is called', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1, name: 'test' });

      // Call assign
      anchor.assign(state, { count: 5, name: 'updated' });

      expect(state.count).toBe(5);
      expect(state.name).toBe('updated');

      expect(devTool?.onAssign).toHaveBeenCalledTimes(1);
      expect(devTool?.onAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        { count: 5, name: 'updated' }
      );
    });

    it('should get notified when remove is called', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1, name: 'test', active: true });

      // Call remove
      anchor.remove(state, 'name', 'active');

      expect(state.count).toBe(1);
      expect(state.name).toBeUndefined();
      expect(state.active).toBeUndefined();

      expect(devTool?.onRemove).toHaveBeenCalledTimes(1);
      expect(devTool?.onRemove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        ['name', 'active']
      );
    });

    it('should get notified when clear is called', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1, name: 'test' });

      // Call clear
      anchor.clear(state);

      expect(Object.keys(state).length).toBe(0);

      expect(devTool?.onClear).toHaveBeenCalledTimes(1);
      expect(devTool?.onClear).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });

    it('should get notified when a state is subscribed', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      // Subscribe to state
      const unsubscribe = subscribe(state, () => {
        // Do nothing
      });

      expect(devTool?.onSubscribe).toHaveBeenCalledTimes(1);
      expect(devTool?.onSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        expect.any(Function),
        undefined
      );

      unsubscribe();
    });

    it('should get notified when a state is unsubscribed', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      // Subscribe to state
      const unsubscribe = subscribe(state, () => {
        // Do nothing
      });

      // Unsubscribe from state
      unsubscribe();

      expect(devTool?.onUnsubscribe).toHaveBeenCalledTimes(1);
      expect(devTool?.onUnsubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
        expect.any(Function),
        undefined
      );
    });

    it('should get notified when a child state is linked', () => {
      const devTool = getDevTool();
      const child = anchor({ value: 1 });
      const parent = anchor({ child, name: 'parent' });
      const handler = vi.fn();
      const unsubscribe = subscribe(parent, handler);

      // Access child to trigger linking
      const _ = parent.child.value;
      expect(_).toBe(1);

      expect(devTool?.onLink).toHaveBeenCalledTimes(1);
      expect(devTool?.onLink).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) })
      );

      unsubscribe();
    });

    it('should get notified when a child state is unlinked', () => {
      const devTool = getDevTool();
      const child = anchor({ value: 1 });
      const parent = anchor({ child, name: 'parent' });
      const handler = vi.fn();
      const unsubscribe = subscribe(parent, handler);

      // Access child to trigger linking
      const _ = parent.child.value;
      expect(_).toBe(1);

      unsubscribe();

      expect(devTool?.onUnlink).toHaveBeenCalledTimes(1);
      expect(devTool?.onUnlink).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) })
      );
    });

    it('should get notified when a state is destroyed', () => {
      const devTool = getDevTool();
      const state = anchor({ count: 1 });

      // Destroy state
      anchor.destroy(state);

      expect(devTool?.onDestroy).toHaveBeenCalledTimes(1);
      expect(devTool?.onDestroy).toHaveBeenCalledWith(
        expect.objectContaining({
          count: expect.any(Number),
        }),
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });

    it('should handle nested state tracking notifications', () => {
      const devTool = getDevTool();
      const state = anchor({
        user: {
          profile: {
            name: 'John',
          },
        },
      });

      // Access nested property
      const name = state.user.profile.name;
      expect(name).toBe('John');

      expect(devTool?.onGet).toHaveBeenCalledTimes(3);
      expect(devTool?.onGet).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        'user'
      );
      expect(devTool?.onGet).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: expect.any(String),
        }),
        'profile'
      );
      expect(devTool?.onGet).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: expect.any(String),
        }),
        'name'
      );
    });
  });

  describe('Dev Tool - Observation', () => {
    it('should get notified when an Object property is observed', () => {
      const devTool = getDevTool();
      const state = anchor({ name: 'John' });
      const observer = createObserver(() => {});

      observer.run(() => {
        expect(state.name).toBe('John');
      });

      expect(devTool?.onTrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onTrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer,
        'name'
      );

      observer.destroy();

      expect(devTool?.onUntrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onUntrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer
      );
    });

    it('should get notified when an Object is unobserved', () => {
      const devTool = getDevTool();
      const state = anchor({ name: 'John' });
      const observer = createObserver(() => {});

      observer.run(() => {
        expect(state.name).toBe('John');
      });

      observer.destroy();

      expect(devTool?.onUntrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onUntrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer
      );
    });

    it('should get notified when an Array is observed', () => {
      const devTool = getDevTool();
      const state = anchor([1, 2, 3]);
      const observer = createObserver(() => {});

      observer.run(() => {
        expect(state.length).toBe(3);
        expect(state[0]).toBe(1);
      });

      expect(devTool?.onTrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onTrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer,
        'array_mutations'
      );
    });

    it('should get notified when a Map property is observed', () => {
      const devTool = getDevTool();
      const state = anchor(new Map());
      const observer = createObserver(() => {});

      observer.run(() => {
        expect(state.size).toBe(0);
        expect(state.get('key')).toBeUndefined();
      });

      expect(devTool?.onTrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onTrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer,
        'collection_mutations'
      );
    });

    it('should get notified when a Set property is observed', () => {
      const devTool = getDevTool();
      const state = anchor(new Set());
      const observer = createObserver(() => {});

      observer.run(() => {
        expect(state.size).toBe(0);
        expect(state.has('key')).toBe(false);
      });

      expect(devTool?.onTrack).toHaveBeenCalledTimes(1);
      expect(devTool?.onTrack).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
        }),
        observer,
        'collection_mutations'
      );
    });
  });
});
