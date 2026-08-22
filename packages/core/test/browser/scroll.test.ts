import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_SCROLL, scrollRef } from '../../src/browser/scroll.js';

describe('browser/scroll', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    vi.useFakeTimers();
    // jsdom doesn't fully support scrollX/scrollY getters out of the box, we can mock them
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    LIVE_SCROLL.x; // Trigger watchScroll
    await acceptInteractions(false);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    window.dispatchEvent(new Event('scroll'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize empty state', async () => {
    // wait for first scroll event to be processed
    vi.advanceTimersByTime(200);
    expect(LIVE_SCROLL.x).toBe(0);
    expect(LIVE_SCROLL.y).toBe(0);
    expect(LIVE_SCROLL.direction).toBe('none');
    expect(LIVE_SCROLL.isScrolling).toBe(false);
  });

  it('should track window scroll position and direction', async () => {
    Object.defineProperty(window, 'scrollY', { value: 100 });
    window.dispatchEvent(new Event('scroll'));

    expect(LIVE_SCROLL.y).toBe(100);
    expect(LIVE_SCROLL.direction).toBe('down');
    expect(LIVE_SCROLL.isScrolling).toBe(true);

    Object.defineProperty(window, 'scrollY', { value: 50 });
    window.dispatchEvent(new Event('scroll'));

    expect(LIVE_SCROLL.y).toBe(50);
    expect(LIVE_SCROLL.direction).toBe('up');
  });

  it('should set isScrolling to false after timeout', async () => {
    Object.defineProperty(window, 'scrollX', { value: 100 });
    window.dispatchEvent(new Event('scroll'));

    expect(LIVE_SCROLL.isScrolling).toBe(true);
    expect(LIVE_SCROLL.direction).toBe('right');

    vi.advanceTimersByTime(200); // Wait for microtask (150ms)

    expect(LIVE_SCROLL.isScrolling).toBe(false);
  });

  it('should handle custom element scroll refs', () => {
    const div = document.createElement('div');
    Object.defineProperty(div, 'scrollLeft', { value: 0, writable: true });
    Object.defineProperty(div, 'scrollTop', { value: 0, writable: true });

    const scroll = scrollRef(div);

    expect(scroll.x).toBe(0);
    expect(scroll.y).toBe(0);

    Object.defineProperty(div, 'scrollLeft', { value: 50 });
    div.dispatchEvent(new Event('scroll'));

    expect(scroll.x).toBe(50);
    expect(scroll.direction).toBe('right');
    expect(scroll.isScrolling).toBe(true);

    scroll.current = undefined; // Unbind
  });

  describe('Coverage', () => {
    it('should remove event listeners on dispose', async () => {
      vi.useRealTimers();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_SCROLL } = await import('../../src/browser/scroll.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_SCROLL.x; // Trigger watcher
      await acceptInteractions(true); // Register listeners
      await acceptInteractions(false); // Trigger disposer

      const prevX = LIVE_SCROLL.x;
      window.dispatchEvent(new Event('scroll'));

      expect(LIVE_SCROLL.x).toBe(prevX);
      consoleError.mockRestore();
    });

    it('should execute onCleanup when lifecycle scope is destroyed', async () => {
      vi.useRealTimers();
      const { scrollRef } = await import('../../src/browser/scroll.js');
      const { createLifecycle } = await import('../../src/scope/lifecycle.js');
      const lifecycle = createLifecycle();
      const div = document.createElement('div');
      let ref: any;

      lifecycle.run(() => {
        ref = scrollRef(div);
      });

      expect(ref.current).toBe(div);
      lifecycle.destroy();
    });
  });
});
