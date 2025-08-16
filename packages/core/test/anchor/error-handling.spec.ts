import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor } from '../../src/index.js';
import { z } from 'zod';

describe('Anchor Core - Error Handling', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Initialization Errors', () => {
    it('should handle invalid init type', () => {
      const state = anchor(42 as never);
      expect(state).toBe(42);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle invalid schema types', () => {
      // Test with a primitive value and schema (should throw)
      expect(() => {
        anchor({}, { schema: z.string(), strict: true });
      }).toThrow();

      // Test with a primitive value and schema (non-strict mode)
      const result = anchor({}, { schema: z.string() });
      expect(result).toEqual({});
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle schema validation errors in strict mode', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });

      expect(() => {
        anchor({ name: 'Jo', age: 15 }, { schema, strict: true });
      }).toThrow(); // Should throw because of validation errors
    });

    it('should log schema validation errors in non-strict mode', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });

      errorSpy.mockClear();
      const state = anchor({ name: 'Jo', age: 15 }, { schema });

      // Should still have the original values since validation failed
      expect(state.name).toBe('Jo');
      expect(state.age).toBe(15);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Array Operation Errors', () => {
    it('should handle schema validation errors in array push operations (strict mode)', () => {
      const schema = z.array(z.number().min(10));
      const state = anchor([10, 20], { schema, strict: true });

      expect(() => {
        state.push(5); // This should fail validation (5 < 10)
      }).toThrow();
    });

    it('should log schema validation errors in array push operations (non-strict mode)', () => {
      const schema = z.array(z.number().min(10));
      const state = anchor([10, 20], { schema });

      errorSpy.mockClear();
      const length = state.push(5); // This should fail validation (5 < 10)

      // Should not add the invalid item
      expect(length).toBe(2); // Length should remain 2
      expect(state).toEqual([10, 20]);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle schema validation errors in array unshift operations (strict mode)', () => {
      const schema = z.array(z.string().min(5));
      const state = anchor(['hello', 'world'], { schema, strict: true });

      expect(() => {
        state.unshift('hi'); // This should fail validation ('hi'.length < 5)
      }).toThrow();
    });

    it('should handle schema validation errors in array splice operations (strict mode)', () => {
      const schema = z.array(z.number().int());
      const state = anchor([1, 2, 3], { schema, strict: true });

      expect(() => {
        state.splice(1, 0, 1.5); // This should fail validation (1.5 is not an integer)
      }).toThrow();
    });
  });

  describe('Object Property Errors', () => {
    it('should handle schema validation errors when setting nested properties (strict mode)', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        }),
      });

      const state = anchor({ user: { name: 'John', age: 25 } }, { schema, strict: true });

      expect(() => {
        state.user.age = 10; // This should fail validation (10 < 18)
      }).toThrow();
    });

    it('should log schema validation errors when setting nested properties (non-strict mode)', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        }),
      });

      const state = anchor({ user: { name: 'John', age: 25 } }, { schema });

      errorSpy.mockClear();
      state.user.age = 10; // This should fail validation (10 < 18)

      // Should keep the original value
      expect(state.user.age).toBe(25);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular references', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Create circular reference

      const state = anchor(obj);
      expect(state.name).toBe('test');
      expect(state.self).toBe(state);
    });

    it('should handle deeply nested objects', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const state = anchor(deeplyNested);
      expect(state.level1.level2.level3.level4.level5.value).toBe('deep');

      state.level1.level2.level3.level4.level5.value = 'updated';
      expect(state.level1.level2.level3.level4.level5.value).toBe('updated');
    });

    it('should handle Date objects', () => {
      const state = anchor({
        date: new Date('2023-01-01'),
        name: 'test',
      });

      expect(state.date).toBeInstanceOf(Date);
      expect(state.date.getFullYear()).toBe(2023);

      state.name = 'updated';
      expect(state.name).toBe('updated');
    });

    it('should handle objects with special property names', () => {
      const state = anchor({
        '': 'empty string key',
        '0': 'numeric string key',
        constructor: 'constructor key',
        __proto__: 'proto key',
        prototype: 'prototype key',
      });

      expect(state['']).toBe('empty string key');
      expect(state['0']).toBe('numeric string key');
      expect(state['constructor']).toBe('constructor key');
      expect(state['__proto__']).not.toBe('proto key');
      expect(state['prototype']).toBe('prototype key');

      state[''] = 'updated';
      expect(state['']).toBe('updated');
    });

    it('should handle Symbol properties', () => {
      const sym = Symbol('test');
      const obj = {
        name: 'test',
        [sym]: 'symbol value',
      };

      const state = anchor(obj);
      expect(state.name).toBe('test');
      expect(state[sym]).toBe('symbol value');

      state.name = 'updated';
      state[sym] = 'updated symbol';
      expect(state.name).toBe('updated');
      expect(state[sym]).toBe('updated symbol');
    });
  });
});
