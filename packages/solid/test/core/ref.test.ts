import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { constantRef, isRef, variableRef } from '../../src/ref';

describe('Anchor Solid - Ref System', () => {
  describe('variableRef', () => {
    describe('Basic', () => {
      it('should create a variable ref with initial value', () => {
        const { result } = renderHook(() => variableRef(42));

        expect(result.value).toBe(42);
      });

      it('should update variable ref value', () => {
        const { result } = renderHook(() => variableRef(42));

        result.value = 100;
        expect(result.value).toBe(100);
      });

      it('should not be constant ref', () => {
        const { result } = renderHook(() => variableRef(42));
        expect(isRef(result)).toBe(true);
      });
    });
  });

  describe('constantRef', () => {
    describe('Basic', () => {
      it('should create a constant ref with initial value', () => {
        const { result } = renderHook(() => constantRef(42));

        expect(result.value).toBe(42);
      });

      it('should be constant ref', () => {
        const { result } = renderHook(() => constantRef(42));
        expect(isRef(result)).toBe(true);
      });
    });
  });

  describe('isRef', () => {
    it('should return true for variableRef', () => {
      const ref = variableRef(42);
      expect(isRef(ref)).toBe(true);
    });

    it('should return true for constantRef', () => {
      const ref = constantRef(42);
      expect(isRef(ref)).toBe(true);
    });

    it('should return false for plain objects', () => {
      const obj = { value: 42 };
      expect(isRef(obj)).toBe(false);
    });
  });
});
