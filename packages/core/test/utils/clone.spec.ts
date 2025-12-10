import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { softClone, softEntries, softEqual, softKeys, softValues } from '../../src/index.js';

describe('Anchor Utilities - Cloner', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Soft Clone (softClone)', () => {
    it('should return primitive values as-is', () => {
      expect(softClone(42)).toBe(42);
      expect(softClone('hello')).toBe('hello');
      expect(softClone(true)).toBe(true);
      expect(softClone(null)).toBe(null);
      expect(softClone(undefined)).toBe(undefined);
    });

    it('should clone Date objects', () => {
      const date = new Date();
      const cloned = softClone(date);

      expect(cloned).toBeInstanceOf(Date);
      expect(cloned).not.toBe(date);
      expect(cloned.getTime()).toBe(date.getTime());
    });

    it('should clone RegExp objects', () => {
      const regex = new RegExp('abc', 'gi');
      const cloned = softClone(regex);

      expect(cloned).toBeInstanceOf(RegExp);
      expect(cloned).not.toBe(regex);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
    });

    it('should clone Arrays', () => {
      const array = [1, 2, { a: 3 }];
      const cloned = softClone(array);

      expect(cloned).toEqual(array);
      expect(cloned).not.toBe(array);
      expect(cloned[2]).not.toBe(array[2]);
    });

    it('should clone Map objects', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const cloned = softClone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned).not.toBe(map);
      expect(cloned.get('a')).toBe(1);
      expect(cloned.get('b')).toBe(2);
    });

    it('should handle circular references in Maps', () => {
      const map = new Map();
      map.set('self', map);
      const cloned = softClone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned).not.toBe(map);
      expect(cloned.get('self')).toBe(cloned);
    });

    it('should clone Set objects', () => {
      const set = new Set([1, 2, 3]);
      const cloned = softClone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned).not.toBe(set);
      expect(cloned.has(1)).toBe(true);
      expect(cloned.has(2)).toBe(true);
      expect(cloned.has(3)).toBe(true);
    });

    it('should handle circular references in Sets', () => {
      const set = new Set();
      set.add(set);
      const cloned = softClone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned).not.toBe(set);
      expect(cloned.has(cloned)).toBe(true);
    });

    it('should clone plain objects', () => {
      const obj = { a: 1, b: 'test', c: { d: 2 } };
      const cloned = softClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.c).not.toBe(obj.c);
    });

    it('should handle circular references in objects', () => {
      const obj = { a: 1 } as Record<string, unknown>;
      obj.self = obj;
      const cloned = softClone(obj);

      expect(cloned).not.toBe(obj);
      expect(cloned.self).toBe(cloned);
    });

    it('should preserve getters and setters', () => {
      const obj = {
        _value: 42,
        get value() {
          return this._value;
        },
        set value(v) {
          this._value = v;
        },
      };

      const cloned = softClone(obj);

      expect(cloned).not.toBe(obj);
      expect(cloned.value).toBe(42);
      cloned.value = 100;
      expect(cloned.value).toBe(100);
    });

    it('should shallow clone object', () => {
      const profile = { name: 'John Doe' };
      const sym = Symbol('test');
      const obj = { count: 1, profile, [sym]: 'Test' };
      const cloned = softClone(obj, false);

      expect(cloned).not.toBe(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.profile).toBe(profile);
      expect(cloned[sym]).toBe('Test');
    });

    it('should shallow clone array', () => {
      const profile = { name: 'John Doe' };
      const arr = [profile];
      const cloned = softClone(arr, false);

      expect(cloned).not.toBe(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[0]).toBe(profile);
    });

    it('should shallow clone Map', () => {
      const profile = { name: 'John Doe' };
      const map = new Map([['profile', profile]]);
      const cloned = softClone(map, false);

      expect(cloned).not.toBe(map);
      expect(cloned).toEqual(map);
      expect(cloned.get('profile')).toBe(profile);
    });

    it('should shallow clone Set', () => {
      const profile = { name: 'John Doe' };
      const set = new Set([profile]);
      const cloned = softClone(set, false);

      expect(cloned).not.toBe(set);
      expect(cloned).toEqual(set);
      expect(cloned.has(profile)).toBe(true);
    });
  });

  describe('Soft Entries (softEntries)', () => {
    it('should return object entries including symbol keys', () => {
      const sym = Symbol('test');
      const obj = { a: 1, b: 2, [sym]: 3 };
      const entries = softEntries(obj);

      expect(entries).toHaveLength(3);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['a', 1],
          ['b', 2],
          [sym, 3],
        ])
      );
    });

    it('should return only symbol keys when object has no string keys', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const obj = { [sym1]: 1, [sym2]: 2 };
      const entries = softEntries(obj);

      expect(entries).toHaveLength(2);
      expect(entries).toEqual(
        expect.arrayContaining([
          [sym1, 1],
          [sym2, 2],
        ])
      );
    });

    it('should return entries for Map objects', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const entries = softEntries(map);

      expect(entries).toHaveLength(2);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['a', 1],
          ['b', 2],
        ])
      );
    });

    it('should return entries for Set objects', () => {
      const set = new Set([1, 2, 3]);
      const entries = softEntries(set);

      expect(entries).toHaveLength(3);
      expect(entries).toEqual(
        expect.arrayContaining([
          [1, 1],
          [2, 2],
          [3, 3],
        ])
      );
    });

    it('should return empty array for empty object', () => {
      const obj = {};
      const entries = softEntries(obj);

      expect(entries).toHaveLength(0);
      expect(entries).toEqual([]);
    });

    it('should return empty array for empty Map', () => {
      const map = new Map();
      const entries = softEntries(map);

      expect(entries).toHaveLength(0);
      expect(entries).toEqual([]);
    });

    it('should return empty array for empty Set', () => {
      const set = new Set();
      const entries = softEntries(set);

      expect(entries).toHaveLength(0);
      expect(entries).toEqual([]);
    });

    it('should handle object with inherited properties', () => {
      const parent = { a: 1 };
      const child = Object.create(parent);
      child.b = 2;

      const entries = softEntries(child);

      // Should only return own properties
      expect(entries).toHaveLength(1);
      expect(entries).toEqual(expect.arrayContaining([['b', 2]]));
    });

    it('should handle object with undefined and null values', () => {
      const sym = Symbol('test');
      const obj = { a: undefined, b: null, c: 0, [sym]: undefined };
      const entries = softEntries(obj);

      expect(entries).toHaveLength(4);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['a', undefined],
          ['b', null],
          ['c', 0],
          [sym, undefined],
        ])
      );
    });

    it('should handle object with function values', () => {
      const fn = () => {};
      const sym = Symbol('fn');
      const obj = { a: fn, b: 42, [sym]: fn };
      const entries = softEntries(obj);

      expect(entries).toHaveLength(3);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['a', fn],
          ['b', 42],
          [sym, fn],
        ])
      );
    });

    it('should handle object with nested objects', () => {
      const nested = { x: 1 };
      const sym = Symbol('nested');
      const obj = { a: nested, b: 42, [sym]: nested };
      const entries = softEntries(obj);

      expect(entries).toHaveLength(3);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['a', nested],
          ['b', 42],
          [sym, nested],
        ])
      );
    });
  });

  describe('Soft Values (softValues)', () => {
    it('should return array as-is when input is an array', () => {
      const arr = [1, 2, 3];
      const values = softValues(arr);

      expect(values).toBe(arr);
      expect(values).toEqual([1, 2, 3]);
    });

    it('should return values of a Map', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
      const values = softValues(map);

      expect(values).toHaveLength(3);
      expect(values).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('should return values of a Set', () => {
      const set = new Set([1, 2, 3]);
      const values = softValues(set);

      expect(values).toHaveLength(3);
      expect(values).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('should return values of a plain object including symbol values', () => {
      const sym = Symbol('test');
      const obj = { a: 1, b: 2, [sym]: 3 };
      const values = softValues(obj);

      expect(values).toHaveLength(3);
      expect(values).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('should return only symbol values when object has no string keys', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const obj = { [sym1]: 1, [sym2]: 2 };
      const values = softValues(obj);

      expect(values).toHaveLength(2);
      expect(values).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should return empty array for empty object', () => {
      const obj = {};
      const values = softValues(obj);

      expect(values).toHaveLength(0);
      expect(values).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      const arr: number[] = [];
      const values = softValues(arr);

      expect(values).toHaveLength(0);
      expect(values).toEqual([]);
      expect(values).toBe(arr);
    });

    it('should return empty array for empty Map', () => {
      const map = new Map();
      const values = softValues(map);

      expect(values).toHaveLength(0);
      expect(values).toEqual([]);
    });

    it('should return empty array for empty Set', () => {
      const set = new Set();
      const values = softValues(set);

      expect(values).toHaveLength(0);
      expect(values).toEqual([]);
    });

    it('should handle object with inherited properties', () => {
      const parent = { a: 1 };
      const child = Object.create(parent);
      child.b = 2;

      const values = softValues(child);

      // Should only return own properties
      expect(values).toHaveLength(1);
      expect(values).toEqual(expect.arrayContaining([2]));
    });

    it('should handle object with undefined and null values', () => {
      const obj = { a: undefined, b: null, c: 0 };
      const values = softValues(obj);

      expect(values).toHaveLength(3);
      expect(values).toEqual(expect.arrayContaining([undefined, null, 0]));
    });

    it('should handle object with function values', () => {
      const fn = () => {};
      const obj = { a: fn, b: 42 };
      const values = softValues(obj);

      expect(values).toHaveLength(2);
      expect(values).toEqual(expect.arrayContaining([fn, 42]));
    });

    it('should handle object with nested objects', () => {
      const nested = { x: 1 };
      const obj = { a: nested, b: 42 };
      const values = softValues(obj);

      expect(values).toHaveLength(2);
      expect(values).toEqual(expect.arrayContaining([nested, 42]));
    });
  });

  describe('Soft Keys (softKeys)', () => {
    it('should return object keys including symbol keys', () => {
      const sym = Symbol('test');
      const obj = { a: 1, b: 2, [sym]: 3 };
      const keys = softKeys(obj);

      expect(keys).toHaveLength(3);
      expect(keys).toEqual(expect.arrayContaining(['a', 'b', sym]));
    });

    it('should return only symbol keys when object has no string keys', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const obj = { [sym1]: 1, [sym2]: 2 };
      const keys = softKeys(obj);

      expect(keys).toHaveLength(2);
      expect(keys).toEqual(expect.arrayContaining([sym1, sym2]));
    });

    it('should return keys of Set', () => {
      const set = new Set([1, 2, 3]);
      const keys = softKeys(set);
      expect(keys).toEqual(expect.arrayContaining([1, 2, 3]));
    });
  });

  describe('Soft Equal (softEqual)', () => {
    it('should return true for equal objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      expect(softEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for unequal objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };
      expect(softEqual(obj1, obj2)).toBe(false);
    });

    it('should return true for equal arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      expect(softEqual(arr1, arr2)).toBe(true);
    });

    it('should return false for unequal arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 4];
      expect(softEqual(arr1, arr2)).toBe(false);
    });

    it('should return true for identical primitive values', () => {
      expect(softEqual(42, 42)).toBe(true);
      expect(softEqual('hello', 'hello')).toBe(true);
      expect(softEqual(true, true)).toBe(true);
      expect(softEqual(null, null)).toBe(true);
      expect(softEqual(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitive values', () => {
      expect(softEqual(42, 43)).toBe(false);
      expect(softEqual('hello', 'world')).toBe(false);
      expect(softEqual(true, false)).toBe(false);
      expect(softEqual(null, undefined)).toBe(false);
      expect(softEqual(0, false)).toBe(false); // Different types
      expect(softEqual('', false)).toBe(false); // Different types
    });

    it('should return true for equal Date objects', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-01');
      expect(softEqual(date1, date2)).toBe(true);
    });

    it('should return false for unequal Date objects', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-02');
      expect(softEqual(date1, date2)).toBe(false);
    });

    it('should return true for equal RegExp objects', () => {
      const regex1 = new RegExp('abc', 'gi');
      const regex2 = new RegExp('abc', 'gi');
      expect(softEqual(regex1, regex2)).toBe(true);
    });

    it('should return false for unequal RegExp objects', () => {
      const regex1 = new RegExp('abc', 'gi');
      const regex2 = new RegExp('abc', 'g');
      const regex3 = new RegExp('abcd', 'gi');
      expect(softEqual(regex1, regex2)).toBe(false);
      expect(softEqual(regex1, regex3)).toBe(false);
    });

    it('should return false when comparing different types', () => {
      expect(softEqual({}, [])).toBe(false);
      expect(softEqual({}, new Date())).toBe(false);
      expect(softEqual([], new Map())).toBe(false);
      expect(softEqual(new Set(), new Map())).toBe(false);
    });

    it('should return true for equal Map objects', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const map2 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      expect(softEqual(map1, map2)).toBe(true);
    });

    it('should return false for unequal Map objects', () => {
      const map1 = new Map([['a', 1]]);
      const map2 = new Map([['a', 2]]);
      const map3 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      expect(softEqual(map1, map2)).toBe(false);
      expect(softEqual(map1, map3)).toBe(false);
    });

    it('should return true for equal Set objects', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      expect(softEqual(set1, set2)).toBe(true);
    });

    it('should return false for unequal Set objects', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 4]);
      const set3 = new Set([1, 2]);
      expect(softEqual(set1, set2)).toBe(false);
      expect(softEqual(set1, set3)).toBe(false);
    });

    it('should handle objects with symbol keys', () => {
      const sym = Symbol('test');
      const obj1 = { a: 1, [sym]: 2 };
      const obj2 = { a: 1, [sym]: 2 };
      const obj3 = { a: 1, [sym]: 3 };
      expect(softEqual(obj1, obj2)).toBe(true);
      expect(softEqual(obj1, obj3)).toBe(false);
    });

    it('should handle objects with different key counts', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1, b: 2 };
      expect(softEqual(obj1, obj2)).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      expect(softEqual({}, {})).toBe(true);
      expect(softEqual([], [])).toBe(true);
      expect(softEqual({}, [])).toBe(false);
    });

    it('should handle empty Maps and Sets', () => {
      expect(softEqual(new Map(), new Map())).toBe(true);
      expect(softEqual(new Set(), new Set())).toBe(true);
      expect(softEqual(new Map(), new Set())).toBe(false);
    });

    it('should handle nested objects with shallow comparison', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };
      const obj3 = { a: { b: 2 } };

      // Should be false because it's a shallow comparison and the nested objects are different instances
      expect(softEqual(obj1, obj2)).toBe(false);
      expect(softEqual(obj1, obj3)).toBe(false);
    });

    it('should handle arrays of different lengths', () => {
      const arr1 = [1, 2];
      const arr2 = [1, 2, 3];
      expect(softEqual(arr1, arr2)).toBe(false);
    });
  });

  describe('Soft Equal - Deep Equality', () => {
    it('should perform deep comparison of nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      const obj3 = { a: { b: { c: 2 } } };

      // Shallow comparison should fail for different object instances
      expect(softEqual(obj1, obj2)).toBe(false);
      expect(softEqual(obj1, obj3)).toBe(false);

      // Deep comparison should pass for equivalent structures
      expect(softEqual(obj1, obj2, true)).toBe(true);
      expect(softEqual(obj1, obj3, true)).toBe(false);
    });

    it('should perform deep comparison of nested arrays', () => {
      const arr1 = [1, [2, [3, 4]]];
      const arr2 = [1, [2, [3, 4]]];
      const arr3 = [1, [2, [3, 5]]];

      // Shallow comparison should fail for different array instances
      expect(softEqual(arr1, arr2)).toBe(false);
      expect(softEqual(arr1, arr3)).toBe(false);

      // Deep comparison should pass for equivalent structures
      expect(softEqual(arr1, arr2, true)).toBe(true);
      expect(softEqual(arr1, arr3, true)).toBe(false);
    });

    it('should perform deep comparison of Maps with nested objects', () => {
      const map1 = new Map([['a', { b: 1 }]]);
      const map2 = new Map([['a', { b: 1 }]]);
      const map3 = new Map([['a', { b: 2 }]]);

      // Shallow comparison should fail for different object instances
      expect(softEqual(map1, map2)).toBe(false);
      expect(softEqual(map1, map3)).toBe(false);

      // Deep comparison should pass for equivalent structures
      expect(softEqual(map1, map2, true)).toBe(true);
      expect(softEqual(map1, map3, true)).toBe(false);
    });

    it('should perform deep comparison of Sets with nested objects', () => {
      const set1 = new Set([{ a: 1 }, { b: [2, 3] }]);
      const set2 = new Set([{ a: 1 }, { b: [2, 3] }]);
      const set3 = new Set([{ a: 1 }, { b: [2, 4] }]);

      // Shallow comparison should fail for different object instances
      expect(softEqual(set1, set2)).toBe(false);
      expect(softEqual(set1, set3)).toBe(false);

      // Deep comparison should pass for equivalent structures
      expect(softEqual(set1, set2, true)).toBe(true);
      expect(softEqual(set1, set3, true)).toBe(false);
    });

    it('should perform deep comparison of objects with symbol keys', () => {
      const sym = Symbol('test');
      const obj1 = { a: { b: 1 }, [sym]: { c: 2 } };
      const obj2 = { a: { b: 1 }, [sym]: { c: 2 } };
      const obj3 = { a: { b: 1 }, [sym]: { c: 3 } };

      // Shallow comparison should fail for different object instances
      expect(softEqual(obj1, obj2)).toBe(false);
      expect(softEqual(obj1, obj3)).toBe(false);

      // Deep comparison should pass for equivalent structures
      expect(softEqual(obj1, obj2, true)).toBe(true);
      expect(softEqual(obj1, obj3, true)).toBe(false);
    });

    it('should perform deep comparison with circular references', () => {
      const obj1 = { a: 1 } as Record<string, unknown>;
      obj1.self = obj1;

      const obj2 = { a: 1 } as Record<string, unknown>;
      obj2.self = obj2;

      const obj3 = { a: 2 } as Record<string, unknown>;
      obj3.self = obj3;

      // Deep comparison should handle circular references
      expect(softEqual(obj1, obj2, true)).toBe(true);
      expect(softEqual(obj1, obj3, true)).toBe(false);
    });
  });
});
