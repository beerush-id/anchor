import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { persistentRef } from '../../src/storage/index.js';
import { persistent } from '@anchorlib/storage';

// Mock the dependencies
vi.mock('@anchorlib/storage', () => {
  const persistent = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (persistent as any).leave = vi.fn();

  return { persistent };
});

describe('Storage - Persistent', () => {
  const mockPersistentState = {
    value: { key: 'value' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (persistent as any).mockReturnValue(mockPersistentState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('persistentRef', () => {
    it('should call persistent with the provided name and initial value', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      renderHook(() => persistentRef(name, init));

      expect(persistent).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the persistent state object', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      const { result } = renderHook(() => persistentRef(name, init));

      expect(result).toEqual(mockPersistentState);
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };
      const options = { schema: {} };

      renderHook(() => persistentRef(name, init, options as never));

      expect(persistent).toHaveBeenCalledWith(name, init, options);
    });
  });
});
