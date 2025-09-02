import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, MapMutations, setObserver } from '../../src/index.js';

describe('Anchor Core - Observable Map', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Map Observation', () => {
    it('should track map mutations when observable is enabled', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        { observable: true }
      );
      const onTrack = vi.fn();
      const observer = createObserver(() => {}, onTrack);
      const restore = setObserver(observer);

      // Access map to track it
      const size = state.size;
      expect(size).toBe(2);

      restore();
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('collection_mutations')).toBe(true);
      expect(onTrack).toHaveBeenCalledTimes(1);
    });

    it('should trigger observer onChange when map is mutated', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        { observable: true }
      );
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access map to track it
      const size = state.size;
      expect(size).toBe(2);
      restore();

      // Mutate map
      state.set('c', 3);

      expect(onChange).toHaveBeenCalledWith({
        type: MapMutations.SET,
        keys: ['c'],
        prev: undefined,
        value: 3,
      });
    });

    it('should track map value access with nested object', () => {
      const nested = { a: 1 };
      const state = anchor(new Map([['key1', nested]]), { observable: true, recursive: true });
      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access map values to track them
      const value = state.get('key1');
      const valueA = value.a;
      expect(valueA).toBe(1);

      restore();
      const trackedProps = observer.states.get(anchor.get(value));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('a')).toBe(true);
    });

    it('should track various map mutations', () => {
      const state = anchor(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        { observable: true }
      );
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access map to track it
      const size = state.size;
      expect(size).toBe(2);
      restore();

      // Test various map mutations
      state.set('c', 3);
      expect(onChange).toHaveBeenLastCalledWith({
        type: MapMutations.SET,
        keys: ['c'],
        prev: undefined,
        value: 3,
      });

      state.delete('a');
      expect(onChange).toHaveBeenLastCalledWith({
        type: MapMutations.DELETE,
        keys: ['a'],
        prev: 1,
        value: undefined,
      });

      state.clear();
      expect(onChange).toHaveBeenLastCalledWith({
        type: MapMutations.CLEAR,
        keys: [['b', 'c']],
        prev: [
          ['b', 2],
          ['c', 3],
        ],
        value: undefined,
      });
    });

    it('should handle map with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<any, any>([['a', 1]]);
      map.set('self', map); // Circular reference
      const state = anchor(map, { observable: true, recursive: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access map values to track them
      const valueA = state.get('a');
      const circularRef = state.get('self');
      expect(valueA).toBe(1);
      expect(circularRef).toBe(state);

      restore();
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('collection_mutations')).toBe(true);
    });

    it('should track map access with complex nested structures', () => {
      const nestedObj = { a: { b: 2 } };
      const nestedArr = [1, { c: 3 }];
      const state = anchor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Map<any, any>([
          ['obj', nestedObj],
          ['arr', nestedArr],
        ]),
        { observable: true, recursive: true }
      );

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access nested structures
      const obj = state.get('obj');
      const arr = state.get('arr');
      const valueB = obj.a.b;
      const valueC = arr[1].c;

      expect(obj).toEqual(nestedObj);
      expect(arr).toEqual(nestedArr);
      expect(valueB).toBe(2);
      expect(valueC).toBe(3);

      restore();
      const trackedObjProps = observer.states.get(anchor.get(obj));
      const trackedArrProps = observer.states.get(anchor.get(arr));

      expect(trackedObjProps).toBeDefined();
      expect(trackedObjProps?.has('a')).toBe(true);

      expect(trackedArrProps).toBeDefined();
      expect(trackedArrProps?.has('array_mutations')).toBe(true);
    });
  });
});
