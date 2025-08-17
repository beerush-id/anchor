import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { softClone, softEntries, softKeys } from '../../src/index.js';

describe('Clone Utilities', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('softClone', () => {
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
  });

  describe('softEntries', () => {
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
  });

  describe('softKeys', () => {
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
  });
});
