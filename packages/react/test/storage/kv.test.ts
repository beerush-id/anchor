import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKv } from '../../src/storage/kv';
// @ts-ignore
import { kv } from '@anchorlib/storage/db';

// Mock the dependencies
vi.mock('@anchorlib/storage/db', () => {
  return {
    kv: vi.fn(),
  };
});

vi.mock('../../src/index.js', () => {
  return {
    useConstant: vi.fn((initFn) => {
      const result = initFn();
      return [result];
    }),
    CLEANUP_DEBOUNCE_TIME: 100,
  };
});

describe('Storage - KV', () => {
  const mockKvState = {
    value: 'test-value',
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (kv as never as Mock).mockReturnValue(mockKvState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useKv', () => {
    it('should call kv with the provided name and initial value', () => {
      const name = 'test-key';
      const init = 'initial-value';

      renderHook(() => useKv(name, init));

      expect(kv).toHaveBeenCalledWith(name, init);
    });

    it('should return the current value and state object', () => {
      const name = 'test-key';
      const init = 'initial-value';

      const { result } = renderHook(() => useKv(name, init));

      expect(result.current).toEqual(['test-value', mockKvState]);
    });

    it('should pass correct dependencies to useConstant', () => {
      const name = 'test-key';
      const init = 'initial-value';

      renderHook(() => useKv(name, init));

      expect(kv).toHaveBeenCalledWith(name, init);
    });
  });
});
