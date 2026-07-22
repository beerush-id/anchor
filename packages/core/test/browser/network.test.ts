import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_NETWORK } from '../../src/browser/network.js';

describe('browser/network', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });
  let changeListeners: EventListener[] = [];

  let isOnline = true;
  beforeAll(async () => {
    changeListeners = [];
    isOnline = true;

    // Stub navigator.connection
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      get onLine() {
        return isOnline;
      },
      set onLine(val) {
        isOnline = val;
      },
      connection: {
        rtt: 50,
        type: 'wifi',
        downlink: 10,
        effectiveType: '4g',
        addEventListener: (event: string, listener: EventListener) => {
          if (event === 'change') {
            changeListeners.push(listener);
          }
        },
        removeEventListener: (event: string, listener: EventListener) => {
          if (event === 'change') {
            changeListeners = changeListeners.filter((l) => l !== listener);
          }
        },
      },
    });

    LIVE_NETWORK.isOnline; // Trigger watchNetwork
    await acceptInteractions(false);
  });

  beforeEach(() => {
    // Reset properties on the existing connection object
    // @ts-expect-error
    navigator.onLine = true;
    if ((navigator as any).connection) {
      (navigator as any).connection.rtt = 50;
      (navigator as any).connection.type = 'wifi';
      (navigator as any).connection.downlink = 10;
      (navigator as any).connection.effectiveType = '4g';
    }
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize network state correctly', async () => {
    expect(LIVE_NETWORK.isOnline).toBe(true);
    expect(LIVE_NETWORK.type).toBe('wifi');
    expect(LIVE_NETWORK.rtt).toBe(50);
    expect(LIVE_NETWORK.downlink).toBe(10);
    expect(LIVE_NETWORK.effectiveType).toBe('4g');
  });

  it('should update state when online/offline events are dispatched', async () => {
    // Mock offline without replacing navigator
    // @ts-expect-error
    navigator.onLine = false;
    window.dispatchEvent(new Event('offline'));

    expect(LIVE_NETWORK.isOnline).toBe(false);

    // Mock online
    // @ts-expect-error
    navigator.onLine = true;
    window.dispatchEvent(new Event('online'));

    expect(LIVE_NETWORK.isOnline).toBe(true);
  });

  it('should update state when connection changes', async () => {
    // Update connection properties directly on the mocked connection object
    // @ts-expect-error
    navigator.connection.rtt = 100;
    // @ts-expect-error
    navigator.connection.type = 'cellular';

    // Trigger change event
    changeListeners.forEach((listener) => listener(new Event('change')));

    expect(LIVE_NETWORK.rtt).toBe(100);
    expect(LIVE_NETWORK.type).toBe('cellular');
  });

  describe('Coverage', () => {
    it('should clean up event listeners on dispose', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_NETWORK: NEW_NETWORK } = await import('../../src/browser/network.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      NEW_NETWORK.rtt; // Trigger watchNetwork
      await acceptInteractions(true);
      await acceptInteractions(false); // Trigger disposer

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));

      // Verify state was not updated since listeners should be removed
      expect(NEW_NETWORK.isOnline).toBe(true);
      consoleError.mockRestore();
    });

    it('should fallback to mozConnection or webkitConnection', async () => {
      vi.resetModules();
      Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'mozConnection', {
        value: { type: 'wifi', addEventListener: vi.fn(), removeEventListener: vi.fn() },
        configurable: true,
      });

      const { LIVE_NETWORK: NEW_NETWORK } = await import('../../src/browser/network.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      NEW_NETWORK.type; // trigger
      await acceptInteractions(false);

      expect(NEW_NETWORK.type).toBe('wifi');

      vi.resetModules();
      Object.defineProperty(navigator, 'mozConnection', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'webkitConnection', {
        value: { type: 'cellular', addEventListener: vi.fn(), removeEventListener: vi.fn() },
        configurable: true,
      });

      const { LIVE_NETWORK: NEW_NETWORK_2 } = await import('../../src/browser/network.js');
      const { acceptInteractions: accept2 } = await import('../../src/browser/interactive.js');
      NEW_NETWORK_2.type;
      await accept2(false);

      expect(NEW_NETWORK_2.type).toBe('cellular');
    });

    it('should fallback properties to unknown or 0', async () => {
      vi.resetModules();
      Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'mozConnection', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'webkitConnection', {
        value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
        configurable: true,
      });

      const { LIVE_NETWORK: NEW_NETWORK } = await import('../../src/browser/network.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      NEW_NETWORK.type;
      await acceptInteractions(false);

      expect(NEW_NETWORK.rtt).toBe(0);
      expect(NEW_NETWORK.downlink).toBe(0);
      expect(NEW_NETWORK.type).toBe('unknown');
      expect(NEW_NETWORK.effectiveType).toBe('unknown');
    });
  });
});
