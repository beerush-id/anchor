import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useImmutable, useWriter } from '../../src/index.js';
import { z } from 'zod';

describe('Anchor React - Immutable', () => {
  describe('useImmutable', () => {
    describe('Basic Usage', () => {
      it('should create an immutable state with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const { result } = renderHook(() => useImmutable(initialValue));

        const [value, ref] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
      });

      it('should prevent direct mutation of immutable state properties', () => {
        const initialValue = { count: 42, name: 'test' };
        const { result } = renderHook(() => useImmutable(initialValue));

        const [value] = result.current;

        // Capture console.error to check if immutability violation is logged
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Attempt to mutate immutable state - should not throw but log error
        (value as any).count = 43;
        (value as any).newProp = 'test';
        delete (value as any).name;

        // Should have logged immutability violations
        expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Read-only state violation detected'),
          expect.any(Error),
          '\n'
        );

        // Value should remain unchanged
        expect(value.count).toBe(42);
        expect(value.name).toBe('test');
        expect((value as any).newProp).toBeUndefined();

        consoleErrorSpy.mockRestore();
      });

      it('should maintain immutability through updates', () => {
        const initialValue = { count: 42 };
        const { result } = renderHook(() => useImmutable(initialValue));

        const [, ref, setter] = result.current;
        const newValue = { count: 10 };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        act(() => {
          setter(newValue);
        });

        // Previous value should still be immutable
        (result.current[0] as any).count = 99;

        // New value should also be immutable
        (ref.value as any).count = 99;

        // Should have logged immutability violations
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

        // Values should remain unchanged
        expect(result.current[0].count).toBe(42);
        expect(ref.value.count).toBe(10);

        consoleErrorSpy.mockRestore();
      });
    });

    describe('With Schema', () => {
      it('should create an immutable state with Zod schema', () => {
        const UserSchema = z.object({
          name: z.string().min(3, 'Name must be at least 3 characters'),
          age: z.number().min(18, 'Must be at least 18 years old'),
        });

        const initialValue = { name: 'John', age: 30 };

        const { result } = renderHook(() => useImmutable(initialValue, UserSchema));

        const [value, ref] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);

        // Should still be immutable
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (value as any).name = 'Jane';
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it('should validate initial value against schema', () => {
        const UserSchema = z.object({
          name: z.string().min(3, 'Name must be at least 3 characters'),
          age: z.number().min(18, 'Must be at least 18 years old'),
        });

        // Invalid initial value - name too short
        const initialValue = { name: 'Jo', age: 30 };

        // Capture console.error to check if validation error is logged
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useImmutable(initialValue, UserSchema));

        // Should log schema validation error
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Attempted to initialize state with schema'),
          expect.any(Object),
          '\n'
        );

        const [value, ref] = result.current;
        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Nested Objects', () => {
      it('should make nested objects immutable', () => {
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

        const { result } = renderHook(() => useImmutable(initialValue));

        const [value] = result.current;

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Should prevent mutation of nested objects
        (value as any).user.name = 'Jane';
        (value as any).user.address.city = 'Boston';
        (value as any).items.push(4);
        (value as any).items[0] = 10;

        // Should have logged immutability violations
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

  describe('useWriter', () => {
    describe('Basic Usage', () => {
      it('should create a mutable version that can modify the immutable state', () => {
        const { result: immutableResult } = renderHook(() => useImmutable({ count: 42 }));
        const [, immutableRef] = immutableResult.current;

        const { result: writerResult } = renderHook(() => useWriter(immutableRef.value));

        // Should be able to mutate through the writer without errors
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        writerResult.current.count = 43;

        // Should not have logged any errors
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();

        // Original immutable state should reflect the change
        expect(immutableRef.value.count).toBe(43);
      });

      it('should allow adding new properties through the writer', () => {
        const { result: immutableResult } = renderHook(() => useImmutable({ count: 42 }));
        const [, immutableRef] = immutableResult.current;

        const { result: writerResult } = renderHook(() => useWriter(immutableRef.value));

        // Should be able to add new properties
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (writerResult.current as any).name = 'test';

        // Should not have logged any errors
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();

        // Original immutable state should reflect the change
        expect((immutableRef.value as any).name).toBe('test');
      });
    });

    describe('With Contracts', () => {
      it('should only allow mutation of contracted properties', () => {
        const { result: immutableResult } = renderHook(() =>
          useImmutable({
            count: 42,
            name: 'test',
            active: true,
          })
        );
        const [, immutableRef] = immutableResult.current;

        // Create a writer with contracts that only allow mutating 'count' and 'name'
        const { result: writerResult } = renderHook(() => useWriter(immutableRef.value, ['count', 'name']));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Should be able to mutate contracted properties without errors
        writerResult.current.count = 43;
        writerResult.current.name = 'updated';

        // Should NOT be able to mutate non-contracted properties
        (writerResult.current as any).active = false;

        // Should have logged one contract violation
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Write contract violation detected'),
          expect.any(Error),
          '\n'
        );

        consoleErrorSpy.mockRestore();

        // Permitted changes should be reflected in the original state
        expect(immutableRef.value.count).toBe(43);
        expect(immutableRef.value.name).toBe('updated');
        // Non-contracted property should remain unchanged
        expect(immutableRef.value.active).toBe(true);
      });
    });
  });
});
