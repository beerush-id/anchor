import { describe, expect, it } from 'vitest';
import { cleanProps, depsChanged, isMutationOf, mutationKeys, pickValues } from '../../src/utils';
import type { StateChange } from '@anchorlib/core';

describe('Anchor React - Utils', () => {
  describe('cleanProps', () => {
    it('should remove _state_version prop from props object', () => {
      const props = {
        name: 'test',
        value: 42,
        _state_version: 1,
      };

      const cleaned = cleanProps(props);

      expect(cleaned).toEqual({
        name: 'test',
        value: 42,
      });
      expect((cleaned as any)._state_version).toBeUndefined();
    });

    it('should return all props when _state_version is not present', () => {
      const props = {
        name: 'test',
        value: 42,
      };

      const cleaned = cleanProps(props);

      expect(cleaned).toEqual({
        name: 'test',
        value: 42,
      });
    });

    it('should return an empty object when no props are provided', () => {
      const props = {
        _state_version: 1,
      };

      const cleaned = cleanProps(props);

      expect(cleaned).toEqual({});
    });
  });

  describe('depsChanged', () => {
    it('should return new set when sizes are different', () => {
      const prev = new Set([1, 2]);
      const next = [1, 2, 3];

      const result = depsChanged(prev, next);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it('should return new set when elements are different', () => {
      const prev = new Set([1, 2, 3]);
      const next = [1, 2, 4];

      const result = depsChanged(prev, next);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 4]));
    });

    it('should return undefined when sets are equal', () => {
      const prev = new Set([1, 2, 3]);
      const next = [1, 2, 3];

      const result = depsChanged(prev, next);

      expect(result).toBeUndefined();
    });

    it('should handle empty sets', () => {
      const prev = new Set([]);
      const next = [];

      const result = depsChanged(prev, next);

      expect(result).toBeUndefined();
    });

    it('should handle different order but same elements', () => {
      const prev = new Set([1, 2, 3]);
      const next = [3, 1, 2];

      const result = depsChanged(prev, next);

      expect(result).toBeUndefined();
    });
  });

  describe('pickValues', () => {
    it('should pick specified keys from state object', () => {
      const state = {
        name: 'test',
        age: 25,
        email: 'test@example.com',
        active: true,
      };

      const [picked, values] = pickValues(state, ['name', 'age']);

      expect(picked).toEqual({
        name: 'test',
        age: 25,
      });
      expect(values).toEqual(['test', 25]);
    });

    it('should return empty object and array when no keys specified', () => {
      const state = {
        name: 'test',
        age: 25,
      };

      const [picked, values] = pickValues(state, []);

      expect(picked).toEqual({});
      expect(values).toEqual([]);
    });

    it('should handle non-existent keys', () => {
      const state = {
        name: 'test',
        age: 25,
      };

      const [picked, values] = pickValues(state, ['name', 'nonexistent' as any]);

      expect(picked).toEqual({
        name: 'test',
        nonexistent: undefined,
      });
      expect(values).toEqual(['test', undefined]);
    });
  });

  describe('isMutationOf', () => {
    it('should return false for init event type', () => {
      const event: StateChange = {
        type: 'init',
        keys: ['name'],
        value: { name: 'test' },
        prev: undefined,
      };

      const result = isMutationOf(event, 'name');

      expect(result).toBe(false);
    });

    it('should return true when event mutates specified key', () => {
      const event: StateChange = {
        type: 'set',
        keys: ['name'],
        value: 'newName',
        prev: { name: 'oldName' },
      };

      const result = isMutationOf(event, 'name');

      expect(result).toBe(true);
    });

    it('should return false when event does not mutate specified key', () => {
      const event: StateChange = {
        type: 'set',
        keys: ['age'],
        value: 30,
        prev: { age: 25 },
      };

      const result = isMutationOf(event, 'name');

      expect(result).toBe(false);
    });

    it('should handle batch mutations', () => {
      const event: StateChange = {
        type: 'assign',
        keys: ['name', 'age'],
        value: { name: 'newName', age: 30 },
        prev: { name: 'oldName', age: 25 },
      };

      const result1 = isMutationOf(event, 'name');
      const result2 = isMutationOf(event, 'age');
      const result3 = isMutationOf(event, 'email');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
    });
  });

  describe('mutationKeys', () => {
    it('should return all keys for batch mutations', () => {
      const event: StateChange = {
        type: 'assign',
        keys: ['name', 'age'],
        value: { name: 'newName', age: 30 },
        prev: { name: 'oldName', age: 25 },
      };

      const result = mutationKeys(event);

      expect(result).toEqual(['name', 'age']);
    });

    it('should return first key for non-batch mutations', () => {
      const event: StateChange = {
        type: 'set',
        keys: ['name', 'age'], // Extra keys might be present
        value: 'newName',
        prev: { name: 'oldName' },
      };

      const result = mutationKeys(event);

      expect(result).toEqual(['name']);
    });

    it('should handle empty keys', () => {
      const event: StateChange = {
        type: 'assign',
        keys: [],
        value: undefined,
        prev: undefined,
      };

      const result = mutationKeys(event);

      expect(result).toEqual([]);
    });
  });
});
