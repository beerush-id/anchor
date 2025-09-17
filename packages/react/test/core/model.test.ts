import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useException, useFormWriter, useImmutableModel, useModel } from '../../src/model';
import { z } from 'zod';

describe('Anchor React - Model', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  describe('useModel', () => {
    describe('Basic Usage', () => {
      it('should create a model state with initial value', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useModel(UserSchema, initialValue));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });

      it('should update model state value using setter function', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useModel(UserSchema, initialValue));

        const [, ref, setter] = result.current;

        act(() => {
          setter({ name: 'Jane', age: 25 });
        });

        expect(ref.value).toEqual({ name: 'Jane', age: 25 });
      });

      it('should maintain referential stability of ref and setter', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const { result, rerender } = renderHook(() => useModel(UserSchema, { name: 'John', age: 30 }));

        const [, firstRef, firstSetter] = result.current;

        rerender();

        const [, secondRef, secondSetter] = result.current;

        expect(firstRef).toBe(secondRef);
        expect(firstSetter).toBe(secondSetter);
      });
    });

    describe('With Schema Validation', () => {
      it('should validate initial value against schema', () => {
        const UserSchema = z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        });

        // Invalid initial value - age too low
        const initialValue = { name: 'John', age: 10 };

        renderHook(() => useModel(UserSchema, initialValue));

        // Should log schema validation error
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Attempted to initialize state with schema'),
          expect.any(Object),
          '\n'
        );
      });

      it('should create model with valid data', () => {
        const UserSchema = z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useModel(UserSchema, initialValue));

        const [value, ref] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });

    describe('With Options', () => {
      it('should create immutable model when immutable option is true', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useModel(UserSchema, initialValue, { immutable: true }));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');

        // Should be immutable
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (value as any).name = 'Jane';
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('useImmutableModel', () => {
    describe('Basic Usage', () => {
      it('should create an immutable model state with initial value', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useImmutableModel(UserSchema, initialValue));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');

        // Should be immutable
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (value as any).name = 'Jane';
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it('should update immutable model state value using setter function', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useImmutableModel(UserSchema, initialValue));

        const [, ref, setter] = result.current;

        act(() => {
          setter({ name: 'Jane', age: 25 });
        });

        expect(ref.value).toEqual({ name: 'Jane', age: 25 });

        // New value should also be immutable
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (ref.value as any).name = 'Jack';
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe('With Schema Validation', () => {
      it('should validate initial value against schema', () => {
        const UserSchema = z.object({
          name: z.string().min(3),
          age: z.number().min(18),
        });

        // Invalid initial value - name too short
        const initialValue = { name: 'Jo', age: 30 };

        renderHook(() => useImmutableModel(UserSchema, initialValue));

        // Should log schema validation error
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Attempted to initialize state with schema'),
          expect.any(Object),
          '\n'
        );
      });
    });

    describe('Invalid Mutations', () => {
      it('should prevent mutations on immutable model properties', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => useImmutableModel(UserSchema, initialValue));

        const [value] = result.current;

        // Try to mutate immutable properties
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // These mutations should be prevented
        (value as any).name = 'Jane';
        (value as any).age = 25;
        delete (value as any).name;
        (value as any).newProp = 'test';

        // Should log immutability violations
        expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Read-only state violation detected'),
          expect.any(Error),
          '\n'
        );

        // Values should remain unchanged
        expect(value.name).toBe('John');
        expect(value.age).toBe(30);
        expect((value as any).newProp).toBeUndefined();

        consoleErrorSpy.mockRestore();
      });

      it('should prevent mutations on nested immutable objects', () => {
        const UserSchema = z.object({
          user: z.object({
            name: z.string(),
            address: z.object({
              street: z.string(),
              city: z.string(),
            }),
          }),
          items: z.array(z.number()),
        });

        const initialValue = {
          user: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'New York',
            },
          },
          items: [1, 2, 3],
        };

        const { result } = renderHook(() => useImmutableModel(UserSchema, initialValue));

        const [value] = result.current;

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Try to mutate nested objects
        (value as any).user.name = 'Jane';
        (value as any).user.address.city = 'Boston';
        (value as any).items.push(4);
        (value as any).items[0] = 10;

        // Should log immutability violations
        expect(consoleErrorSpy).toHaveBeenCalledTimes(4);

        // Values should remain unchanged
        expect(value.user.name).toBe('John');
        expect(value.user.address.city).toBe('New York');
        expect(value.items.length).toBe(3);
        expect(value.items[0]).toBe(1);

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('useException', () => {
    describe('Basic Usage', () => {
      it('should capture exceptions from a reactive state', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result: modelResult } = renderHook(() => useModel(UserSchema, initialValue));
        const [state] = modelResult.current;

        const { result } = renderHook(() => useException(state));
        expect(result.current).toEqual({});

        state.name = 10;
        expect(state.name).toBe('John');
        expect(result.current.name?.message).toBeDefined();

        state.name = 'Jane';
        expect(state.name).toBe('Jane');
        expect(result.current.name).toBeUndefined();
      });

      it('should return initial exception states', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result: modelResult } = renderHook(() => useModel(UserSchema, initialValue));
        const [state] = modelResult.current;

        const initialExceptions = { name: new Error('Name error') };
        const { result } = renderHook(() => useException(state, initialExceptions));

        expect(result.current).toEqual(initialExceptions);
      });

      it('should handle non-reactive state with error', () => {
        // Create a plain object (non-reactive state)
        const plainState = { name: 'John', age: 30 };

        renderHook(() => useException(plainState as any));

        // Should log an error about non-reactive state
        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('useFormWriter', () => {
    describe('Basic Usage', () => {
      it('should create a form state with data, errors, and helper functions', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30, email: 'john@example.com' };
        const { result: modelResult } = renderHook(() => useModel(UserSchema, initialValue));
        const [state] = modelResult.current;

        const { result } = renderHook(() => useFormWriter(state, ['name', 'age']));

        expect(result.current.data).toEqual({ name: 'John', age: 30 });
        expect(result.current.errors).toEqual({});
        expect(result.current.isValid).toBe(true);
        expect(result.current.isDirty).toBe(false);
        expect(typeof result.current.reset).toBe('function');
      });

      it('should detect dirty state when form data changes', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result: modelResult } = renderHook(() => useModel(UserSchema, initialValue));
        const [state] = modelResult.current;

        const { result } = renderHook(() => useFormWriter(state, ['name', 'age']));

        // Initially should not be dirty
        expect(result.current.isDirty).toBe(false);

        // Change form data
        act(() => {
          result.current.data.name = 'Jane';
        });

        // Should now be dirty
        expect(result.current.isDirty).toBe(true);
      });

      it('should reset form data to initial snapshot', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result: modelResult } = renderHook(() => useModel(UserSchema, initialValue));
        const [state] = modelResult.current;

        const { result } = renderHook(() => useFormWriter(state, ['name', 'age']));

        // Change form data
        act(() => {
          result.current.data.name = 'Jane';
        });

        // Verify change
        expect(result.current.data.name).toBe('Jane');
        expect(result.current.isDirty).toBe(true);

        // Reset form
        act(() => {
          result.current.reset();
        });

        // Should be back to initial values
        expect(result.current.data.name).toBe('John');
        expect(result.current.isDirty).toBe(false);
      });
    });
  });
});
