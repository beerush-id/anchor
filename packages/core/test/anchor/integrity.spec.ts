import { describe, expect, expectTypeOf, it } from 'vitest';
import { anchor, type Immutable, type MutablePart } from '../../src/index.js';

describe('Anchor Return Type Integrity', () => {
  it('should return correct type for basic anchor call', () => {
    const state = anchor({ a: 1, b: 'test' });
    expectTypeOf(state).toEqualTypeOf<{ a: number; b: string }>();

    const arrState = anchor([1, 2, 3]);
    expectTypeOf(arrState).toEqualTypeOf<number[]>();

    const mapState = anchor(new Map([['key', 'value']]));
    expectTypeOf(mapState).toEqualTypeOf<Map<string, string>>();

    const setState = anchor(new Set([1, 2, 3]));
    expectTypeOf(setState).toEqualTypeOf<Set<number>>();
  });

  it('should return correct type for anchor.immutable call', () => {
    const state = anchor.immutable({ a: 1, b: 'test' });
    expectTypeOf(state).toEqualTypeOf<Immutable<{ a: number; b: string }>>();

    const arrState = anchor.immutable([1, 2, 3]);
    expectTypeOf(arrState).toEqualTypeOf<Immutable<number[]>>();

    const mapState = anchor.immutable(new Map([['key', 'value']]));
    expectTypeOf(mapState).toEqualTypeOf<Immutable<Map<string, string>>>();

    const setState = anchor.immutable(new Set([1, 2, 3]));
    expectTypeOf(setState).toEqualTypeOf<Immutable<Set<number>>>();
  });

  it('should return correct type for anchor.raw call', () => {
    const state = anchor.raw({ a: 1, b: 'test' });
    expectTypeOf(state).toEqualTypeOf<{ a: number; b: string }>();
  });

  it('should return correct type for anchor.flat call', () => {
    const state = anchor.flat({ a: 1, b: 'test' });
    expectTypeOf(state).toEqualTypeOf<{ a: number; b: string }>();
  });

  it('should return correct type for anchor.get call', () => {
    const state = anchor({ a: 1, b: 'test' });
    const underlying = anchor.get(state);
    expectTypeOf(underlying).toEqualTypeOf<{ a: number; b: string }>();
  });

  it('should return correct type for anchor.snapshot call', () => {
    const state = anchor({ a: 1, b: 'test' });
    const snapshot = anchor.snapshot(state);
    expectTypeOf(snapshot).toEqualTypeOf<{ a: number; b: string }>();
  });

  it('should return correct type for anchor.writable call', () => {
    const state = anchor({ a: 1, b: 'test' });
    const writable = anchor.writable(state);
    expectTypeOf(writable).toEqualTypeOf<{ a: number; b: string }>();
  });

  it('should return correct type for anchor.writable with contracts', () => {
    const state = anchor({ a: 1, b: 'test' });
    const writable = anchor.writable(state, ['a']);
    expectTypeOf(writable).toEqualTypeOf<{ a: number; b: string }>();

    const arrState = anchor([1, 2, 3]);
    const writableArr = anchor.writable(arrState, ['push', 'pop']);
    expectTypeOf(writableArr).toEqualTypeOf<MutablePart<number[], ['push', 'pop']>>();
  });

  it('should return correct type for all array mutation methods', () => {
    const arrState = anchor([3, 1, 2]);

    // Test push return type
    const pushResult = arrState.push(4);
    expectTypeOf(pushResult).toEqualTypeOf<number>();
    expect(pushResult).toBe(4); // Length after push

    // Test pop return type
    const popResult = arrState.pop();
    expectTypeOf(popResult).toEqualTypeOf<number | undefined>();
    expect(popResult).toBe(4);

    // Test unshift return type
    const unshiftResult = arrState.unshift(0);
    expectTypeOf(unshiftResult).toEqualTypeOf<number>();
    expect(unshiftResult).toBe(4); // Length after unshift

    // Test shift return type
    const shiftResult = arrState.shift();
    expectTypeOf(shiftResult).toEqualTypeOf<number | undefined>();
    expect(shiftResult).toBe(0);

    // Test splice return type
    const spliceResult = arrState.splice(1, 1, 5);
    expectTypeOf(spliceResult).toEqualTypeOf<number[]>();
    expect(spliceResult).toEqual([1]); // The deleted elements

    // Test fill return type
    const fillResult = arrState.fill(9);
    expectTypeOf(fillResult).toEqualTypeOf<number[]>();
    expect(fillResult).toBe(arrState); // Returns the array itself

    // Test sort return type
    const sortResult = arrState.sort();
    expectTypeOf(sortResult).toEqualTypeOf<number[]>();
    expect(sortResult).toBe(arrState); // Returns the array itself

    // Test reverse return type
    const reverseResult = arrState.reverse();
    expectTypeOf(reverseResult).toEqualTypeOf<number[]>();
    expect(reverseResult).toBe(arrState); // Returns the array itself

    // Test copyWithin return type
    const copyWithinResult = arrState.copyWithin(0, 1, 2);
    expectTypeOf(copyWithinResult).toEqualTypeOf<number[]>();
    expect(copyWithinResult).toBe(arrState); // Returns the array itself
  });

  it('should return correct type for map mutation methods', () => {
    const mapState = anchor(new Map<string, number>());

    // Test set return type
    const setResult = mapState.set('key', 1);
    expectTypeOf(setResult).toEqualTypeOf<Map<string, number>>();
    expect(setResult).toBe(mapState); // Map.set returns the map itself

    // Test get return type
    const getResult = mapState.get('key');
    expectTypeOf(getResult).toEqualTypeOf<number | undefined>();
    expect(getResult).toBe(1);

    // Test delete return type
    const deleteResult = mapState.delete('key');
    expectTypeOf(deleteResult).toEqualTypeOf<boolean>();
    expect(deleteResult).toBe(true);

    // Test clear return type
    mapState.set('key1', 1);
    mapState.set('key2', 2);
    const clearResult = mapState.clear();
    expectTypeOf(clearResult).toEqualTypeOf<void>();
    expect(clearResult).toBe(undefined);
  });

  it('should return correct type for set mutation methods', () => {
    const setState = anchor(new Set<number>());

    // Test add return type
    const addResult = setState.add(1);
    expectTypeOf(addResult).toEqualTypeOf<Set<number>>();
    expect(addResult).toBe(setState); // Set.add returns the set itself

    // Test has return type
    const hasResult = setState.has(1);
    expectTypeOf(hasResult).toEqualTypeOf<boolean>();
    expect(hasResult).toBe(true);

    // Test delete return type
    const deleteResult = setState.delete(1);
    expectTypeOf(deleteResult).toEqualTypeOf<boolean>();
    expect(deleteResult).toBe(true);
  });
});
