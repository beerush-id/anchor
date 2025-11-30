import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePersistent } from '../../src/storage/index.js';
import { persistent } from '@anchorlib/storage';
import { useConstant } from '../../src/index.js';

// Mock the dependencies
vi.mock('@anchorlib/storage', () => {
  return {
    persistent: vi.fn(),
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

describe('Storage - Persistent', () => {
  const mockPersistentState = {
    value: { key: 'value' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (persistent as never as Mock).mockReturnValue(mockPersistentState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePersistent', () => {
    it('should call persistent with the provided name and initial value', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      renderHook(() => usePersistent(name, init));

      expect(persistent).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the current value and state object', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      const { result } = renderHook(() => usePersistent(name, init));

      expect(result.current).toEqual([{ key: 'value' }, mockPersistentState]);
    });

    it('should pass correct dependencies to useConstant', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };
      const options = { schema: {} };

      renderHook(() => usePersistent(name, init, options as never));

      expect(useConstant).toHaveBeenCalledWith(expect.any(Function), [name, init, options]);
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };
      const options = { schema: {} };

      renderHook(() => usePersistent(name, init, options as never));

      expect(persistent).toHaveBeenCalledWith(name, init, options);
    });
  });
});
