import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, OBSERVER_KEYS } from '../../src/index.js';

describe('Anchor Core - Observable Array', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Array Observation', () => {
    it('should track array mutations when observable is enabled', () => {
      const state = anchor([1, 2, 3], { observable: true });

      const onTrack = vi.fn();
      const observer = createObserver(() => {}, onTrack);
      observer.run(() => {
        // Access array to track it
        const length = state.length;
        expect(length).toBe(3);
      });
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has(OBSERVER_KEYS.ARRAY_MUTATIONS)).toBe(true);
      expect(onTrack).toHaveBeenCalledTimes(1);
    });

    it('should trigger observer onChange when array is mutated', () => {
      const state = anchor([1, 2, 3], { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);

      observer.run(() => {
        // Access array to track it
        const length = state.length;
        expect(length).toBe(3);
      });

      // Mutate array
      state.push(4);

      expect(onChange).toHaveBeenCalledWith({
        type: 'push',
        keys: [],
        prev: [1, 2, 3],
        value: [4],
      });
    });

    it('should track array element access', () => {
      const state = anchor([{ a: 1 }, { b: 2 }], { observable: true, recursive: true });

      const observer = createObserver(() => {});
      observer.run(() => {
        // Access array elements to track them
        const valueA = state[0].a;
        const valueB = state[1].b;

        // Confirm accessed values
        expect(valueA).toBe(1);
        expect(valueB).toBe(2);
      });
      const trackedProps = observer.states.get(anchor.get(state[0]));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('a')).toBe(true);
    });

    it('should track various array mutations', () => {
      const state = anchor([1, 2, 3], { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      observer.run(() => {
        // Access array to track it
        const length = state.length;
        expect(length).toBe(3);
      });

      // Test various array mutations
      state.push(4); // [1, 2, 3, 4]
      expect(onChange).toHaveBeenLastCalledWith({
        type: 'push',
        keys: [],
        prev: [1, 2, 3],
        value: [4],
      });

      state.pop(); // [1, 2, 3]
      expect(onChange).toHaveBeenLastCalledWith({
        type: 'pop',
        keys: [],
        prev: 4,
        value: [],
      });

      state.shift(); // [2, 3]
      expect(onChange).toHaveBeenLastCalledWith({
        type: 'shift',
        keys: [],
        prev: 1,
        value: [],
      });

      state.unshift(0); // [0, 2, 3]
      expect(onChange).toHaveBeenLastCalledWith({
        type: 'unshift',
        keys: [],
        prev: [2, 3],
        value: [0],
      });

      state.splice(1, 1, 5); // [0, 5, 3]
      expect(onChange).toHaveBeenLastCalledWith({
        type: 'splice',
        keys: [],
        prev: [0, 2, 3],
        value: [1, 1, 5],
      });
    });

    it('should handle array mutations with nested objects', () => {
      const state = anchor([{ a: 1 }, { b: 2 }], { observable: true, recursive: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      observer.run(() => {
        // Access array to track it
        const value = state[0].a;
        expect(value).toBe(1);
      });

      // Modify nested object
      state[0].a = 3;

      expect(onChange).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });
    });

    it('should track array access with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr: any[] = [1, 2];
      arr.push(arr); // Circular reference
      const state = anchor(arr, { observable: true, recursive: true });

      const observer = createObserver(() => {});
      observer.run(() => {
        // Access array elements to track them
        const value1 = state[0];
        const value2 = state[2]; // This is the circular reference

        // Confirm accessed values
        expect(value1).toBe(1);
        expect(value2).toBe(state);
      });
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has(OBSERVER_KEYS.ARRAY_MUTATIONS)).toBe(true);
    });
  });
});
