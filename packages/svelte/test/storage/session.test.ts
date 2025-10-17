import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SessionBasic from './session-basic.svelte';
import { session } from '@anchorlib/storage';

// Mock the dependencies
vi.mock('@anchorlib/storage', () => {
  const session = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (session as any).leave = vi.fn();

  return { session };
});

describe('Storage - Session', () => {
  const mockSessionState = { key: 'value' };

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

      render(SessionBasic, { name, init });

      expect(session).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the session state object', () => {
      const name = 'test-session';
      const init = { key: 'initial' };

      render(SessionBasic, { name, init });

      expect(screen.getByTestId('state-value').textContent).toBe('value');
      // Component unmount would call session.leave to clean up
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-session';
      const init = { key: 'initial' };
      const options = { schema: {} };

      render(SessionBasic, { name, init, options });

      expect(session).toHaveBeenCalledWith(name, init, options);
    });
  });
});
