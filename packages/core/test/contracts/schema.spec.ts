import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, type Mutable } from '../../src/index.js';
import { z } from 'zod';

describe('Anchor Core - Immutable with Schema Validation', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Immutable Object with Schema', () => {
    it('should validate initial state with schema on immutable object', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor.immutable({ name: 'John', age: 30 }, { schema });
      expect(state.name).toBe('John');
      expect(state.age).toBe(30);
    });

    it('should prevent invalid mutations on immutable object with strict schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor.immutable({ name: 'John', age: 30 }, { schema, strict: true });

      // Valid update should be prevented on immutable
      (state as Mutable<typeof state>).name = 'Jane';
      expect(state.name).toBe('John');

      // Invalid update should be prevented on immutable
      (state as Mutable<typeof state>).age = 'invalid' as never;
      expect(state.age).toBe(30);
    });

    it('should log error for invalid mutations on immutable object with non-strict schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor.immutable({ name: 'John', age: 30 }, { schema });

      consoleErrorSpy.mockClear();

      // Invalid update should not throw but log error
      (state as Mutable<typeof state>).age = 'invalid' as never;

      // Should still maintain the previous valid value
      expect(state.age).toBe(30);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should validate nested properties on immutable object', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor.immutable({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      expect(state.id).toBe(1);
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(30);
      expect(state.tags).toEqual(['tag1', 'tag2']);

      // Try to mutate nested properties (should be prevented)
      (state.user as Mutable<typeof state.user>).name = 'Jane';
      expect(state.user.name).toBe('John');
    });
  });

  describe('Immutable Array with Schema', () => {
    it('should validate initial array state with schema', () => {
      const schema = z.array(z.string());
      const state = anchor.immutable(['a', 'b'], { schema });

      expect(state).toEqual(['a', 'b']);
    });

    it('should prevent invalid mutations on immutable array with strict schema', () => {
      const schema = z.array(z.string());
      const state = anchor.immutable(['a', 'b'], { schema, strict: true });

      // Valid push should be prevented on immutable
      (state as Mutable<typeof state>).push('c');
      expect(state).toEqual(['a', 'b']);

      // Invalid push should be prevented on immutable
      (state as Mutable<typeof state>).push(123 as never);
      expect(state).toEqual(['a', 'b']);
    });

    it('should log error for invalid mutations on immutable array with non-strict schema', () => {
      const schema = z.array(z.string());
      const state = anchor.immutable(['a', 'b'], { schema });

      consoleErrorSpy.mockClear();

      // Invalid push should not throw but log error
      (state as Mutable<typeof state>).push(123 as never);

      // Should still maintain the previous valid array
      expect(state).toEqual(['a', 'b']);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Writable from Immutable with Schema', () => {
    it('should maintain schema validation when creating writable from immutable', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const immutable = anchor.immutable({ name: 'John', age: 30 }, { schema });
      const writable = anchor.writable(immutable);

      // Valid updates
      writable.name = 'Jane';
      writable.age = 25;

      expect(writable.name).toBe('Jane');
      expect(writable.age).toBe(25);
      expect(immutable.name).toBe('Jane');
      expect(immutable.age).toBe(25);
    });

    it('should prevent invalid mutations on writable created from immutable with schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const immutable = anchor.immutable({ name: 'John', age: 30 }, { schema, strict: true });
      const writable = anchor.writable(immutable);

      // Valid update
      writable.name = 'Jane';
      expect(writable.name).toBe('Jane');

      // Invalid update should throw in strict mode
      expect(() => {
        writable.age = 'invalid' as never;
      }).toThrow();

      expect(writable.age).toBe(30);
    });

    it('should log error for invalid mutations on writable with non-strict schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const immutable = anchor.immutable({ name: 'John', age: 30 }, { schema });
      const writable = anchor.writable(immutable);

      consoleErrorSpy.mockClear();

      // Invalid update should not throw but log error
      writable.age = 'invalid' as never;

      // Should still maintain the previous valid value
      expect(writable.age).toBe(30);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should respect contracts and schema validation together', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const immutable = anchor.immutable({ name: 'John', age: 30 }, { schema });
      const writable = anchor.writable(immutable, ['name']); // Only allow name mutations

      // This should work - valid mutation on allowed property
      writable.name = 'Jane';
      expect(writable.name).toBe('Jane');

      // This should be trapped - not in contract
      (writable as Mutable<typeof immutable>).age = 25;
      expect(writable.age).toBe(30);

      // This should be trapped - invalid type even if in contract
      (writable as Mutable<typeof immutable>).name = 123 as never;
      expect(writable.name).toBe('Jane');
    });
  });
});
