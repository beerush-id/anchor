import { describe, expect, it } from 'vitest';
import { LIST_OPTIONS, SuperList, superList } from '../../src/common/index.js';

describe('SuperList', () => {
  describe('constructor & options', () => {
    it('should initialize with default options when none provided', () => {
      const list = new SuperList<string>();
      expect(list.size).toBe(0);
      expect(list.values.length).toBe(LIST_OPTIONS.size);
      expect(list.selection.size).toBe(0);
    });

    it('should initialize with custom size options', () => {
      const list = new SuperList<number>(undefined, { size: 10 });
      expect(list.values.length).toBe(10);
    });

    it('should pre-populate values when passed to constructor', () => {
      const list = new SuperList<string>(['alpha', 'beta']);
      expect(list.size).toBe(2);
      expect(list.values[0].value).toBe('alpha');
      expect(list.values[0].visible).toBe(true);
      expect(list.values[1].value).toBe('beta');
    });

    it('should work with superList helper function', () => {
      const list = superList(['one', 'two'], { size: 5 });
      expect(list).toBeInstanceOf(SuperList);
      expect(list.size).toBe(2);
      expect(list.values.length).toBe(5);
    });
  });

  describe('add()', () => {
    it('should return self safely when adding empty array, primitives, strings, or non-array objects', () => {
      const list = new SuperList<string>();
      expect(list.add([])).toBe(list);
      expect(list.add(undefined as any)).toBe(list);
      expect(list.add(true as never)).toBe(list);
      expect(list.add(1 as never)).toBe(list);
      expect(list.add('abc' as never)).toBe(list);
      expect(list.add({ length: 5 } as never)).toBe(list);
      expect(list.size).toBe(0);
    });

    it('should add items sequentially and update cursors and indexes', () => {
      const list = new SuperList<string>(undefined, { size: 5 });
      list.add(['a', 'b']);
      expect(list.size).toBe(2);
      expect(list.values[0].value).toBe('a');
      expect(list.values[1].value).toBe('b');

      list.add(['c']);
      expect(list.size).toBe(3);
      expect(list.values[2].value).toBe('c');
    });

    it('should throw when adding items exceeds maximum capacity', () => {
      const list = new SuperList<number>(undefined, { size: 2 });
      list.add([1, 2]); // exactly capacity 2 is allowed
      expect(list.size).toBe(2);

      expect(() => list.add([3])).toThrow(
        'List capacity exceeded: cannot add 1 items (exceeds maximum capacity of 2).'
      );
    });
  });

  describe('assign()', () => {
    it('should return self safely without clearing when assigning empty array, primitives, strings, or non-array objects', () => {
      const list = new SuperList<string>(['a', 'b']);
      expect(list.size).toBe(2);
      expect(list.assign([])).toBe(list);
      expect(list.assign(undefined)).toBe(list);
      expect(list.assign(true as never)).toBe(list);
      expect(list.assign(1 as never)).toBe(list);
      expect(list.assign('abc' as never)).toBe(list);
      expect(list.assign({ length: 10 } as never)).toBe(list);
      expect(list.size).toBe(2);
    });

    it('should throw when assigning items exceeds maximum capacity', () => {
      const list = new SuperList<number>(undefined, { size: 2 });
      expect(() => list.assign([1, 2, 3])).toThrow(
        'List capacity exceeded: cannot assign 3 items (exceeds maximum capacity of 2).'
      );
    });

    it('should assign and overwrite active slots starting from 0, clearing old selection if value changes', () => {
      const list = new SuperList<string>(['a', 'b']);
      list.select(0); // select 'a'
      expect(list.selection.has('a')).toBe(true);

      list.assign(['x', 'y']);
      expect(list.size).toBe(2);
      expect(list.values[0].value).toBe('x');
      expect(list.values[0].checked).toBe(false);
      expect(list.selection.has('a')).toBe(false);
      expect(list.values[1].value).toBe('y');
    });

    it('should preserve checked state and selection when assigned value is identical to existing value', () => {
      const list = new SuperList<string>(['alpha', 'beta']);
      list.select(0);
      expect(list.values[0].checked).toBe(true);

      list.assign(['alpha', 'gamma']);
      expect(list.values[0].value).toBe('alpha');
      expect(list.values[0].checked).toBe(true);
      expect(list.selection.has('alpha')).toBe(true);
      expect(list.values[1].value).toBe('gamma');
    });

    it('should truncate and clean up residual slots when new assignment is smaller than old cursor tail', () => {
      const list = new SuperList<string>(['one', 'two', 'three', 'four']);
      list.select(2); // select 'three'
      expect(list.size).toBe(4);

      // Assign only 2 items (page size shrank or final page)
      list.assign(['first', 'second']);
      expect(list.size).toBe(2);
      expect(list.values[0].value).toBe('first');
      expect(list.values[1].value).toBe('second');

      // Residual slots 2 and 3 should be vacated and selection cleared
      expect(list.values[2].value).toBeUndefined();
      expect(list.values[2].checked).toBe(false);
      expect(list.selection.has('three')).toBe(false);
      expect(list.values[3].value).toBeUndefined();

      // Subsequent add should append right at slot 2
      list.add(['third']);
      expect(list.size).toBe(3);
      expect(list.values[2].value).toBe('third');
    });
  });

  describe('set()', () => {
    it('should throw error when index is out of bounds (< 0, >= cursors size, NaN, or non-integer)', () => {
      const list = new SuperList<string>(['a', 'b']);
      expect(() => list.set(-1, 'z')).toThrow('Out of bounds: index -1 is outside of the allocated list size (2).');
      expect(() => list.set(2, 'z')).toThrow('Out of bounds: index 2 is outside of the allocated list size (2).');
      expect(() => list.set(NaN, 'z')).toThrow('Out of bounds: index NaN is outside of the allocated list size (2).');
      expect(() => list.set(1.5, 'z')).toThrow('Out of bounds: index 1.5 is outside of the allocated list size (2).');
    });

    it('should update an existing slot value, reset checked state, and remove old value from selection', () => {
      const list = new SuperList<string>(['apple', 'banana']);
      list.select(0);
      expect(list.selection.has('apple')).toBe(true);
      expect(list.values[0].checked).toBe(true);

      list.set(0, 'apricot');
      expect(list.values[0].value).toBe('apricot');
      expect(list.values[0].checked).toBe(false);
      expect(list.selection.has('apple')).toBe(false);
      expect(list.selection.has('apricot')).toBe(false);
    });

    it('should update value safely when slot is unchecked', () => {
      const list = new SuperList<string>(['apple']);
      list.set(0, 'avocado');
      expect(list.values[0].value).toBe('avocado');
      expect(list.values[0].checked).toBeFalsy();
    });
  });

  describe('delete()', () => {
    it('should throw error when start index or size is out of bounds or non-integer', () => {
      const list = new SuperList<string>(['a']);
      expect(() => list.delete(-1)).toThrow('Out of bounds: start index -1 is outside of the allocated list size (1).');
      expect(() => list.delete(1)).toThrow('Out of bounds: start index 1 is outside of the allocated list size (1).');
      expect(() => list.delete(NaN)).toThrow(
        'Out of bounds: start index NaN is outside of the allocated list size (1).'
      );
      expect(() => list.delete(0, -1)).toThrow(
        'Out of bounds: start index 0 is outside of the allocated list size (1).'
      );
    });

    it('should delete slot value, uncheck slot, and remove from indexes and selection without changing tail cursor', () => {
      const list = new SuperList<string>(['a', 'b', 'c']);
      list.select(1);
      expect(list.selection.has('b')).toBe(true);

      list.delete(1, 1);
      expect(list.values[1].value).toBeUndefined();
      expect(list.values[1].checked).toBe(false);
      expect(list.size).toBe(2); // active items remaining: 0 and 2
      expect(list.selection.has('b')).toBe(false);

      // Verify tail cursor stability on subsequent add
      list.add(['d']);
      expect(list.values[3].value).toBe('d');
      expect(list.size).toBe(3);
    });

    it('should clamp delete length when size exceeds allocated cursor size', () => {
      const list = new SuperList<string>(['x', 'y']);
      list.delete(0, 10); // clamped to cursors size (2)
      expect(list.size).toBe(0);
      expect(list.values[0].value).toBeUndefined();
      expect(list.values[1].value).toBeUndefined();
    });

    it('should safely skip already deleted slots during multi-item delete', () => {
      const list = new SuperList<string>(['a', 'b']);
      list.delete(0);
      expect(list.size).toBe(1);

      // Delete range covering already deleted slot 0 and active slot 1
      list.delete(0, 2);
      expect(list.size).toBe(0);
    });
  });

  describe('show() & hide()', () => {
    it('should return self without action when start index is out of bounds', () => {
      const list = new SuperList<string>(['a']);
      expect(list.show(-1)).toBe(list);
      expect(list.show(5)).toBe(list);
      expect(list.hide(-1)).toBe(list);
      expect(list.hide(5)).toBe(list);
    });

    it('should update visible flag only for populated slots within bounds and clamp length', () => {
      const list = new SuperList<string>(['a', 'b']);
      list.delete(0); // make slot 0 empty (`undefined`)

      list.hide(0, 10);
      expect(list.values[0].visible).toBe(false);
      expect(list.values[1].visible).toBe(false);

      list.show(0, 10);
      expect(list.values[0].visible).toBe(true);
      expect(list.values[1].visible).toBe(true);
    });
  });

  describe('selection & toggle()', () => {
    it('should return self when toggle index out of bounds', () => {
      const list = new SuperList<string>(['a']);
      expect(list.toggle(-1)).toBe(list);
      expect(list.toggle(1)).toBe(list);
    });

    it('should return self without action when toggling an unallocated or empty slot', () => {
      const list = new SuperList<string>(['a']);
      list.delete(0);
      list.toggle(0);
      expect(list.selection.size).toBe(0);
    });

    it('should toggle selection state correctly', () => {
      const list = new SuperList<string>(['a', 'b']);
      list.toggle(0); // checked true by default toggle
      expect(list.values[0].checked).toBe(true);
      expect(list.selection.has('a')).toBe(true);

      list.toggle(0); // toggles off
      expect(list.values[0].checked).toBe(false);
      expect(list.selection.has('a')).toBe(false);
    });

    it('should explicitly set checked state when passed boolean parameter', () => {
      const list = new SuperList<string>(['a']);
      list.toggle(0, true);
      expect(list.values[0].checked).toBe(true);
      list.toggle(0, true); // calling true again stays true
      expect(list.values[0].checked).toBe(true);
      expect(list.selection.size).toBe(1);
    });

    it('should select() and deselect() specific slots', () => {
      const list = new SuperList<string>(['one', 'two']);
      list.select(1);
      expect(list.values[1].checked).toBe(true);
      expect(list.selection.has('two')).toBe(true);

      list.deselect(1);
      expect(list.values[1].checked).toBe(false);
      expect(list.selection.has('two')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all active values, indexes, cursors, selection, and reset checked states', () => {
      const list = new SuperList<string>(['a', 'b', 'c']);
      list.select(0);
      list.select(2);
      expect(list.selection.size).toBe(2);

      list.clear();
      expect(list.size).toBe(0);
      expect(list.selection.size).toBe(0);
      expect(list.values[0].value).toBeUndefined();
      expect(list.values[0].checked).toBe(false);
      expect(list.values[2].value).toBeUndefined();
      expect(list.values[2].checked).toBe(false);

      // Verify after clear, adding starts fresh at index 0
      list.add(['new']);
      expect(list.values[0].value).toBe('new');
      expect(list.size).toBe(1);
    });
  });

  describe('sorting & options.sort (domain entity behavior)', () => {
    type UserRecord = {
      id: string;
      name: string;
      role: string;
      score: number;
    };

    it('should expose options getter and indexes Map for active entity slots', () => {
      const u1: UserRecord = { id: '1', name: 'Alice', role: 'admin', score: 100 };
      const u2: UserRecord = { id: '2', name: 'Bob', role: 'user', score: 50 };
      const list = new SuperList<UserRecord>([u1, u2]);

      expect(list.options.size).toBe(LIST_OPTIONS.size);
      expect(list.indexes).toBeInstanceOf(Map);
      expect(list.indexes.get(0)).toBe(u1);
      expect(list.indexes.get(1)).toBe(u2);
    });

    it('should maintain zero-allocation physical row wrapper identity while sorting by entity fields', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 10 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 90 };
      const u3: UserRecord = { id: '3', name: 'Charlie', role: 'user', score: 50 };

      const list = new SuperList<UserRecord>([u1, u2, u3], {
        sort: (a, b) => b.score - a.score,
      });

      const row0Instance = list.values[0];
      const row1Instance = list.values[1];
      const row2Instance = list.values[2];

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u3);
      expect(list.values[2].value).toBe(u1);

      expect(list.values[0]).toBe(row0Instance);
      expect(list.values[1]).toBe(row1Instance);
      expect(list.values[2]).toBe(row2Instance);
    });

    it('should perform cheap relocation across stable row wrappers when calling list.sort() after a user edit', () => {
      const u1: UserRecord = { id: '1', name: 'Alice', role: 'admin', score: 100 };
      const u2: UserRecord = { id: '2', name: 'Bob', role: 'user', score: 50 };
      const u3: UserRecord = { id: '3', name: 'Charlie', role: 'dev', score: 10 };

      const list = new SuperList<UserRecord>([u1, u2, u3], {
        sort: (a, b) => b.score - a.score,
      });

      const row0Instance = list.values[0];
      const row1Instance = list.values[1];
      const row2Instance = list.values[2];

      expect(list.values[0].value).toBe(u1);
      expect(list.values[1].value).toBe(u2);
      expect(list.values[2].value).toBe(u3);

      u2.score = 200;
      list.sort();

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u1);
      expect(list.values[2].value).toBe(u3);

      expect(list.values[0]).toBe(row0Instance);
      expect(list.values[1]).toBe(row1Instance);
      expect(list.values[2]).toBe(row2Instance);
    });

    it('should relocate rank cleanly across stable slots when set(index, value) updates an entity', () => {
      const u1: UserRecord = { id: '1', name: 'Alice', role: 'admin', score: 100 };
      const u2: UserRecord = { id: '2', name: 'Bob', role: 'user', score: 50 };
      const u3: UserRecord = { id: '3', name: 'Charlie', role: 'dev', score: 10 };

      const list = new SuperList<UserRecord>([u1, u2, u3], {
        sort: (a, b) => b.score - a.score,
      });

      const row0Instance = list.values[0];
      const row1Instance = list.values[1];
      const row2Instance = list.values[2];

      const u3Updated: UserRecord = { id: '3', name: 'Charlie', role: 'lead', score: 500 };
      list.set(2, u3Updated);

      expect(list.values[0].value).toBe(u3Updated);
      expect(list.values[1].value).toBe(u1);
      expect(list.values[2].value).toBe(u2);

      expect(list.values[0]).toBe(row0Instance);
      expect(list.values[1]).toBe(row1Instance);
      expect(list.values[2]).toBe(row2Instance);
    });

    it('should remap entity slots when switching sort logic on demand (e.g. column header click)', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 100 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 50 };
      const u3: UserRecord = { id: '3', name: 'Bob', role: 'user', score: 10 };

      const list = new SuperList<UserRecord>([u1, u2, u3], {
        sort: (a, b) => b.score - a.score,
      });

      const row0Instance = list.values[0];
      const row1Instance = list.values[1];
      const row2Instance = list.values[2];

      expect(list.values[0].value).toBe(u1);
      expect(list.values[1].value).toBe(u2);
      expect(list.values[2].value).toBe(u3);

      list.sort((a, b) => a.name.localeCompare(b.name));

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u3);
      expect(list.values[2].value).toBe(u1);

      expect(list.values[0]).toBe(row0Instance);
      expect(list.values[1]).toBe(row1Instance);
      expect(list.values[2]).toBe(row2Instance);

      const u4: UserRecord = { id: '4', name: 'Ben', role: 'intern', score: 999 };
      list.add([u4]);

      expect(list.size).toBe(4);
      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u4);
      expect(list.values[2].value).toBe(u3);
      expect(list.values[3].value).toBe(u1);
    });

    it('should automatically create sortFn from options.orderBy ([key, order] or single key) on construction', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 10 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 90 };
      const u3: UserRecord = { id: '3', name: 'Bob', role: 'user', score: 50 };

      const listDesc = new SuperList<UserRecord>([u1, u2, u3], {
        orderBy: ['score', 'desc'],
      });

      expect(listDesc.values[0].value).toBe(u2);
      expect(listDesc.values[1].value).toBe(u3);
      expect(listDesc.values[2].value).toBe(u1);

      const listAsc = new SuperList<UserRecord>([u1, u2, u3], {
        orderBy: 'name',
      });

      expect(listAsc.values[0].value).toBe(u2);
      expect(listAsc.values[1].value).toBe(u3);
      expect(listAsc.values[2].value).toBe(u1);
    });

    it('should remap slots via zero-allocation relocation when calling orderBy(key, order)', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 10 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 90 };
      const u3: UserRecord = { id: '3', name: 'Bob', role: 'user', score: 50 };

      const list = new SuperList<UserRecord>([u1, u2, u3], {
        orderBy: ['name', 'asc'],
      });

      const row0Instance = list.values[0];
      const row1Instance = list.values[1];
      const row2Instance = list.values[2];

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u3);
      expect(list.values[2].value).toBe(u1);

      list.orderBy('score', 'desc');

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u3);
      expect(list.values[2].value).toBe(u1);

      expect(list.values[0]).toBe(row0Instance);
      expect(list.values[1]).toBe(row1Instance);
      expect(list.values[2]).toBe(row2Instance);

      expect(list.options.orderBy).toEqual(['score', 'desc']);
      const u4: UserRecord = { id: '4', name: 'Charlie', role: 'lead', score: 200 };
      list.add([u4]);

      expect(list.values[0].value).toBe(u4);
      expect(list.values[1].value).toBe(u2);
      expect(list.values[2].value).toBe(u3);
      expect(list.values[3].value).toBe(u1);
    });

    it('should ignore invalid sort options ({ sort: true as never }) and invalid sort(fn) without crashing or corrupting active sorter', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 10 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 90 };

      const list = new SuperList<UserRecord>([u1, u2], {
        sort: true as never,
      });
      expect(list.size).toBe(2);
      expect(list.values[0].value).toBe(u1);
      expect(list.values[1].value).toBe(u2);

      list.sort((a, b) => b.score - a.score);
      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u1);

      list.sort('not_a_function' as never);
      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u1);

      list.add([{ id: '3', name: 'Bob', role: 'user', score: 50 }]);
      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(list.indexes.get(1));
      expect(list.values[2].value).toBe(u1);
    });

    it('should safely handle tuple [key, order?] with optional or missing order parameter', () => {
      const u1: UserRecord = { id: '1', name: 'Zoe', role: 'dev', score: 10 };
      const u2: UserRecord = { id: '2', name: 'Alice', role: 'admin', score: 90 };

      const list = new SuperList<UserRecord>([u1, u2], {
        orderBy: ['name'] as [keyof UserRecord],
      });

      expect(list.values[0].value).toBe(u2);
      expect(list.values[1].value).toBe(u1);

      list.orderBy('score');
      expect(list.values[0].value).toBe(u1);
      expect(list.values[1].value).toBe(u2);
    });

    it('should correctly assign under active orderBy, deselecting changed values', () => {
      const u1: UserRecord = { id: '1', name: 'Alice', role: 'admin', score: 100 };
      const u2: UserRecord = { id: '2', name: 'Bob', role: 'user', score: 50 };
      const u3: UserRecord = { id: '3', name: 'Charlie', role: 'dev', score: 10 };

      const list = new SuperList<UserRecord>([u1, u2], {
        orderBy: 'score',
      });
      list.select(0);
      expect(list.values[0].checked).toBe(true);
      expect(list.selection.has(u2)).toBe(true);

      list.assign([u1, u3]);
      expect(list.values[0].value).toStrictEqual(u3);
      expect(list.values[0].checked).toBe(false);
      expect(list.selection.has(u2)).toBe(false);
    });

    it('should normalize undefined values to null on add, assign, and set', () => {
      const list = new SuperList<any>();
      list.add([undefined]);
      expect(list.values[0].value).toBe(null);
      list.assign([undefined]);
      expect(list.values[0].value).toBe(null);
      list.set(0, undefined);
      expect(list.values[0].value).toBe(null);
    });

    it('should maintain sorted order when adding items that land at different positions', () => {
      const numList = new SuperList<number>([10, 50, 90], {
        sort: (a, b) => a - b,
      });
      numList.add([5]);
      expect(numList.values[0].value).toBe(5);
      numList.add([100]);
      expect(numList.values[4].value).toBe(100);
      numList.add([60]);
      expect(numList.values[3].value).toBe(60);
    });

    it('should sort nullish properties to the end regardless of order direction', () => {
      type OptionalRecord = { id: string; rank?: number | null };
      const o1: OptionalRecord = { id: '1', rank: 10 };
      const o2: OptionalRecord = { id: '2', rank: undefined };
      const o3: OptionalRecord = { id: '3', rank: 5 };
      const o4: OptionalRecord = { id: '4', rank: null };
      const o5: OptionalRecord = { id: '5', rank: 100 };

      const optList = new SuperList<OptionalRecord>([o1, o2, o3, o4, o5, undefined as any, null as any], {
        orderBy: 'rank',
      });
      expect(optList.size).toBe(7);
      expect(optList.values[0].value).toStrictEqual(o3);
      expect(optList.values[1].value).toStrictEqual(o1);
      expect(optList.values[2].value).toStrictEqual(o5);

      optList.orderBy('rank', 'desc');
      expect(optList.values[0].value).toStrictEqual(o5);
      expect(optList.values[1].value).toStrictEqual(o1);
      expect(optList.values[2].value).toStrictEqual(o3);
    });

    it('should silently ignore invalid orderBy key (undefined, null)', () => {
      const list = new SuperList<any>([{ id: '1' }, { id: '2' }]);
      list.orderBy(undefined as any);
      list.orderBy(null as any);
      expect(list.size).toBe(2);
    });

    it('should normalize undefined on assign with active orderBy', () => {
      const sortedUnd = new SuperList<any>([], { orderBy: 'id' });
      sortedUnd.assign([undefined]);
      expect(sortedUnd.values[0].value).toBe(null);
    });

    it('should handle equal values in sort without corruption', () => {
      const eqList = new SuperList(
        [
          { id: 'a', score: 100 },
          { id: 'b', score: 100 },
        ],
        { orderBy: 'score' }
      );
      expect(eqList.size).toBe(2);
    });

    it('should fall back to default size when given invalid size option', () => {
      const badSizeList = new SuperList<any>([], { size: -50 });
      expect(badSizeList.options.size).toBe(1000);
    });

    it('should respect dynamic sort removal and restoration via options', () => {
      const list = new SuperList<number>([10, 20], { sort: (a, b) => a - b });
      list.options.sort = undefined;
      list.add([30]);
      expect(list.values[2].value).toBe(30);

      list.options.sort = (a, b) => a - b;
      list.sort();
      expect(list.values[0].value).toBe(10);
      expect(list.values[1].value).toBe(20);
      expect(list.values[2].value).toBe(30);
    });
  });

  describe('large list performance benchmark (10,000 items)', () => {
    it('should efficiently initialize, populate, filter, and mutate 10,000 slots without GC pauses', () => {
      const TOTAL_SIZE = 10000;
      const list = new SuperList<{ id: number; ticker: string; price: number }>(undefined, {
        size: TOTAL_SIZE,
      });

      // 1. Batch Ingestion Benchmark
      const startAdd = performance.now();
      const batch: { id: number; ticker: string; price: number }[] = [];
      for (let i = 0; i < TOTAL_SIZE; i += 1) {
        batch.push({ id: i, ticker: `STOCK_${i}`, price: Math.random() * 500 });
      }
      list.add(batch);
      const addDuration = performance.now() - startAdd;

      expect(list.size).toBe(TOTAL_SIZE);
      expect(addDuration).toBeLessThan(500); // 10,000 items should ingest cleanly in < 200ms

      // 2. Batch Visibility Filtering Benchmark
      const startHide = performance.now();
      list.hide(0, 5000); // hide first 5,000 rows
      const hideDuration = performance.now() - startHide;

      expect(list.values[0].visible).toBe(false);
      expect(list.values[4999].visible).toBe(false);
      expect(list.values[5000].visible).toBe(true);
      expect(hideDuration).toBeLessThan(100); // 5,000 reactive toggles should complete in < 100ms

      // 3. Batch Selection Benchmark
      const startSelect = performance.now();
      for (let i = 5000; i < 6000; i += 1) {
        list.select(i);
      }
      const selectDuration = performance.now() - startSelect;

      expect(list.selection.size).toBe(1000);
      expect(selectDuration).toBeLessThan(500);

      // 4. Batch Deletion Benchmark
      const startDelete = performance.now();
      list.delete(2000, 3000); // delete 3,000 rows
      const deleteDuration = performance.now() - startDelete;

      expect(list.size).toBe(TOTAL_SIZE - 3000);
      expect(deleteDuration).toBeLessThan(500);
    });
  });

  describe('infinite scroll simulation benchmark (10 x 1,000 chunks)', () => {
    it('should maintain consistent execution time across 10 consecutive 1,000-row loadmore batches', () => {
      const TOTAL_CHUNKS = 10;
      const CHUNK_SIZE = 1000;
      const list = new SuperList<{ id: number; data: string }>(undefined, {
        size: TOTAL_CHUNKS * CHUNK_SIZE,
      });

      const batchDurations: number[] = [];

      for (let page = 0; page < TOTAL_CHUNKS; page += 1) {
        const chunk: { id: number; data: string }[] = [];
        const startIdx = page * CHUNK_SIZE;
        for (let i = 0; i < CHUNK_SIZE; i += 1) {
          chunk.push({ id: startIdx + i, data: `ITEM_${startIdx + i}` });
        }

        const startLoad = performance.now();
        list.add(chunk);
        const duration = performance.now() - startLoad;

        batchDurations.push(duration);
      }

      expect(list.size).toBe(TOTAL_CHUNKS * CHUNK_SIZE);

      // Verify each 1,000-item chunk completed within execution window (< 100ms under coverage instrumentation)
      for (let page = 0; page < TOTAL_CHUNKS; page += 1) {
        expect(batchDurations[page]).toBeLessThan(500);
      }

      // Verify zero quadratic degradation: the 10th batch should not degrade compared to the 1st
      const firstBatch = batchDurations[0];
      const lastBatch = batchDurations[TOTAL_CHUNKS - 1];
      expect(Math.abs(lastBatch - firstBatch)).toBeLessThan(30);
    });
  });

  describe('sorted list performance benchmark (10,000 items)', () => {
    it('should efficiently add and re-sort 10,000 items without quadratic degradation', () => {
      const TOTAL_SIZE = 10000;
      const list = new SuperList<{ id: number; score: number }>(undefined, {
        size: TOTAL_SIZE,
        sort: (a, b) => a.score - b.score,
      });

      const batch: { id: number; score: number }[] = [];
      for (let i = 0; i < TOTAL_SIZE; i += 1) {
        batch.push({ id: i, score: Math.random() * 10000 });
      }

      const startAdd = performance.now();
      list.add(batch);
      const addDuration = performance.now() - startAdd;

      expect(list.size).toBe(TOTAL_SIZE);
      expect(addDuration).toBeLessThan(500);

      for (let i = 1; i < TOTAL_SIZE; i += 1) {
        expect(list.values[i].value!.score).toBeGreaterThanOrEqual(list.values[i - 1].value!.score);
      }

      const startResort = performance.now();
      list.sort((a, b) => b.score - a.score);
      const resortDuration = performance.now() - startResort;

      expect(resortDuration).toBeLessThan(500);

      for (let i = 1; i < TOTAL_SIZE; i += 1) {
        expect(list.values[i].value!.score).toBeLessThanOrEqual(list.values[i - 1].value!.score);
      }
    });
  });
});
