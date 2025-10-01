import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { sessionRef } from '../../src/storage/session';
import { session } from '@anchorlib/storage';

// Mock the dependencies
vi.mock('@anchorlib/storage', () => {
  const session = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (session as any).leave = vi.fn();

  return { session };
});

describe('Storage - Session', () => {
  const mockSessionState = {
    value: { key: 'value' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (session as any).mockReturnValue(mockSessionState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sessionRef', () => {
    it('should call session with the provided name and initial value', () => {
      const name = 'test-session';
      const init = { key: 'initial' };

      renderHook(() => sessionRef(name, init));

      expect(session).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the session state object', () => {
      const name = 'test-session';
      const init = { key: 'initial' };

      const { result } = renderHook(() => sessionRef(name, init));

      expect(result).toEqual(mockSessionState);
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-session';
      const init = { key: 'initial' };
      const options = { schema: {} };

      renderHook(() => sessionRef(name, init, options as never));

      expect(session).toHaveBeenCalledWith(name, init, options);
    });
  });
});
