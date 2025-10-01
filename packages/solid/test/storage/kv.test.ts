import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { kvRef } from '../../src/storage/kv';
import { kv } from '@anchorlib/storage/db';

// Mock the dependencies
vi.mock('@anchorlib/storage/db', () => {
  const kv = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (kv as any).leave = vi.fn();

  return { kv };
});

describe('Storage - KV', () => {
  const mockKvState = {
    value: 'test-value',
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).mockReturnValue(mockKvState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('kvRef', () => {
    it('should call kv with the provided name and initial value', () => {
      const name = 'test-key';
      const init = 'initial-value';

      renderHook(() => kvRef(name, init));

      expect(kv).toHaveBeenCalledWith(name, init);
    });

    it('should return the kv state object', () => {
      const name = 'test-key';
      const init = 'initial-value';

      const { result } = renderHook(() => kvRef(name, init));

      expect(result).toEqual(mockKvState);
    });
  });
});
