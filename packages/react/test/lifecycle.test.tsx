import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup } from '../src/hoc.js';
import { createLifecycle, onCleanup, onMount } from '../src/lifecycle';
import '../src/client/index';

describe('Anchor React - Lifecycle', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  describe('createLifecycle', () => {
    it('should create a lifecycle manager', () => {
      const lifecycle = createLifecycle();

      expect(lifecycle).toBeDefined();
      expect(typeof lifecycle.mount).toBe('function');
      expect(typeof lifecycle.cleanup).toBe('function');
      expect(typeof lifecycle.render).toBe('function');
    });

    it('should execute mount handlers when mounted', () => {
      const lifecycle = createLifecycle();
      const unmountHandler = vi.fn();
      const mountHandler = vi.fn().mockReturnValue(unmountHandler);

      // Add mount handler manually to test
      lifecycle.render(() => {
        onMount(mountHandler);
      });

      lifecycle.mount();
      lifecycle.cleanup();

      expect(mountHandler).toHaveBeenCalled();
      expect(unmountHandler).toHaveBeenCalled();
    });

    it('should execute cleanup handlers when cleaned up', () => {
      const lifecycle = createLifecycle();
      const cleanupHandler = vi.fn();

      // Manually add a cleanup handler to test
      lifecycle.render(() => {
        onCleanup(cleanupHandler);
      });

      lifecycle.cleanup();
      expect(cleanupHandler).toHaveBeenCalled();
    });

    it('should execute render function', () => {
      const lifecycle = createLifecycle();
      const renderFn = vi.fn().mockReturnValue('result');

      const result = lifecycle.render(renderFn);

      expect(result).toBe('result');
      expect(renderFn).toHaveBeenCalled();
    });
  });

  describe('onMount', () => {
    it('should warn register a mount handler outside of component', () => {
      vi.useFakeTimers();

      const handler = vi.fn();
      onMount(handler);
      vi.runAllTimers();

      expect(handler).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should register a mount handler', () => {
      const mountHandler = vi.fn();
      const Component = setup(() => {
        onMount(mountHandler);
        return <></>;
      });

      render(<Component />);

      expect(mountHandler).not.toHaveBeenCalled();
    });

    it('should handle unmount handler', () => {
      vi.useFakeTimers();

      const unmountHandler = vi.fn();
      const Component = setup(() => {
        onMount(() => unmountHandler);
        return <></>;
      });
      const { unmount } = render(<Component />);

      expect(unmountHandler).not.toHaveBeenCalled();
      unmount();
      vi.runAllTimers();

      expect(unmountHandler).toHaveBeenCalled();
    });
  });

  describe('onCleanup', () => {
    it('should register a cleanup handler', () => {
      vi.useFakeTimers();
      const cleanupHandler = vi.fn();

      const Component = setup(() => {
        onCleanup(cleanupHandler);
        return <></>;
      });

      const { unmount } = render(<Component />);
      expect(cleanupHandler).not.toHaveBeenCalled();

      unmount();
      vi.runAllTimers();

      expect(cleanupHandler).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
