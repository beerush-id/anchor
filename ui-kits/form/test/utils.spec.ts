import { describe, expect, it, vi } from 'vitest';
import { readPath, unflattenData, writePath } from '../src/utils.js';

describe('readPath', () => {
  it('reads top-level properties', () => {
    expect(readPath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('reads nested properties', () => {
    expect(readPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing intermediates', () => {
    expect(readPath({ a: {} }, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when root is null/undefined', () => {
    expect(readPath(null, 'a')).toBeUndefined();
    expect(readPath(undefined, 'a')).toBeUndefined();
  });

  it('reads array elements by numeric index', () => {
    expect(readPath({ tags: ['a', 'b', 'c'] }, 'tags.1')).toBe('b');
  });

  it('reads nested objects inside arrays', () => {
    const obj = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(readPath(obj, 'items.1.name')).toBe('second');
  });

  it('reads arrays nested inside arrays', () => {
    const obj = {
      matrix: [
        [1, 2],
        [3, 4],
      ],
    };
    expect(readPath(obj, 'matrix.0.1')).toBe(2);
    expect(readPath(obj, 'matrix.1.0')).toBe(3);
  });

  it('reads deeply nested array-of-objects', () => {
    const obj = { users: [{ tags: ['admin', 'active'] }] };
    expect(readPath(obj, 'users.0.tags.1')).toBe('active');
  });

  it('returns the whole array/object when path ends at container', () => {
    const tags = ['a', 'b'];
    const obj = { tags };
    expect(readPath(obj, 'tags')).toBe(tags);
  });

  it('returns undefined for out-of-bounds array index', () => {
    expect(readPath({ tags: ['a'] }, 'tags.5')).toBeUndefined();
  });

  it('returns undefined when intermediate is a primitive', () => {
    expect(readPath({ a: 'string' }, 'a.b')).toBeUndefined();
    expect(readPath({ a: 42 }, 'a.b')).toBeUndefined();
  });

  it('preserves value types (Date, null, boolean, 0)', () => {
    const date = new Date('2024-01-01');
    const obj = { date, flag: false, count: 0, empty: null };
    expect(readPath(obj, 'date')).toBe(date);
    expect(readPath(obj, 'flag')).toBe(false);
    expect(readPath(obj, 'count')).toBe(0);
    expect(readPath(obj, 'empty')).toBeNull();
  });
});

describe('writePath', () => {
  it('writes top-level properties', () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, 'name', 'Alice');
    expect(obj.name).toBe('Alice');
  });

  it('auto-creates nested objects', () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, 'a.b.c', 42);
    expect((obj as any).a.b.c).toBe(42);
  });

  it('auto-creates arrays when next segment is numeric', () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, 'tags.0', 'first');
    expect(Array.isArray(obj.tags)).toBe(true);
    expect((obj.tags as string[])[0]).toBe('first');
  });

  it('auto-creates arrays of objects', () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, 'items.0.name', 'Widget');
    const items = obj.items as { name: string }[];
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].name).toBe('Widget');
  });

  it('auto-creates nested arrays inside objects', () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, 'users.0.tags.0', 'admin');
    const users = obj.users as { tags: string[] }[];
    expect(users[0].tags[0]).toBe('admin');
  });

  it('overwrites existing values', () => {
    const obj = { name: 'Alice' };
    writePath(obj, 'name', 'Bob');
    expect(obj.name).toBe('Bob');
  });

  it('overwrites nested values without destroying siblings', () => {
    const obj = { address: { city: 'NY', zip: '10001' } };
    writePath(obj, 'address.city', 'LA');
    expect(obj.address.city).toBe('LA');
    expect(obj.address.zip).toBe('10001');
  });

  it('writes null and undefined explicitly', () => {
    const obj = { name: 'Alice', age: 25 };
    writePath(obj, 'name', null);
    writePath(obj, 'age', undefined);
    expect(obj.name).toBeNull();
    expect(obj.age).toBeUndefined();
  });

  it('writes to existing array indices', () => {
    const obj = { tags: ['a', 'b', 'c'] };
    writePath(obj, 'tags.1', 'updated');
    expect(obj.tags).toEqual(['a', 'updated', 'c']);
  });

  it('writes Date values', () => {
    const obj: Record<string, unknown> = {};
    const d = new Date('2024-06-15');
    writePath(obj, 'created', d);
    expect(obj.created).toBe(d);
  });

  it('replaces object with primitive at a path', () => {
    const obj: Record<string, unknown> = { address: { city: 'NY' } };
    writePath(obj, 'address', 'flat string');
    expect(obj.address).toBe('flat string');
  });

  it('warns on falsy root instead of silently failing', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    writePath(null, 'a', 1);
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockClear();
    writePath(undefined, 'a', 1);
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });
});

describe('unflattenData', () => {
  it('returns empty object for empty input', () => {
    expect(unflattenData({})).toEqual({});
  });

  it('unflattens simple dot-paths', () => {
    expect(unflattenData({ 'a.b': 1, 'a.c': 2 })).toEqual({ a: { b: 1, c: 2 } });
  });

  it('creates arrays when segment is numeric', () => {
    expect(unflattenData({ 'tags.0': 'a', 'tags.1': 'b' })).toEqual({ tags: ['a', 'b'] });
  });

  it('handles mixed nested structures', () => {
    const flat = { 'users.0.name': 'Alice', 'users.0.age': 25, 'users.1.name': 'Bob' };
    const result = unflattenData(flat);
    expect(result.users[0].name).toBe('Alice');
    expect(result.users[0].age).toBe(25);
    expect(result.users[1].name).toBe('Bob');
  });

  it('preserves value types through unflattening', () => {
    const date = new Date('2024-01-01');
    const flat = { 'meta.created': date, 'meta.active': false, 'meta.count': 0 };
    const result = unflattenData(flat);
    expect(result.meta.created).toBe(date);
    expect(result.meta.active).toBe(false);
    expect(result.meta.count).toBe(0);
  });

  it('handles deeply nested paths', () => {
    const flat = { 'a.b.c.d.e': 'deep' };
    const result = unflattenData(flat);
    expect(result.a.b.c.d.e).toBe('deep');
  });

  it('handles array of objects with nested arrays', () => {
    const flat = { 'items.0.tags.0': 'admin', 'items.0.tags.1': 'active' };
    const result = unflattenData(flat);
    expect(result.items[0].tags).toEqual(['admin', 'active']);
  });

  it('handles "root" key by returning value directly', () => {
    expect(unflattenData({ root: 'hello' })).toBe('hello');
  });

  it('handles empty string path by returning value directly', () => {
    expect(unflattenData({ '': 'value' })).toBe('value');
  });
});
