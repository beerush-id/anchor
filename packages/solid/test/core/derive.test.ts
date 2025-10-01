import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { anchorRef } from '../../src/anchor';
import { derivedRef } from '../../src/derive';

describe('Anchor Solid - Derive System', () => {
  describe('derivedRef', () => {
    describe('Basic Usage', () => {
      it('should create a derived reference from a source state', () => {
        const source = anchorRef({ count: 42 });
        const { result } = renderHook(() => derivedRef(source, (s) => s.count * 2));

        expect(result.value).toBe(84);
      });

      it('should update derived value when source changes', () => {
        const source = anchorRef({ count: 42 });
        const { result } = renderHook(() => derivedRef(source, (s) => s.count * 2));

        source.count = 50;
        // In Solid, reactivity might work differently than React
        // This test might need adjustment based on actual implementation
        expect(result.value).toBe(100);
      });
    });
  });
});
