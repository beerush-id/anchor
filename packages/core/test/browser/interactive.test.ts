import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { acceptInteractions, onInteractive } from '../../src/browser/interactive.js';
import { sleep } from '../../src/index.js';

describe('browser/interactive', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });

  it('should queue handlers before acceptInteractions is called', () => {
    const handler = vi.fn();
    onInteractive(handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should execute queued handlers when acceptInteractions is called', async () => {
    const handler = vi.fn();
    onInteractive(handler);
    await acceptInteractions(false); // pass false for synchronous processing without sleep(0)
    expect(handler).toHaveBeenCalled();
  });

  it('should execute handlers immediately if already accepted', () => {
    const handler = vi.fn();
    onInteractive(handler);
    expect(handler).toHaveBeenCalled();
  });

  it('should collect and run disposers on subsequent acceptInteractions', async () => {
    const disposer = vi.fn();
    const handler = vi.fn(() => disposer);

    onInteractive(handler);
    expect(handler).toHaveBeenCalled();
    expect(disposer).not.toHaveBeenCalled();

    await acceptInteractions(false);
    expect(disposer).toHaveBeenCalled();
  });

  it('should handle async handlers and their disposers', async () => {
    const disposer = vi.fn();
    const handler = vi.fn(async () => {
      await sleep(5);
      return disposer;
    });

    onInteractive(handler);
    expect(handler).toHaveBeenCalled();
    expect(disposer).not.toHaveBeenCalled();

    // Wait for the async handler to resolve and register its disposer
    await sleep(15);

    await acceptInteractions(false);
    expect(disposer).toHaveBeenCalled();
  });

  it('should handle default deferred acceptInteractions and async handlers returning non-function', async () => {
    const handler = vi.fn(async () => {
      await sleep(5);
      return undefined;
    });

    onInteractive(handler);
    await acceptInteractions(); // uses default deferred = true
    await sleep(15);
    expect(handler).toHaveBeenCalled();
  });

  it('should recover from handler errors without breaking others', async () => {
    const badHandler = vi.fn(() => {
      throw new Error('Test error');
    });
    const goodHandler = vi.fn();

    onInteractive(badHandler);
    onInteractive(goodHandler);

    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });

  describe('Coverage', () => {
    it('should catch errors from async handlers', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const badAsyncHandler = vi.fn().mockRejectedValue(new Error('Async error'));
      onInteractive(badAsyncHandler);

      await acceptInteractions(false);
      // Wait a microtask for the promise to reject
      await Promise.resolve();

      expect(badAsyncHandler).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('[INTERACTIVE-ERROR]: Interactive handler throwing an exception.');

      consoleError.mockRestore();
    });

    it('should log violation if interactions are not accepted within 1000ms', async () => {
      vi.useFakeTimers();
      vi.resetModules();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { onInteractive: freshOnInteractive } = await import('../../src/browser/interactive.js');

      freshOnInteractive(() => {}); // Queue a listener

      // Advance timers by 1000ms to trigger the violation check
      vi.advanceTimersByTime(1000);

      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      vi.useRealTimers();
    });
  });
});
