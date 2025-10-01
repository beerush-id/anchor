import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { immutableRef, writableRef } from '../../src/immutable';

describe('Anchor Solid - Immutable', () => {
  describe('immutableRef', () => {
    describe('Basic Usage', () => {
      it('should create an immutable state with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const { result } = renderHook(() => immutableRef(initialValue));

        expect(result).toEqual(initialValue);
      });
    });
  });

  describe('writableRef', () => {
    describe('Basic Usage', () => {
      it('should create a mutable reference to a reactive state', () => {
        const immutableState = immutableRef({ count: 42 });
        const { result } = renderHook(() => writableRef(immutableState));

        expect(result).toEqual({ count: 42 });
      });
    });
  });
});
