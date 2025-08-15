import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger } from '@anchor/core';

describe('Anchor Core - Controller', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Controller', () => {
    it('should provide subscribe function to listen for changes', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.subscribe).toBe('function');
      expect(controller?.subscribe).toBeInstanceOf(Function);
    });

    it('should provide destroy function to clean up', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.destroy).toBe('function');

      // After destroy, state should still work but cleanup internal references
      controller?.destroy();
    });
  });
});
