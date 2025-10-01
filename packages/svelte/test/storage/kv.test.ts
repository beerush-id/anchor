import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import KVBasic from './kv-basic.svelte';
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

      render(KVBasic, { name, init });

      expect(kv).toHaveBeenCalledWith(name, init);
    });

    it('should return the kv state object', () => {
      const name = 'test-key';
      const init = 'initial-value';

      render(KVBasic, { name, init });

      expect(screen.getByTestId('state-value').textContent).toBe('test-value');
      // Component unmount would call kv.leave to clean up
    });
  });
});
