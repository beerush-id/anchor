import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_GEO } from '../../src/browser/geo.js';
import { acceptInteractions } from '../../src/browser/index.js';

describe('browser/geo', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  let watchPositionMock: ReturnType<typeof vi.fn>;
  let clearWatchMock: ReturnType<typeof vi.fn>;

  let successCb: any;
  let errorCb: any;

  beforeAll(async () => {
    watchPositionMock = vi.fn().mockImplementation((success, error) => {
      successCb = success;
      errorCb = error;
      return 123;
    });
    clearWatchMock = vi.fn();

    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      geolocation: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

    LIVE_GEO.lat; // trigger watchGeo
    await acceptInteractions(false);
  });

  beforeEach(() => {
    watchPositionMock = vi.fn().mockReturnValue(123);
    clearWatchMock = vi.fn();

    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      geolocation: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Simulate cleanup by calling the disposer if needed, though testing it directly is hard since the Disposer is internal to onInteractive. We can reset the state manually or rely on test isolation if LIVE_GEO doesn't persist badly. Actually LIVE_GEO is a singleton but we can just test the state updates.
  });

  it('should initialize correctly and start watching', async () => {
    expect(LIVE_GEO.isTracking).toBe(false);
    expect(successCb).toBeDefined(); // Handler should be captured
  });

  it('should update state on successful geolocation', async () => {
    successCb({
      coords: {
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 10,
        speed: 5,
      },
    });

    expect(LIVE_GEO.lat).toBe(-6.2);
    expect(LIVE_GEO.lng).toBe(106.8);
    expect(LIVE_GEO.accuracy).toBe(10);
    expect(LIVE_GEO.speed).toBe(5);
    expect(LIVE_GEO.isTracking).toBe(true);
    expect(LIVE_GEO.error).toBe('');
  });

  it('should fallback speed to 0 if null', async () => {
    successCb({
      coords: { latitude: 10, longitude: 20, accuracy: 5, speed: null },
    });
    expect(LIVE_GEO.speed).toBe(0);
  });

  it('should update error state on geolocation failure', async () => {
    errorCb({ message: 'User denied Geolocation' });

    expect(LIVE_GEO.error).toBe('User denied Geolocation');
    expect(LIVE_GEO.isTracking).toBe(false);
  });
  describe('Coverage', () => {
    it('should handle unsupported geolocation', async () => {
      // Clear previous disposers first
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      await acceptInteractions(false);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const originalGeo = navigator.geolocation;
      (navigator as any).geolocation = undefined;

      vi.resetModules();
      const { LIVE_GEO } = await import('../../src/browser/geo.js');
      const { acceptInteractions: acceptNew } = await import('../../src/browser/interactive.js');

      LIVE_GEO.lat; // trigger watchGeo
      await acceptNew(false);

      expect(LIVE_GEO.error).toBe('Geolocation is not supported by this browser.');

      (navigator as any).geolocation = originalGeo;
      consoleError.mockRestore();
    });

    it('should clear watch on dispose', async () => {
      // Re-trigger watchGeo because the previous test may have disabled it
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_GEO } = await import('../../src/browser/geo.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_GEO.lat; // trigger watchGeo
      await acceptInteractions(true); // Let it register

      await acceptInteractions(false); // Trigger disposer

      expect(navigator.geolocation.clearWatch).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
