import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, logger } from '@anchor/core';
import { z } from 'zod';

describe('Anchor Core - Schema Validation', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Schema Validation', () => {
    it('should validate initial state with schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema });
      expect(state.name).toBe('John');
      expect(state.age).toBe(30);
    });

    it('should validate property updates with schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: true });

      // Valid update
      state.name = 'Jane';
      expect(state.name).toBe('Jane');

      // Invalid update should throw in strict mode
      expect(() => {
        state.age = 'invalid' as never;
      }).toThrow();
    });

    it('should validate array items with schema', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b'], { schema, strict: true });

      // Valid push
      state.push('c');
      expect(state).toEqual(['a', 'b', 'c']);

      // Invalid push should throw in strict mode
      expect(() => {
        state.push(123 as never);
      }).toThrow();
    });

    it('should validate initial nested properties', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      expect(state.id).toBe(1);
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(30);
      expect(state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should validate nested property assignment', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      state.id = 2;
      state.user.name = 'Jane';
      state.user.age = 31;
      state.tags.push('tag3');

      expect(state.id).toBe(2);
      expect(state.user.name).toBe('Jane');
      expect(state.user.age).toBe(31);
      expect(state.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should prevent invalid value assignment on nested properties', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      state.id = '1' as never;
      state.user.name = 123 as never;
      state.user.age = 'invalid' as never;
      state.tags.push(123 as never);

      expect(state.id).toBe(1);
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(30);
      expect(state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should log error instead of throwing when strict is false', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: false });

      // Reset mock to clear any previous calls
      consoleErrorSpy.mockClear();

      // Invalid update should not throw but log error
      state.age = 'invalid' as never;

      // Should still maintain the previous valid value
      expect(state.age).toBe(30);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error for array validation failures when strict is false', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b'], { schema, strict: false });

      // Reset mock to clear any previous calls
      consoleErrorSpy.mockClear();

      // Invalid push should not throw but log error
      state.push(123 as never);

      // Should still maintain the previous valid array
      expect(state).toEqual(['a', 'b']);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should throw for invalid assignment in strict mode', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: true });

      expect(() => {
        state.name = 123 as never;
      }).toThrow();
      expect(() => {
        state.age = 'invalid' as never;
      }).toThrow();
      expect(() => {
        state.name = 'John Smith';
      }).not.toThrow();
      expect(state.name).toBe('John Smith');
    });
  });
});
