import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSession } from '../../src/storage/session';
import { session } from '@anchorlib/storage';
import { useConstant } from '../../src/index.js';

// Mock the dependencies
vi.mock('@anchorlib/storage', () => {
  return {
    session: vi.fn(),
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

describe('Storage - Session', () => {
  const mockSessionState = {
    value: { sessionId: 'session-123' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (session as never as Mock).mockReturnValue(mockSessionState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useSession', () => {
    it('should call session with the provided name and initial value', () => {
      const name = 'test-session';
      const init = { sessionId: 'init-session' };

      renderHook(() => useSession(name, init));

      expect(session).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the current value and state object', () => {
      const name = 'test-session';
      const init = { sessionId: 'init-session' };

      const { result } = renderHook(() => useSession(name, init));

      expect(result.current).toEqual([{ sessionId: 'session-123' }, mockSessionState]);
    });

    it('should pass correct dependencies to useConstant', () => {
      const name = 'test-session';
      const init = { sessionId: 'init-session' };
      const options = { schema: {} };

      renderHook(() => useSession(name, init, options as never));

      expect(useConstant).toHaveBeenCalledWith(expect.any(Function), [name, init, options]);
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-session';
      const init = { sessionId: 'init-session' };
      const options = { schema: {} };

      renderHook(() => useSession(name, init, options as never));

      expect(session).toHaveBeenCalledWith(name, init, options);
    });
  });
});
