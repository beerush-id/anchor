import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_MEDIA, mediaQuery } from '../../src/browser/media.js';

class MockMediaQueryList {
  matches = false;
  media: string;
  listeners: EventListener[] = [];

  constructor(query: string) {
    this.media = query;
  }

  addEventListener(event: string, listener: EventListener) {
    if (event === 'change') this.listeners.push(listener);
  }

  removeEventListener(event: string, listener: EventListener) {
    if (event === 'change') {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
  }

  dispatchEvent(event: any) {
    this.listeners.forEach((listener) => listener(event));
  }
}

describe('browser/media', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  let mediaQueries: Record<string, MockMediaQueryList> = {};

  beforeAll(async () => {
    mediaQueries = {};
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        if (!mediaQueries[query]) {
          mediaQueries[query] = new MockMediaQueryList(query);
        }
        return mediaQueries[query];
      }),
    });
    LIVE_MEDIA.isDark; // Trigger watchMediaQuery
    await acceptInteractions(false);
  });

  beforeEach(() => {
    mediaQueries = {};
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        if (!mediaQueries[query]) {
          mediaQueries[query] = new MockMediaQueryList(query);
        }
        return mediaQueries[query];
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize correctly', async () => {
    expect(LIVE_MEDIA.isDark).toBe(false);
    // Since mock history is cleared by vitest, we just check the active listener logic in other tests
  });

  it('should update LIVE_MEDIA state on change events', async () => {
    // Access property to trigger watching
    expect(LIVE_MEDIA.isMobile).toBe(false);

    const query = '(max-width: 639px)';
    const mql = mediaQueries[query];
    expect(mql).toBeDefined();

    // Simulate change
    const mockEvent = new Event('change') as any;
    mockEvent.matches = true;
    mql.dispatchEvent(mockEvent);

    expect(LIVE_MEDIA.isMobile).toBe(true);
  });

  it('should support custom media queries via mediaQuery()', async () => {
    const isCustom = mediaQuery('(min-width: 2000px)');

    // We need to re-accept interactions here because mediaQuery is a dynamic addition!
    await acceptInteractions(false);

    const mql = mediaQueries['(min-width: 2000px)'];
    expect(mql).toBeDefined();

    const mockEvent = new Event('change') as any;
    mockEvent.matches = true;
    mql.dispatchEvent(mockEvent);

    expect(isCustom()).toBe(true);
  });

  describe('Coverage', () => {
    it('should remove event listeners on dispose', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_MEDIA } = await import('../../src/browser/media.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_MEDIA.isDark; // Trigger watcher
      await acceptInteractions(true); // Register listeners
      await acceptInteractions(false); // Trigger disposer

      const prevIsDark = LIVE_MEDIA.isDark;
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      (mql as any).matches = !prevIsDark;
      mql.dispatchEvent(new Event('change'));

      expect(LIVE_MEDIA.isDark).toBe(prevIsDark);
      consoleError.mockRestore();
    });

    it('should execute onCleanup when created in a disposable scope', async () => {
      const { createLifecycle } = await import('../../src/scope/lifecycle.js');
      const lifecycle = createLifecycle();
      const { mediaQuery } = await import('../../src/browser/media.js');

      lifecycle.run(() => {
        mediaQuery('(max-width: 500px)');
      });

      const mql = mediaQueries['(max-width: 500px)'];
      expect(mql.listeners.length).toBeGreaterThan(0);

      lifecycle.destroy();

      expect(mql.listeners.length).toBe(0);
    });
  });
});
