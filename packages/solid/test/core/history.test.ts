import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { historyRef } from '../../src/history';
import { anchorRef } from '../../src/anchor';

describe('Anchor Solid - History', () => {
  describe('historyRef', () => {
    describe('Basic Usage', () => {
      it('should create a history state with initial value', () => {
        const state = anchorRef({ count: 42 });
        const { result } = renderHook(() => historyRef(state));

        expect(result).toBeDefined();
        expect(typeof result.backward).toBe('function');
        expect(typeof result.forward).toBe('function');
        expect(result.canBackward).toBe(false);
        expect(result.canForward).toBe(false);
      });
    });
  });
});
