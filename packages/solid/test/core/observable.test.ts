import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { observedRef } from '../../src/index.js';
import { anchor } from '@anchorlib/core';

describe('Anchor Solid - Observable', () => {
  describe('observedRef', () => {
    describe('Basic Usage', () => {
      it('should create an observed reference with initial value', () => {
        const state = anchor({ value: 'test value' });
        const { result } = renderHook(() => observedRef(() => state.value));

        expect(result.value).toBe('test value');
        state.value = 'updated value';
        expect(result.value).toBe('updated value');
      });
    });
  });
});
