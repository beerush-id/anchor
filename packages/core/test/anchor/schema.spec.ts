import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor } from '../../src/index.js';
import { z } from 'zod';

describe('Anchor Core - Schema Validation', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // errorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    errorSpy.mockRestore();
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

    it('should create schema validated state using model shortcut', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor.model(schema, { name: 'John', age: 30 });
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

    it('should validate array with nested schema', () => {
      const schema = z.array(
        z.object({
          name: z.string(),
        })
      );
      const state = anchor([{ name: 'John' }], schema);

      expect(state[0].name).toBe('John');
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

    it('should prevent deleting required property', () => {
      const schema = z.object({
        id: z.number(),
        username: z.string(),
        fullName: z.string().optional(),
      });

      const state = anchor({ id: 1, username: 'John' }, schema);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).id;
      expect(errorSpy).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).username;
      expect(errorSpy).toHaveBeenCalledTimes(2);

      state.fullName = 'John Doe';

      expect(state.id).toBe(1);
      expect(state.fullName).toBe('John Doe');
      expect(state.username).toBe('John');

      delete state.fullName;
      expect(state.fullName).toBeUndefined();
    });

    it('should log error instead of throwing when strict is false', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: false });

      // Reset mock to clear any previous calls
      errorSpy.mockClear();

      // Invalid update should not throw but log error
      state.age = 'invalid' as never;

      // Should still maintain the previous valid value
      expect(state.age).toBe(30);

      // Should have called console.error
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log error for array validation failures when strict is false', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b'], { schema, strict: false });

      // Reset mock to clear any previous calls
      errorSpy.mockClear();

      // Invalid push should not throw but log error
      state.push(123 as never);

      // Should still maintain the previous valid array
      expect(state).toEqual(['a', 'b']);

      // Should have called console.error
      expect(errorSpy).toHaveBeenCalled();
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

    it('should return the correct type when schema validation failed', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b', 'c'], schema);

      expect(state[0]).toBe('a');
      expect(state[1]).toBe('b');
      expect(state[2]).toBe('c');

      expect(state.splice(0, 1, 1 as never)).toEqual([]); // Invalid item type, return empty array.
      expect(state.push(1 as never)).toBe(3); // Invalid item type, return the same length.
      expect(state.unshift(1 as never)).toBe(3); // Invalid item type, return the same length.
      expect(state.fill(1 as never)).toBe(state); // Invalid item type, return itself.
    });

    it('should handle non object and array initialization with schema', () => {
      const schema = z.object();
      const state = anchor(new Map() as never, schema);

      expect(state).toBeInstanceOf(Map);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should create an exception map for schema validation', () => {
      const schema = z
        .object({
          age: z.number(),
          name: z.string(),
          account: z.object({
            balance: z.number(),
          }),
        })
        .strict();

      const state = anchor.model(schema, {
        name: 'John',
        age: 30,
        account: { balance: 0 },
      });
      const exception = anchor.catch(state);

      expect(exception.errors).toEqual({});

      state.name = 20;
      expect(exception.errors.name).toBeDefined();

      state.name = 'Jane';
      expect(exception.errors.name).toBeUndefined();

      state.foo = 'bar';
      expect(exception.errors.foo).toBeDefined();

      state.account.balance = 'invalid';
      expect(exception.errors['account.balance']).toBeDefined();

      expect(errorSpy).not.toHaveBeenCalled();
      exception.destroy();
    });
  });
});
