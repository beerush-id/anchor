import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import { form, setCleanUpHandler } from '../../src/index.js';

describe('Anchor Core - Form API', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Form Creation', () => {
    it('should create a form with input, output, and error map', () => {
      const cleanupList = new Set<() => void>();
      const cleanupHandler = (fn: () => void) => {
        cleanupList.add(fn);
      };
      setCleanUpHandler(cleanupHandler);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const [input, errors] = form(schema, { name: 'John', age: 30 });

      // Input should be mutable and allow changes
      expect(input.name).toBe('John');
      expect(input.age).toBe(30);

      // Errors should be an object tracking validation errors
      expect(errors).toBeDefined();
      expect(errors).toEqual({});

      cleanupList.forEach((fn) => fn());
      setCleanUpHandler(undefined as never);
    });

    it('should create a form with nested schema', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const [input, errors] = form(schema, {
        user: { name: 'John', age: 30 },
        tags: ['tag1', 'tag2'],
      });

      expect(input.user.name).toBe('John');
      expect(input.user.age).toBe(30);
      expect(input.tags).toEqual(['tag1', 'tag2']);

      expect(errors).toEqual({});
    });

    it('should validate initial values against schema', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });

      const [input, errors] = form(schema, { name: 'Jo', age: 15 }, { safeInit: false });

      // Input should accept any values
      expect(input.name).toBe('Jo');
      expect(input.age).toBe(15);

      // Errors should track validation failures
      expect(errors.name).toBeDefined();
      expect(errors.age).toBeDefined();
    });
  });

  describe('Form Options', () => {
    it('should call onChange callback when input changes', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const onChange = vi.fn();
      const [input] = form(schema, { name: 'John', age: 30 }, { onChange });

      input.name = 'Jane';

      expect(onChange).toHaveBeenCalledTimes(1);
      const callArgs = onChange.mock.calls[0][0];
      expect(callArgs.type).toBe('set');
      expect(callArgs.keys).toEqual(['name']);
    });

    it('should not call onChange callback if not provided', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const [input] = form(schema, { name: 'John', age: 30 });

      input.name = 'Jane';

      // Should not cause any errors
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Form Error Tracking', () => {
    it('should track validation errors properly', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
        email: z.string().email(),
      });

      const [input, errors] = form(schema, {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });

      expect(errors).toEqual({});

      // Cause validation errors
      input.name = 'Jo'; // Too short
      input.age = 10; // Too young
      input.email = 'invalid'; // Invalid email

      expect(errors.name).toBeDefined();
      expect(errors.age).toBeDefined();
      expect(errors.email).toBeDefined();

      // Fix validation errors
      input.name = 'Jonathan';
      expect(errors.name).toBeUndefined();

      input.age = 25;
      expect(errors.age).toBeUndefined();

      input.email = 'john.doe@example.com';
      expect(errors.email).toBeUndefined();

      delete (input as { age?: number }).age;

      expect(input.age).toBeUndefined();
      expect(errors.age).toBeDefined();
    });

    it('should track nested validation errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
          profile: z.object({
            age: z.number().min(18),
          }),
        }),
        tags: z.array(z.string()),
      });

      const [input, errors] = form(schema, {
        user: { name: 'John', profile: { age: 30 } },
        tags: ['tag1', 'tag2'],
      });

      expect(errors).toEqual({});

      // Cause nested validation errors
      input.user.name = 'Jo'; // Too short
      input.user.profile.age = 10; // Too young
      input.tags.push(10 as never);

      expect(errors['user.name']).toBeDefined();
      expect(errors['user.profile.age']).toBeDefined();
      expect(errors.tags).toBeDefined();
    });

    it('should clear errors when validation passes', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });

      const [input, errors] = form(schema, { name: 'Jo', age: 10 }, { safeInit: false });

      // Initial errors should exist
      expect(errors.name).toBeDefined();
      expect(errors.age).toBeDefined();

      // Fix the errors
      input.name = 'John';
      input.age = 25;

      // Errors should be cleared
      expect(errors.name).toBeUndefined();
      expect(errors.age).toBeUndefined();
    });
  });
});
