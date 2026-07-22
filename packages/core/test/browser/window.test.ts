import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_WINDOW } from '../../src/browser/window.js';

describe('browser/window', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 1, 1));

    // Stub methods that may not be fully implemented in jsdom
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.hasFocus = vi.fn().mockReturnValue(true);

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

    LIVE_WINDOW.width; // Trigger watchWindow
    await acceptInteractions(false);
  });

  beforeEach(() => {
    vi.setSystemTime(new Date(2023, 1, 1));

    // Stub methods that may not be fully implemented in jsdom
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.hasFocus = vi.fn().mockReturnValue(true);

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should initialize window state correctly', async () => {
    expect(LIVE_WINDOW.width).toBe(1024);
    expect(LIVE_WINDOW.height).toBe(768);
    expect(LIVE_WINDOW.isVisible).toBe(true);
    expect(LIVE_WINDOW.isFocused).toBe(true);
    expect(LIVE_WINDOW.isIdle).toBe(false);
  });

  it('should update on resize events', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 800 });
    Object.defineProperty(window, 'innerHeight', { value: 600 });

    window.dispatchEvent(new Event('resize'));

    expect(LIVE_WINDOW.width).toBe(800);
    expect(LIVE_WINDOW.height).toBe(600);
  });

  it('should update focus state correctly', async () => {
    window.dispatchEvent(new Event('blur'));
    expect(LIVE_WINDOW.isFocused).toBe(false);

    window.dispatchEvent(new Event('focus'));
    expect(LIVE_WINDOW.isFocused).toBe(true);
  });

  it('should update visibility state correctly', async () => {
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(LIVE_WINDOW.isVisible).toBe(false);

    Object.defineProperty(document, 'hidden', { value: false });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(LIVE_WINDOW.isVisible).toBe(true);
  });

  it('should handle idle state timeouts', async () => {
    expect(LIVE_WINDOW.isIdle).toBe(false);

    // Default IDLE_TIMEOUT is 5 minutes (300,000 ms)
    vi.advanceTimersByTime(300000);
    expect(LIVE_WINDOW.isIdle).toBe(true);

    // Any activity should reset idle state
    document.dispatchEvent(new Event('mousemove'));
    expect(LIVE_WINDOW.isIdle).toBe(false);
  });

  it('should allow setting a custom idle timeout', async () => {
    LIVE_WINDOW.setIdleTimeout(1); // 1 minute

    // Reset activity timer
    document.dispatchEvent(new Event('keydown'));
    expect(LIVE_WINDOW.isIdle).toBe(false);

    vi.advanceTimersByTime(60000); // 1 minute
    expect(LIVE_WINDOW.isIdle).toBe(true);
  });

  describe('Coverage', () => {
    it('should clean up listeners on dispose', async () => {
      // Trigger disposer
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      await acceptInteractions(false);

      // Simulate resize
      const prevWidth = LIVE_WINDOW.width;
      Object.defineProperty(window, 'innerWidth', { value: prevWidth + 100, configurable: true });
      window.dispatchEvent(new Event('resize'));

      expect(LIVE_WINDOW.width).toBe(prevWidth); // Remains unchanged
    });
  });
});
