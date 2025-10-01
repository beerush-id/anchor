import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { sessionRef } from '../../src/storage/session.js';
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

      mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = sessionRef(name, init);
          return { state };
        },
      });

      expect(session).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the session state object', () => {
      const name = 'test-session';
      const init = { key: 'initial' };

      const wrapper = mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = sessionRef(name, init);
          return { state };
        },
      });

      expect(wrapper.text()).toBe('value');
      wrapper.unmount();
      expect(session.leave).toHaveBeenCalled();
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-session';
      const init = { key: 'initial' };
      const options = { schema: {} };

      mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = sessionRef(name, init, options as never);
          return { state };
        },
      });

      expect(session).toHaveBeenCalledWith(name, init, options);
    });
  });
});
