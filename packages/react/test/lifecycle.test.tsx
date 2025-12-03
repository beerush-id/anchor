import { mutable } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup } from '../src/hoc';
import { createLifecycle, effect, onCleanup, onMount } from '../src/lifecycle';
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
      const effectCleanup = vi.fn();
      const effectHandler = vi.fn().mockReturnValue(effectCleanup);

      // Add mount handler manually to test
      lifecycle.render(() => {
        onMount(mountHandler);
        effect(effectHandler);
      });

      lifecycle.mount();
      lifecycle.cleanup();

      expect(mountHandler).toHaveBeenCalled();
      expect(effectHandler).toHaveBeenCalled();
      expect(unmountHandler).toHaveBeenCalled();
      expect(effectCleanup).toHaveBeenCalled();
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

  describe('effect', () => {
    it('should warn register an effect handler outside of component', () => {
      vi.useFakeTimers();

      const handler = vi.fn();
      effect(handler);
      vi.runAllTimers();

      expect(handler).toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should register an effect handler', () => {
      const handler = vi.fn();
      const Component = setup(() => {
        effect(handler);

        return <></>;
      });

      render(<Component />);

      expect(handler).toHaveBeenCalled();
    });

    it('should re-run when the observed state changes', () => {
      const count = mutable(0);
      const handler = vi.fn().mockImplementation(() => count.value);

      const Component = setup(() => {
        effect(handler);
        expect(handler).toHaveBeenCalled();

        return <></>;
      });

      render(<Component />);

      count.value++;
      expect(handler).toHaveBeenCalledTimes(2);

      const handler2Cleanup = vi.fn();
      const handler2 = vi.fn().mockImplementation(() => {
        expect(count.value).toBeGreaterThan(0);
        return handler2Cleanup;
      });

      const Component2 = setup(() => {
        effect(handler2);
        return <></>;
      });

      render(<Component2 />);

      expect(handler2).toHaveBeenCalled();
      expect(handler2Cleanup).not.toHaveBeenCalled();

      count.value++;

      expect(handler2Cleanup).toHaveBeenCalled();
      expect(handler2Cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle logic switching inside effect', () => {
      const theme = mutable('light');
      const system = mutable('light');
      const state = mutable({ theme: 'light', system: false });

      const handler = vi.fn().mockImplementation(() => {
        if (state.system) {
          state.theme = system.value;
        } else {
          state.theme = theme.value;
        }
      });

      const Component = setup(() => {
        effect(handler);
        return <></>;
      });

      render(<Component />);

      // Reset the mock to start counting from zero
      handler.mockClear();

      // Change theme - should trigger effect since it's used when system=false
      theme.value = 'dark';
      expect(handler).toHaveBeenCalledTimes(1);

      // Change system - should NOT trigger effect since it's not accessed when system=false
      handler.mockClear();
      system.value = 'dark';
      expect(handler).toHaveBeenCalledTimes(0);

      // Change system flag - should trigger effect since it changes which variable is used
      state.system = true;
      expect(handler).toHaveBeenCalledTimes(1);

      // Now that system=true, changing theme should NOT trigger effect
      handler.mockClear();
      theme.value = 'light';
      expect(handler).toHaveBeenCalledTimes(0);

      // But changing system should trigger effect since it's now used
      system.value = 'light';
      expect(handler).toHaveBeenCalledTimes(1);

      // Switch back to using theme
      state.system = false;
      expect(handler).toHaveBeenCalledTimes(2); // Triggers because logic changed

      // Now changing theme should trigger effect again
      handler.mockClear();
      theme.value = 'dark';
      expect(handler).toHaveBeenCalledTimes(1);

      // Changing system should NOT trigger effect since it's not used
      handler.mockClear();
      system.value = 'light';
      expect(handler).toHaveBeenCalledTimes(0);
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
    it('should warn register a cleanup handler outside of component', () => {
      vi.useFakeTimers();

      const handler = vi.fn();
      onCleanup(handler);
      vi.runAllTimers();

      expect(handler).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

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
