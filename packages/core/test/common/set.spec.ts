import { describe, expect, it } from 'vitest';
import { S_SET_TYPE, xSet } from '../../src/common/set';

describe('SerializableSet', () => {
  it('should create an empty set when no init is provided', () => {
    const set = xSet();
    expect(set.size).toBe(0);
  });

  it('should create set from iterable values', () => {
    const values = [1, 2, 3];
    const set = xSet(values);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
    expect(set.has(2)).toBe(true);
    expect(set.has(3)).toBe(true);
  });

  it('should create set from snapshot', () => {
    const snapshot = {
      entity: S_SET_TYPE,
      values: [1, 2, 3],
    };
    const set = xSet(snapshot);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
    expect(set.has(2)).toBe(true);
    expect(set.has(3)).toBe(true);
  });

  it('should create empty set from invalid snapshot', () => {
    const invalidSnapshot = {
      entity: 'invalid-type',
      values: [1, 2],
    };
    expect(() => xSet(invalidSnapshot)).toThrow();
  });

  it('should create snapshot of current state', () => {
    const set = xSet([1, 2, 3]);
    const snapshot = set.snapshot();
    expect(snapshot.entity).toBe(S_SET_TYPE);
    expect(snapshot.values).toEqual([1, 2, 3]);
  });

  it('should serialize to JSON string', () => {
    const set = xSet([1, 2, 3]);
    const json = set.stringify();
    const parsed = JSON.parse(json);
    expect(parsed.entity).toBe(S_SET_TYPE);
    expect(parsed.values).toEqual([1, 2, 3]);
  });

  it('should handle mixed initialization', () => {
    const set = xSet();
    set.add(1);
    set.add(2);

    const snapshot = set.snapshot();
    const newSet = xSet(snapshot);

    expect(newSet.size).toBe(2);
    expect(newSet.has(1)).toBe(true);
    expect(newSet.has(2)).toBe(true);
  });
});
