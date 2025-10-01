import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { persistentRef } from '../../src/storage/persistent.js';
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

      mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = persistentRef(name, init);
          return { state };
        },
      });

      expect(persistent).toHaveBeenCalledWith(name, init, undefined);
    });

    it('should return the persistent state object', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };

      const wrapper = mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = persistentRef(name, init);
          return { state };
        },
      });

      expect(wrapper.text()).toBe('value');
      wrapper.unmount();
      expect(persistent.leave).toHaveBeenCalled();
    });

    it('should handle options parameter correctly', () => {
      const name = 'test-persistent';
      const init = { key: 'initial' };
      const options = { schema: {} };

      mount({
        template: '<div>{{ state.value.key }}</div>',
        setup() {
          const state = persistentRef(name, init, options as never);
          return { state };
        },
      });

      expect(persistent).toHaveBeenCalledWith(name, init, options);
    });
  });
});
