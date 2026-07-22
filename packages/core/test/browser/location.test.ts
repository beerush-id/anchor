import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_LOCATION } from '../../src/browser/location.js';

describe('browser/location', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    window.history.pushState(null, '', '/test?foo=bar#baz');
    LIVE_LOCATION.path; // trigger watchLocation
    await acceptInteractions(false);
  });

  afterEach(() => {
    // Reset location
    window.history.pushState(null, '', '/');
  });

  it('should initialize correctly with current location', async () => {
    expect(LIVE_LOCATION.path).toBe('/test');
    expect(LIVE_LOCATION.search).toBe('?foo=bar');
    expect(LIVE_LOCATION.hash).toBe('#baz');
  });

  it('should update on popstate event', async () => {
    window.history.pushState(null, '', '/new-path');
    window.dispatchEvent(new Event('popstate'));

    expect(LIVE_LOCATION.path).toBe('/new-path');
  });

  it('should update on hashchange event', async () => {
    window.location.hash = '#new-hash';
    window.dispatchEvent(new Event('hashchange'));

    expect(LIVE_LOCATION.hash).toBe('#new-hash');
  });

  describe('Coverage', () => {
    it('should remove event listeners on dispose', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_LOCATION } = await import('../../src/browser/location.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_LOCATION.path; // Trigger watcher
      await acceptInteractions(true); // Register listeners
      await acceptInteractions(false); // Trigger disposer

      const prevPath = LIVE_LOCATION.path;
      window.history.pushState({}, '', '/late-path');
      window.dispatchEvent(new Event('popstate'));

      expect(LIVE_LOCATION.path).toBe(prevPath);
      consoleError.mockRestore();
    });
  });
});
