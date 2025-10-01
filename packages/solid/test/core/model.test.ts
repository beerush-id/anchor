import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { exceptionRef, modelRef } from '../../src/model';
import { z } from 'zod';
import { anchor } from '@anchorlib/core';

describe('Anchor Solid - Model', () => {
  describe('modelRef', () => {
    describe('Basic Usage', () => {
      it('should create a model state with initial value', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const { result } = renderHook(() => modelRef(UserSchema, initialValue));

        expect(result).toEqual(initialValue);
      });
    });
  });

  describe('exceptionRef', () => {
    describe('Basic Usage', () => {
      it('should create an exception map for handling errors', () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => exceptionRef(state));

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });
});
