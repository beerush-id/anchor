import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PersistentBasic from './persistent-basic.svelte';
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
    key: 'value',
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

      render(PersistentBasic, { name, init });

      expect(persistent).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the persistent state object', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      render(PersistentBasic, { name, init });

      expect(screen.getByTestId('state-value').textContent).toBe('value');
      // Component unmount would call persistent.leave to clean up
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };
      const options = { schema: {} };

      render(PersistentBasic, { name, init, options });

      expect(persistent).toHaveBeenCalledWith(name, init, options);
    });
  });
});
