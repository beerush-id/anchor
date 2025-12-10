import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  createObserver,
  effect,
  getTracker,
  mutable,
  setObserver,
  setTracker,
  subscribe,
  untrack,
  withinObserver,
} from '../../src/index.js';

describe('Anchor Core - Observable Observer Management', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Observer Management', () => {
    it('should properly set global tracker', () => {
      const tracker = vi.fn();
      const state = anchor({ count: 1 });
      expect(getTracker()).toBeUndefined();

      const untrack = setTracker(tracker);
      const untrack2 = setTracker(tracker); // Make sure to handle duplicate tracker.

      expect(getTracker()).toBe(tracker);
      expect(tracker).not.toHaveBeenCalled();
      expect(untrack2).toBe(untrack);

      const count = state.count;
      expect(count).toBe(1);
      expect(tracker).toHaveBeenCalledTimes(1);

      untrack?.(); // Unset the tracker. Any state read after this point will not be tracked.

      expect(getTracker()).toBeUndefined();
      expect(tracker).toHaveBeenCalledTimes(1);

      expect(state.count).toBe(1);
      expect(tracker).toHaveBeenCalledTimes(1);
    });

    it('should properly manage multiple observers', () => {
      const state = anchor({ a: 1, b: 2 }, { observable: true });

      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const observer1 = createObserver(onChange1);
      const observer2 = createObserver(onChange2);

      const restore1 = setObserver(observer1);

      const valueA = state.a; // Track property with observer1
      expect(valueA).toBe(1);

      restore1();

      const restore2 = setObserver(observer2);
      const valueB = state.b; // Track property with observer2
      expect(valueB).toBe(2);

      restore2();

      // Change both tracked properties
      state.a = 3;
      state.b = 4;

      expect(onChange1).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });

      expect(onChange2).toHaveBeenCalledWith({
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should properly handle duplicated observers', () => {
      const state = anchor({ count: 1, foo: 'bar' });
      const changeHandler = vi.fn();
      const observer = createObserver(changeHandler);
      const restore1 = setObserver(observer);
      const restore2 = setObserver(observer);

      expect(restore1).toBe(restore2); // Duplicate observation should return the same restorer.

      const count = state.count;
      expect(count).toBe(1);

      state.count += 1;

      expect(state.count).toBe(2);
      expect(changeHandler).toHaveBeenCalledTimes(1);

      restore2(); // Should properly leave the observer context.

      const foo = state.foo;
      expect(foo).toBe('bar');

      state.foo = 'baz';

      expect(state.foo).toBe('baz');
      expect(changeHandler).toHaveBeenCalledTimes(1); // Should not get notified after out of observer.
    });

    it('should properly clean up observers', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      const valueA = state.a; // Track property
      expect(valueA).toBe(1);
      restore();
      observer.destroy(); // Clean up observer
      observer.destroy(); // Make sure not throw

      const trackedProps = observer.states.get(anchor.get(state));
      expect(trackedProps).toBeUndefined();
    });

    it('should properly remove destroyed state from observer', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const observer = createObserver(() => {});

      withinObserver(() => {
        const valueA = state.a;
        expect(valueA).toBe(1);
      }, observer);

      expect(observer.states.has(anchor.get(state)));
      anchor.destroy(state);
      expect(observer.states.has(anchor.get(state))).toBe(false);
    });

    it('should handle observer context switching', () => {
      const state1 = anchor({ a: 1 }, { observable: true });
      const state2 = anchor({ b: 2 }, { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);

      // Set observer context and access state1
      const restore1 = setObserver(observer);
      const valueA = state1.a;
      expect(valueA).toBe(1);
      restore1();

      // Switch observer context and access state2
      const restore2 = setObserver(observer);
      const valueB = state2.b;
      expect(valueB).toBe(2);
      restore2();

      // Changes should trigger the observer
      state1.a = 3;
      state2.b = 4;

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, {
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });
      expect(onChange).toHaveBeenNthCalledWith(2, {
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should handle nested stacks observer contexts', () => {
      const state = anchor({ a: 1, nested: { b: 2 } }, { observable: true });
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const observer1 = createObserver(onChange1);
      const observer2 = createObserver(onChange2);

      // Set outer observer context
      const restore1 = setObserver(observer1);

      const valueA = state.a;
      const valueAB = state.nested.b;
      expect(valueA).toBe(1);
      expect(valueAB).toBe(2);

      // Set inner observer context
      const restore2 = setObserver(observer2);
      const valueB = state.nested.b;

      expect(valueB).toBe(2);

      restore2(); // Restore inner context
      restore1(); // Restore outer context

      // Changes should trigger both observers
      state.a = 3;
      state.nested.b = 4;

      expect(onChange1).toHaveBeenCalledTimes(2);
      expect(onChange1).toHaveBeenNthCalledWith(1, {
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });
      expect(onChange1).toHaveBeenNthCalledWith(2, {
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });

      expect(onChange2).toHaveBeenCalledWith({
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should properly handle observer destruction', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);

      const restore = setObserver(observer);
      const valueA = state.a;
      expect(valueA).toBe(1);
      restore();

      // Destroy observer
      observer.destroy();

      // Change should not trigger destroyed observer
      state.a = 2;
      expect(onChange).not.toHaveBeenCalled();

      // Tracked props should be cleaned up
      const trackedProps = observer.states.get(anchor.get(state));
      expect(trackedProps).toBeUndefined();
    });

    it('should handle multiple state types with observers', () => {
      const objState = anchor({ a: 1 }, { observable: true });
      const arrState = anchor([1, 2], { observable: true });
      const mapState = anchor(new Map([['key', 'value']]), { observable: true });
      const setState = anchor(new Set([1, 2]), { observable: true });

      const onChange = vi.fn();
      const observer = createObserver(onChange);

      const restore = setObserver(observer);

      // Access all state types
      const objVal = objState.a;
      const arrLen = arrState.length;
      const mapSize = mapState.size;
      const setSize = setState.size;

      expect(objVal).toBe(1);
      expect(arrLen).toBe(2);
      expect(mapSize).toBe(1);
      expect(setSize).toBe(2);

      restore();

      // Trigger changes
      objState.a = 2;
      arrState.push(3);
      mapState.set('key2', 'value2');
      setState.add(3);

      // Verify all changes were observed
      expect(onChange).toHaveBeenCalledTimes(4);
    });

    it('should handle outside of observer function', () => {
      const handler = vi.fn().mockImplementation(() => 'Success');
      const result = untrack<string>(handler);

      expect(result).toBe('Success');
    });

    it('should handle outside of observer function that throws', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Execution error');
      });
      const result = untrack(handler);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle outside of observer function with invalid function', () => {
      const result = untrack(null as never);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should not track property access when called outside of observer', () => {
      const trackHandler = vi.fn();
      const observer = createObserver(() => {}, trackHandler);
      const state = anchor({ count: 1, profile: { name: 'John' } });

      const unobserve = setObserver(observer);

      const count = state.count;

      expect(count).toBe(1);
      expect(observer.states.has(anchor.get(state))).toBe(true);
      expect(trackHandler).toHaveBeenCalledTimes(1);

      untrack(() => {
        const name = state.profile.name;
        expect(name).toBe('John');
      });

      expect(trackHandler).toHaveBeenCalledTimes(1); // Not called due to name accessed outside of observer.

      const name = state.profile.name; // (2 tracks): .profile + .profile.name

      expect(name).toBe('John');
      expect(trackHandler).toHaveBeenCalledTimes(3); // Now it's called because the observer has been restored.

      unobserve();
    });

    it('should handle within observer function', () => {
      const handle = vi.fn().mockImplementation(() => 'Success');
      const observer = createObserver(() => {});
      const result = withinObserver(observer, handle);

      expect(result).toBe('Success');
    });

    it('should handle within observer function that throws', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Execution error');
      });
      const observer = createObserver(() => {});
      const result = withinObserver(observer, handler);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle within observer function with invalid function', () => {
      const observer = createObserver(() => {});
      const result = withinObserver(observer, null as never);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should track property access when called within an observer', () => {
      const trackHandler = vi.fn();
      const observer = createObserver(() => {}, trackHandler);
      const state = anchor({ count: 1, profile: { name: 'John', age: 10 } });

      const count = state.count;

      expect(count).toBe(1);
      expect(observer.states.has(anchor.get(state))).toBe(false);
      expect(trackHandler).not.toHaveBeenCalled(); // Not tracked due to outside of observer.

      withinObserver(observer, () => {
        // This access will trigger a tracking.
        const name = state.profile.name; // (2 tracks): .profile + .profile.name
        expect(name).toBe('John');
      });

      expect(observer.states.has(anchor.get(state))).toBe(true);
      expect(trackHandler).toHaveBeenCalledTimes(2);

      // This access will not trigger a tracking.
      const age = state.profile.age;

      expect(age).toBe(10);
      expect(trackHandler).toHaveBeenCalledTimes(2);

      observer.run(() => {
        const age = state.profile.age; // Only: .profile.age since .profile already tracked.
        expect(age).toBe(10);
      });

      expect(trackHandler).toHaveBeenCalledTimes(3);
    });

    it('should track property access when called inside an effect', () => {
      const changeHandler = vi.fn();
      const trackHandler = vi.fn();
      const observer = createObserver(changeHandler, trackHandler);
      const state = anchor({ count: 1, profile: { name: 'John' } });

      const unobserve = setObserver(observer);

      const count = state.count;
      expect(count).toBe(1);
      expect(observer.states.has(anchor.get(state))).toBe(true);
      expect(trackHandler).toHaveBeenCalledTimes(1);

      const unsubscribe = subscribe(state, () => {
        // Any property access here should trigger a dependency tracking.
        const name = state.profile.name; // (2 tracks): .profile + .profile.name
        expect(name).toBe('John');
      });

      expect(trackHandler).toHaveBeenCalledTimes(3);
      expect(observer.states.has(anchor.get(state).profile)).toBe(true);

      unsubscribe();
      unobserve();
    });

    it('should track property access when called inside a notification effect', async () => {
      const changeHandler = vi.fn();
      const trackHandler = vi.fn();
      const observer = createObserver(changeHandler, trackHandler);
      const state = anchor({ count: 1, profile: { name: 'John' } });

      const unobserve = setObserver(observer);

      const unsubscribe = subscribe(state, (_s, event) => {
        // Any property access here should trigger a dependency tracking.
        const count = state.count;
        expect(count).toBe(1);

        if (event.type !== 'init') {
          const name = state.profile.name; // Trigger dependency tracking in a notification effect.
          expect(name).toBe('John Doe');
        }
      });

      expect(trackHandler).toHaveBeenCalledTimes(1);
      expect(observer.states.has(anchor.get(state))).toBe(true);

      const profile = untrack(() => {
        return state.profile;
      });
      profile.name = 'John Doe';

      expect(trackHandler).toHaveBeenCalledTimes(3);
      expect(changeHandler).toHaveBeenCalled();
      expect(observer.states.has(anchor.get(state).profile)).toBe(true);

      unsubscribe();
      unobserve();
    });

    it('should not track property access when called inside an isolated effect', () => {
      const changeHandler = vi.fn();
      const trackHandler = vi.fn();
      const observer = createObserver(changeHandler, trackHandler);
      const state = anchor({ count: 1, profile: { name: 'John' } });

      const unobserve = setObserver(observer);

      const count = state.count;
      expect(count).toBe(1);
      expect(observer.states.has(anchor.get(state))).toBe(true);
      expect(trackHandler).toHaveBeenCalledTimes(1);

      const unsubscribe = subscribe(state, (_s, event) => {
        // Isolate the handler to be called outside of observer.
        untrack(() => {
          // Any property access here should not trigger a dependency tracking.
          if (event.type === 'init') {
            const name = state.profile.name;
            expect(name).toBe('John');
          } else {
            const name = state.profile.name;
            expect(name).toBe('John Doe');
          }
        });
      });

      // Isolate profile read to make sure it's not tracked.
      const profile = untrack(() => state.profile);
      profile.name = 'John Doe';

      expect(trackHandler).toHaveBeenCalledTimes(1);
      expect(changeHandler).not.toHaveBeenCalled();
      expect(observer.states.has(anchor.get(state).profile)).toBe(false);

      unsubscribe();
      unobserve();
    });
  });

  describe('Unsafe Observation Detection', () => {
    it('should detect and warn about unsafe observation when threshold is exceeded', () => {
      vi.useFakeTimers();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observer = createObserver(() => {});
      const originalConfig = anchor.configs();

      anchor.configure({ safeObservationThreshold: 5 });

      const states = Array.from({ length: 6 }, (_, i) => anchor({ value: i }, { observable: true }));

      observer.run(() => {
        states.forEach((state, i) => {
          const value = state.value;
          expect(value).toBe(i);
        });
      });

      vi.runAllTimers();

      // Check that error was called with the expected unsafe observation warning
      expect(errorSpy).toHaveBeenCalled();

      const errorMessage = errorSpy.mock.calls[0][0];

      expect(errorMessage).toContain('Attempted to observe too many (6) states');

      // Restore original configuration
      anchor.configure(originalConfig);
      errorSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Effect', () => {
    it('should handle change in effect', () => {
      const state = mutable(0);
      const clear = vi.fn();
      const react = vi.fn().mockImplementation(() => {
        expect(state.value).toBeGreaterThan(-1);

        // Make sure both cases are handled.
        return state.value === 2 ? undefined : clear;
      });

      const cleanup = effect(react);

      expect(react).toHaveBeenCalledTimes(1);
      expect(clear).not.toHaveBeenCalled();

      state.value = 1;

      expect(react).toHaveBeenCalledTimes(2);
      expect(clear).toHaveBeenCalledTimes(1);

      state.value = 2;

      expect(react).toHaveBeenCalledTimes(3); // This call should return undefined.
      expect(clear).toHaveBeenCalledTimes(2);

      state.value = 3;

      expect(react).toHaveBeenCalledTimes(4);
      expect(clear).toHaveBeenCalledTimes(2); // Should not be called again because the cleanup no longer defined.

      cleanup();
      state.value = 4;

      expect(react).toHaveBeenCalledTimes(4);
      expect(clear).toHaveBeenCalledTimes(3); // Should be called again because last react return function again.
    });
  });
});
