import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, logger } from '../../src/index.js';
import type { KeyLike } from '../../src/index.js';

describe('Anchor Helpers - Edge Cases', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Assign Edge Cases', () => {
    it('should handle assigning to empty objects and arrays', () => {
      const emptyObjState = anchor({});
      anchor.assign(emptyObjState, { a: 1, b: 2 });
      expect(emptyObjState).toEqual({ a: 1, b: 2 });

      const emptyArrState = anchor([] as string[]);
      anchor.assign(emptyArrState, { 0: 'a', 1: 'b' });
      expect(emptyArrState).toEqual(['a', 'b']);
    });

    it('should handle assigning with inherited properties', () => {
      class TestClass {
        ownProp = 'own';
      }

      (TestClass.prototype as never as { inheritedProp: string }).inheritedProp = 'inherited';

      const instance = new TestClass();
      const state = anchor({}) as { ownProp: string; inheritedProp: undefined };

      // Should only assign own properties, not inherited ones
      anchor.assign(state, instance);
      expect(state.ownProp).toBe('own');
      expect(state.inheritedProp).toBeUndefined();
    });

    it('should handle assigning non-enumerable properties', () => {
      const source = {};
      Object.defineProperty(source, 'nonEnumerable', {
        value: 'hidden',
        enumerable: false,
      });
      Object.defineProperty(source, 'enumerable', {
        value: 'visible',
        enumerable: true,
      });

      const state = anchor({}) as Record<string, string | undefined>;
      anchor.assign(state, source);

      // Should only assign enumerable properties
      expect(state.enumerable).toBe('visible');
      expect(state.nonEnumerable).toBeUndefined();
    });

    it('should handle assigning with symbol properties', () => {
      const sym = Symbol('test');
      const source = {
        normal: 'value',
        [sym]: 'symbol value',
      };

      const state = anchor({}) as Record<KeyLike, unknown>;
      anchor.assign(state, source);

      expect(state.normal).toBe('value');
      expect(state[sym]).toBe('symbol value');
    });

    it('should handle assigning with null and undefined values', () => {
      const state = anchor({ a: 1, b: 2 }) as Record<string, unknown>;

      // Assigning null values
      anchor.assign(state, { a: null });
      expect(state.a).toBeNull();

      // Assigning undefined values
      anchor.assign(state, { b: undefined });
      expect(state.b).toBeUndefined();
    });

    it('should handle assigning to objects with getters and setters', () => {
      const state = anchor({
        _value: 'initial',
        get value() {
          return this._value;
        },
        set value(val) {
          this._value = val;
        },
      });

      expect(state.value).toBe('initial');

      anchor.assign(state, { value: 'assigned' });
      expect(state.value).toBe('assigned');
      expect(state._value).toBe('assigned');
    });
  });

  describe('Remove Edge Cases', () => {
    it('should handle removing non-existent properties', () => {
      const state = anchor({ a: 1, b: 2 });
      anchor.remove(state, 'c' as never, 'd' as never);
      expect(state).toEqual({ a: 1, b: 2 }); // No change
    });

    it('should handle removing from empty objects', () => {
      const state = anchor({});
      anchor.remove(state, 'a' as never, 'b' as never);
      expect(state).toEqual({}); // Still empty
    });

    it('should handle removing with symbol properties', () => {
      const sym = Symbol('test');
      const state = anchor({
        normal: 'value',
        [sym]: 'symbol value',
      });

      anchor.remove(state, 'normal', sym as never);
      expect(state.normal).toBeUndefined();
      expect(state[sym]).toBeUndefined();
    });

    it('should handle removing from arrays with sparse elements', () => {
      // Create a sparse array
      const state = anchor(['a', 'b']); // [[0, 'a'], [1, 'b']]
      state[5] = 'f'; // Add element at index 5, creating a sparse array
      state[10] = 'k'; // Add element at index 10
      // ['a', 'b', _, _, 'f', _, _, _, _, 'k']

      expect(state.length).toBe(11);

      anchor.remove(state, '1', '5');
      // ['a', _, _, _, _, _, _, 'k']

      expect(state[1]).toBeUndefined();
      expect(state[5]).toBeUndefined();
      expect(state[0]).toBe('a');
      expect(state[8]).toBe('k'); // Shifted to index 8 after removing #1 and #5.
      expect(state.length).toBe(9); // Length reduced after removing #1 and #5.
    });
  });

  describe('Clear Edge Cases', () => {
    it('should handle clearing empty objects and arrays', () => {
      const emptyObj = anchor({});
      anchor.clear(emptyObj);
      expect(emptyObj).toEqual({});

      const emptyArr = anchor([]);
      anchor.clear(emptyArr);
      expect(emptyArr).toEqual([]);
      expect(emptyArr.length).toBe(0);
    });

    it('should handle clearing objects with various property types', () => {
      const sym = Symbol('test');
      const state = anchor({
        normal: 'value',
        [sym]: 'symbol value',
        123: 'numeric key',
      });

      expect(state.normal).toBe('value');
      expect(state[sym]).toBe('symbol value');
      expect(state[123]).toBe('numeric key');

      anchor.clear(state);

      expect(state.normal).toBeUndefined();
      expect(state[sym]).toBeUndefined();
      expect(state[123]).toBeUndefined();
    });

    it('should handle clearing arrays with custom properties', () => {
      const state = anchor([1, 2, 3]) as number[] & { customProp: string };
      state.customProp = 'custom'; // Add a custom property to the array

      expect(state.length).toBe(3);
      expect(state.customProp).toBe('custom');

      anchor.clear(state);

      expect(state.length).toBe(0);
      expect(state.customProp).toBe('custom'); // Custom properties are not cleared
    });

    it('should handle clearing Maps and Sets with no elements', () => {
      const emptyMap = anchor(new Map());
      anchor.clear(emptyMap);
      expect(emptyMap.size).toBe(0);

      const emptySet = anchor(new Set());
      anchor.clear(emptySet);
      expect(emptySet.size).toBe(0);
    });
  });

  describe('Error Cases', () => {
    it('should handle assign with non-object sources', () => {
      const state = anchor({});

      expect(() => {
        anchor.assign(state, null as never);
      }).toThrow('Cannot assign using non-object value.');

      expect(() => {
        anchor.assign(state, 'string' as never);
      }).toThrow('Cannot assign using non-object value.');

      expect(() => {
        anchor.assign(state, 42 as never);
      }).toThrow('Cannot assign using non-object value.');
    });

    it('should handle assign with non-assignable targets', () => {
      expect(() => {
        anchor.assign(null as never, {});
      }).toThrow('Cannot assign to non-assignable state.');

      expect(() => {
        anchor.assign('string' as never, {});
      }).toThrow('Cannot assign to non-assignable state.');

      expect(() => {
        anchor.assign(42 as never, {});
      }).toThrow('Cannot assign to non-assignable state.');
    });

    it('should handle remove with non-assignable targets', () => {
      expect(() => {
        anchor.remove(null as never, 'key');
      }).toThrow('Cannot remove from non-assignable state.');

      expect(() => {
        anchor.remove('string' as never, 'key');
      }).toThrow('Cannot remove from non-assignable state.');

      expect(() => {
        anchor.remove(42 as never, 'key');
      }).toThrow('Cannot remove from non-assignable state.');
    });

    it('should handle clear with non-assignable targets', () => {
      expect(() => {
        anchor.clear(null as never);
      }).toThrow('Cannot clear non-assignable state.');

      expect(() => {
        anchor.clear('string' as never);
      }).toThrow('Cannot clear non-assignable state.');

      expect(() => {
        anchor.clear(42 as never);
      }).toThrow('Cannot clear non-assignable state.');
    });
  });
});
