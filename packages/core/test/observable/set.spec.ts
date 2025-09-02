import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, ObjectMutations, SetMutations, setObserver } from '../../src/index.js';

describe('Anchor Core - Observable Set', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Set Observation', () => {
    it('should track set mutations when observable is enabled', () => {
      const state = anchor(new Set([1, 2, 3]), { observable: true });
      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access set to track it
      const size = state.size;
      expect(size).toBe(3);

      restore();
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('collection_mutations')).toBe(true);
    });

    it('should trigger observer onChange when set is mutated', () => {
      const state = anchor(new Set([1, 2, 3]), { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access set to track it
      const size = state.size;
      expect(size).toBe(3);
      restore();

      // Mutate set
      state.add(4);

      expect(onChange).toHaveBeenCalledWith({
        type: SetMutations.ADD,
        keys: [],
        prev: undefined,
        value: 4,
      });
    });

    it('should track various set mutations', () => {
      const state = anchor(new Set([1, 2, 3]), { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access set to track it
      const size = state.size;
      expect(size).toBe(3);
      restore();

      // Test various set mutations
      state.add(4);
      expect(onChange).toHaveBeenLastCalledWith({
        type: SetMutations.ADD,
        keys: [],
        prev: undefined,
        value: 4,
      });

      state.delete(1);
      expect(onChange).toHaveBeenLastCalledWith({
        type: SetMutations.DELETE,
        keys: [],
        prev: 1,
        value: undefined,
      });

      state.clear();
      expect(onChange).toHaveBeenLastCalledWith({
        type: SetMutations.CLEAR,
        keys: [[]],
        prev: [2, 3, 4],
      });
    });

    it('should handle set with object values and nested tracking', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const state = anchor(new Set([obj1, obj2]), { observable: true, recursive: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access set to track it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values = Array.from(state.values()) as any[];
      const value1 = values[0].a;
      expect(value1).toBe(1);

      restore();

      // Mutate nested object
      values[0].a = 3;

      expect(onChange).toHaveBeenCalledWith({
        type: ObjectMutations.SET,
        keys: ['a'],
        prev: 1,
        value: 3,
      });

      // Add new object
      const obj3 = { c: 4 };
      state.add(obj3 as never);

      expect(onChange).toHaveBeenLastCalledWith({
        type: SetMutations.ADD,
        keys: [],
        prev: undefined,
        value: obj3,
      });
    });

    it('should handle set with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const set = new Set<any>([1, 2]);
      set.add(set); // Circular reference
      const state = anchor(set, { observable: true, recursive: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access set to track it
      const size = state.size;
      expect(size).toBe(3);

      restore();
      const trackedProps = observer.states.get(anchor.get(state));

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('collection_mutations')).toBe(true);
    });

    it('should track set access with complex nested structures', () => {
      const nestedObj = { a: { b: 2 } };
      const nestedArr = [1, { c: 3 }];
      const state = anchor(new Set([nestedObj, nestedArr]), { observable: true, recursive: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Convert set to array for easier access
      const values = Array.from(state.values());
      const obj = values.find((v) => typeof v === 'object' && !Array.isArray(v));
      const arr = values.find((v) => Array.isArray(v));

      // Access nested structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueB = (obj as any).a.b;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueC = (arr[1] as any).c;

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
