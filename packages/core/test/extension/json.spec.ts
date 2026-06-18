import { describe, expect, it, vi } from 'vitest';
import { SerializableMap, SerializableSet } from '../../src/extension/index.js';
import { anchor, subscribe } from '../../src/index.js';

describe('anchor.stringify and anchor.fromJson', () => {
  it('should serialize and deserialize a SerializableMap', () => {
    const map = new SerializableMap([
      [1, 'one'],
      [2, 'two'],
    ]);
    const json = anchor.stringify(map);
    const parsedMap = anchor.parse<typeof map>(json);

    expect(parsedMap).toBeInstanceOf(SerializableMap);
    expect(parsedMap.size).toBe(2);
    expect(parsedMap.get(1)).toBe('one');
    expect(parsedMap.get(2)).toBe('two');
  });

  it('should serialize and deserialize a SerializableSet', () => {
    const set = new SerializableSet([1, 2, 3]);
    const json = anchor.stringify(set);
    const parsedSet = anchor.parse<typeof set>(json);

    expect(parsedSet).toBeInstanceOf(SerializableSet);
    expect(parsedSet.size).toBe(3);
    expect(parsedSet.has(1)).toBe(true);
    expect(parsedSet.has(2)).toBe(true);
    expect(parsedSet.has(3)).toBe(true);
  });

  it('should handle nested serializable objects', () => {
    const map = new SerializableMap([[1, new SerializableSet(['a', 'b'])]]);
    const json = anchor.stringify(map);
    const parsedMap = anchor.parse<typeof map>(json);

    expect(parsedMap).toBeInstanceOf(SerializableMap);
    expect(parsedMap.size).toBe(1);

    const setValue = parsedMap.get(1)!;
    expect(setValue).toBeInstanceOf(SerializableSet);
    expect(setValue.has('a')).toBe(true);
    expect(setValue.has('b')).toBe(true);
  });

  it('should preserve reactive state when serializing', () => {
    const map = new SerializableMap([
      [1, 'one'],
      [2, 'two'],
    ]);
    const json = anchor.stringify(map);
    const parsedMap = anchor.parse<typeof map>(json);

    expect(anchor.has(parsedMap)).toBe(true);
    expect(parsedMap).toBeInstanceOf(SerializableMap);
    expect(parsedMap.size).toBe(2);
    expect(parsedMap.get(1)).toBe('one');
    expect(parsedMap.get(2)).toBe('two');

    const handler = vi.fn();
    subscribe(parsedMap, handler);
    expect(handler).toHaveBeenCalledTimes(1);

    parsedMap.set(1, 'one-updated');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(parsedMap.get(1)).toBe('one-updated');

    expect(anchor.parse('10')).toBe(10);
  });

  it('should throw error when deserializing invalid type', () => {
    const invalidSnapshot = {
      entity: 'invalid-type',
      entries: [[1, 'one']],
    };

    const json = JSON.stringify(invalidSnapshot);

    expect(() => anchor.parse(json)).not.toThrow();
  });
});
