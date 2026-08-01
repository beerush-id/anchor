import { describe, expect, it } from 'vitest';
import { S_MAP_TYPE, xMap } from '../../src/common/map';

describe('SerializableMap', () => {
  it('should create an empty map when no init is provided', () => {
    const map = xMap();
    expect(map.size).toBe(0);
  });

  it('should create map from iterable entries', () => {
    const map = xMap([
      [1, 'one'],
      [2, 'two'],
    ]);
    expect(map.size).toBe(2);
    expect(map.get(1)).toBe('one');
    expect(map.get(2)).toBe('two');
  });

  it('should create map from snapshot', () => {
    const map = xMap({
      entity: S_MAP_TYPE,
      entries: [
        [1, 'one'],
        [2, 'two'],
      ],
    });
    expect(map.size).toBe(2);
    expect(map.get(1)).toBe('one');
    expect(map.get(2)).toBe('two');
  });

  it('should create empty map from invalid snapshot', () => {
    expect(() =>
      xMap({
        entity: 'invalid-type' as never,
        entries: [[1, 'one']],
      })
    ).toThrow();
  });

  it('should create snapshot of current state', () => {
    const map = xMap([
      [1, 'one'],
      [2, 'two'],
    ]);
    const snapshot = map.snapshot();
    expect(snapshot.entity).toBe(S_MAP_TYPE);
    expect(snapshot.entries).toEqual([
      [1, 'one'],
      [2, 'two'],
    ]);
  });

  it('should serialize to JSON string', () => {
    const map = xMap([
      [1, 'one'],
      [2, 'two'],
    ]);
    const json = map.stringify();
    const parsed = JSON.parse(json);
    expect(parsed.entity).toBe(S_MAP_TYPE);
    expect(parsed.entries).toEqual([
      [1, 'one'],
      [2, 'two'],
    ]);
  });

  it('should handle mixed initialization', () => {
    const map = xMap();
    map.set(1, 'one');
    map.set(2, 'two');

    const snapshot = map.snapshot();
    const newMap = xMap(snapshot);

    expect(newMap.size).toBe(2);
    expect(newMap.get(1)).toBe('one');
    expect(newMap.get(2)).toBe('two');
  });
});
