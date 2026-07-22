import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sleep } from '../../src/index.js';

describe('browser/interactive', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });

  beforeEach(() => {
    vi.resetModules();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('should queue handlers before acceptInteractions is called', async () => {
    const { onInteractive } = await import('../../src/browser/interactive.js');
    const handler = vi.fn();
    onInteractive(handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should execute queued handlers when acceptInteractions is called', async () => {
    const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
    const handler = vi.fn();
    onInteractive(handler);
    await acceptInteractions(false); // pass false for synchronous processing without sleep(0)
    expect(handler).toHaveBeenCalled();
  });

  it('should execute handlers immediately if already accepted', async () => {
    const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
    await acceptInteractions(false);

    const handler = vi.fn();
    onInteractive(handler);
    expect(handler).toHaveBeenCalled();
  });

  it('should collect and run disposers on subsequent acceptInteractions', async () => {
    const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
    const disposer = vi.fn();
    const handler = vi.fn(() => disposer);

    onInteractive(handler);
    await acceptInteractions(false);
    expect(handler).toHaveBeenCalled();
    expect(disposer).not.toHaveBeenCalled();

    await acceptInteractions(false);
    expect(disposer).toHaveBeenCalled();
  });

  it('should handle async handlers and their disposers', async () => {
    const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
    const disposer = vi.fn();
    const handler = vi.fn(async () => {
      await sleep(10);
      return disposer;
    });

    onInteractive(handler);
    await acceptInteractions(false);
    expect(handler).toHaveBeenCalled();
    expect(disposer).not.toHaveBeenCalled();

    // Wait for the async handler to resolve and register its disposer
    await sleep(20);

    await acceptInteractions(false);
    expect(disposer).toHaveBeenCalled();
  });

  it('should recover from handler errors without breaking others', async () => {
    const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
    const badHandler = vi.fn(() => {
      throw new Error('Test error');
    });
    const goodHandler = vi.fn();

    // Suppress console.error for this test as it's expected
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    onInteractive(badHandler);
    onInteractive(goodHandler);

    await acceptInteractions(false);

    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  describe('Coverage', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should catch errors from async handlers', async () => {
      const { onInteractive, acceptInteractions } = await import('../../src/browser/interactive.js');
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
      // Need to re-import in a fresh environment where the setTimeout is evaluated
      vi.resetModules();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // We need to import it so the script runs and schedules the setTimeout
      const { onInteractive } = await import('../../src/browser/interactive.js');

      onInteractive(() => {}); // Queue a listener

      // Advance timers by 1000ms to trigger the violation check
      vi.advanceTimersByTime(1000);

      // The captureStack.violation.general logs to console.error internally
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
