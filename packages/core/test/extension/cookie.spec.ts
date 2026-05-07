import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  COOKIE_PREFIX,
  CookieJar,
  cookies,
  decodeCookies,
  encodeCookies,
  getCookieJar,
  setCookieContext,
  syncCookies,
  withIsolation,
} from '../../src/index.js';

describe('Cookie Storage', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
      configurable: true,
    });
  });

  describe('decodeCookies', () => {
    it('should fully decode anchor-prefixed cookies into entries', () => {
      const cookieStr = `${COOKIE_PREFIX}test-1=${encodeURIComponent(JSON.stringify({ a: 1 }))}; other=value; ${COOKIE_PREFIX}test-2=${encodeURIComponent(JSON.stringify({ b: 2 }))}`;
      const jar = decodeCookies(cookieStr);

      expect(jar.size).toBe(2);
      expect(jar.get(`${COOKIE_PREFIX}test-1`)?.value).toEqual({ a: 1 });
      expect(jar.get(`${COOKIE_PREFIX}test-2`)?.value).toEqual({ b: 2 });
      expect(jar.has('other')).toBe(false);
    });

    it('should return an empty jar for empty or undefined input', () => {
      expect(decodeCookies('').size).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(decodeCookies(undefined as any).size).toBe(0);
    });

    it('should store empty object value for malformed cookie values', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const jar = decodeCookies(`${COOKIE_PREFIX}broken-cookie=invalid_json`);
      expect(jar.get(`${COOKIE_PREFIX}broken-cookie`)?.value).toEqual({});

      errorSpy.mockRestore();
    });

    it('should return a CookieJar instance with empty changes', () => {
      const jar = decodeCookies('');
      expect(jar).toBeInstanceOf(CookieJar);
      expect(jar.changes.size).toBe(0);
    });
  });

  describe('encodeCookies', () => {
    it('should encode only changed entries by default', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(`${COOKIE_PREFIX}keep-this=${encodeURIComponent(JSON.stringify({ a: 1 }))}`);
        setCookieContext(jar);

        const state = cookies('keep-this', { a: 1 }, { path: '/' });
        state.a = 2;

        const headers = encodeCookies(jar);
        expect(headers).toHaveLength(1);
        expect(headers[0]).toContain(`${COOKIE_PREFIX}keep-this=`);
        expect(headers[0]).toContain('path=/');
      });
    });

    it('should encode all entries when onlyChanged is false', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(
          `${COOKIE_PREFIX}one-entry=${encodeURIComponent(JSON.stringify({ a: 1 }))}; ${COOKIE_PREFIX}two-entry=${encodeURIComponent(JSON.stringify({ b: 2 }))}`
        );
        setCookieContext(jar);

        // Resolve only one cookie — neither mutated
        cookies('one-entry', { a: 1 });

        const headers = encodeCookies(jar, false);
        expect(headers).toHaveLength(2);
      });
    });

    it('should unwrap reactive state values', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('my-prefs', { lang: 'en' }, { path: '/', secure: true });
        state.lang = 'fr';

        const headers = encodeCookies(jar);
        expect(headers).toHaveLength(1);
        expect(headers[0]).toContain(encodeURIComponent(JSON.stringify({ lang: 'fr' })));
        expect(headers[0]).toContain('secure');
      });
    });

    it('should include all cookie options in the header', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies(
          'opt-test',
          { v: 1 },
          {
            path: '/app',
            maxAge: 3600,
            secure: true,
            sameSite: 'Strict',
            httpOnly: true,
          }
        );
        state.v = 2;

        const headers = encodeCookies(jar);
        expect(headers[0]).toContain('path=/app');
        expect(headers[0]).toContain('max-age=3600');
        expect(headers[0]).toContain('secure');
        expect(headers[0]).toContain('samesite=Strict');
        expect(headers[0]).toContain('httponly');
      });
    });
  });

  describe('CookieJar.encode()', () => {
    it('should encode changed entries via jar.encode()', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('jar-encode', { lang: 'en' }, { path: '/' });
        state.lang = 'fr';

        const headers = jar.encode();
        expect(headers).toHaveLength(1);
        expect(headers[0]).toContain(`${COOKIE_PREFIX}jar-encode=`);
        expect(headers[0]).toContain(encodeURIComponent(JSON.stringify({ lang: 'fr' })));
      });
    });

    it('should encode all entries via jar.encode(false)', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(
          `${COOKIE_PREFIX}enc-a=${encodeURIComponent(JSON.stringify({ a: 1 }))}; ${COOKIE_PREFIX}enc-b=${encodeURIComponent(JSON.stringify({ b: 2 }))}`
        );
        setCookieContext(jar);

        cookies('enc-a', { a: 1 });

        const headers = jar.encode(false);
        expect(headers).toHaveLength(2);
      });
    });
  });

  describe('setCookieContext / getCookieJar', () => {
    it('should inject and retrieve the jar from scope', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(`${COOKIE_PREFIX}ctx-test=${encodeURIComponent(JSON.stringify({ x: 1 }))}`);
        setCookieContext(jar);

        const stored = getCookieJar();
        expect(stored).toBe(jar);
      });
    });
  });

  describe('cookies', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should initialize state from cookie context', async () => {
      await withIsolation(async () => {
        setCookieContext(
          decodeCookies(`${COOKIE_PREFIX}app-settings=${encodeURIComponent(JSON.stringify({ theme: 'dark' }))}`)
        );

        const state = cookies('app-settings', { theme: 'light' });
        expect(state.theme).toBe('dark');
      });
    });

    it('should fallback to default init if no cookie is present', async () => {
      await withIsolation(async () => {
        setCookieContext(decodeCookies(''));
        const state = cookies('app-settings', { theme: 'light' });
        expect(state.theme).toBe('light');
      });
    });

    it('should return the same reactive object for multiple calls with the same name', async () => {
      await withIsolation(async () => {
        setCookieContext(decodeCookies(''));
        const state1 = cookies('app-settings', { theme: 'light' });
        const state2 = cookies('app-settings', { theme: 'light' });

        expect(state1).toBe(state2);
      });
    });

    it('should convert spaces in name to hyphens', async () => {
      await withIsolation(async () => {
        setCookieContext(decodeCookies(''));
        cookies('my settings', { v: 1 });

        const jar = getCookieJar()!;
        expect(jar.has(`${COOKIE_PREFIX}my-settings`)).toBe(true);
      });
    });

    it('should update the jar entry in place', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(`${COOKIE_PREFIX}in-place=${encodeURIComponent(JSON.stringify({ a: 1 }))}`);
        setCookieContext(jar);

        const entryBefore = jar.get(`${COOKIE_PREFIX}in-place`)!;
        const state = cookies('in-place', { a: 0 }, { path: '/test' });

        const entryAfter = jar.get(`${COOKIE_PREFIX}in-place`)!;
        expect(entryAfter).toBe(entryBefore); // same reference
        expect(entryAfter.value).toBe(state); // value updated to reactive state
        expect(entryAfter.options?.path).toBe('/test'); // options set
      });
    });

    it('should sync changes to document.cookie', async () => {
      let cookieStore = '';
      Object.defineProperty(document, 'cookie', {
        get() {
          return cookieStore;
        },
        set(val) {
          cookieStore = val;
        },
        configurable: true,
      });

      await withIsolation(async () => {
        setCookieContext(decodeCookies(''));
        const state = cookies('doc-test', { theme: 'light' });

        state.theme = 'dark';

        vi.advanceTimersByTime(0);
        await Promise.resolve();

        expect(document.cookie).toContain(`${COOKIE_PREFIX}doc-test=`);
        expect(document.cookie).toContain(encodeURIComponent(JSON.stringify({ theme: 'dark' })));
      });
    });

    it('should track changes in jar.changes', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('track-test', { v: 1 });
        expect(jar.changes.size).toBe(0);

        state.v = 2;
        expect(jar.changes.size).toBe(1);
      });
    });

    it('should handle malformed cookie values gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await withIsolation(async () => {
        setCookieContext(decodeCookies(`${COOKIE_PREFIX}bad-data=invalid_json`));

        const state = cookies('bad-data', { theme: 'light' });
        expect(state.theme).toBe('light');
      });

      errorSpy.mockRestore();
    });

    it('should track changes on server (non-browser) environment', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('server-test', { v: 1 });
        expect(jar.changes.size).toBe(0);

        state.v = 2;
        expect(jar.changes.size).toBe(1);
      });

      vi.unstubAllGlobals();
    });
  });

  describe('syncCookies', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should sync updated cookie values into reactive state', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('sync-test', { theme: 'light' });
        expect(state.theme).toBe('light');

        // Simulate server setting a new cookie value
        Object.defineProperty(document, 'cookie', {
          get: () => `${COOKIE_PREFIX}sync-test=${encodeURIComponent(JSON.stringify({ theme: 'dark' }))}`,
          configurable: true,
        });

        syncCookies();

        expect(state.theme).toBe('dark');
      });
    });

    it('should reset state to init when cookie is deleted', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(
          `${COOKIE_PREFIX}del-test=${encodeURIComponent(JSON.stringify({ count: 5, extra: 'yes' }))}`
        );
        setCookieContext(jar);

        const state = cookies('del-test', { count: 0 });
        expect(state.count).toBe(5);
        expect(jar.has(`${COOKIE_PREFIX}del-test`)).toBe(true);

        // Simulate cookie deletion (server set max-age=0)
        Object.defineProperty(document, 'cookie', {
          get: () => '',
          configurable: true,
        });

        syncCookies();

        // State reset to init defaults
        expect(state.count).toBe(0);
        // Entry removed from jar
        expect(jar.has(`${COOKIE_PREFIX}del-test`)).toBe(false);
      });
    });

    it('should skip entries without init on deletion', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        // Manually add a jar entry without init (simulates decoded-only entry)
        jar.set(`${COOKIE_PREFIX}no-init`, { name: `${COOKIE_PREFIX}no-init`, value: { x: 1 } });

        Object.defineProperty(document, 'cookie', {
          get: () => '',
          configurable: true,
        });

        syncCookies();

        // Entry without init is not deleted
        expect(jar.has(`${COOKIE_PREFIX}no-init`)).toBe(true);
      });
    });

    it('should return early when no jar exists', async () => {
      await withIsolation(async () => {
        expect(() => syncCookies()).not.toThrow();
      });
    });

    it('should return early in non-browser environment', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        setCookieContext(decodeCookies(''));
        expect(() => syncCookies()).not.toThrow();
      });

      vi.unstubAllGlobals();
    });

    it('should be triggered via DOM event dispatch', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies('');
        setCookieContext(jar);

        const state = cookies('event-test', { v: 1 });

        Object.defineProperty(document, 'cookie', {
          get: () => `${COOKIE_PREFIX}event-test=${encodeURIComponent(JSON.stringify({ v: 99 }))}`,
          configurable: true,
        });

        window.dispatchEvent(new Event('anchor:cookie-sync'));

        expect(state.v).toBe(99);
      });
    });

    it('should not touch unresolved jar entries during sync', async () => {
      await withIsolation(async () => {
        const jar = decodeCookies(
          `${COOKIE_PREFIX}unresolved=${encodeURIComponent(JSON.stringify({ a: 1 }))}`
        );
        setCookieContext(jar);

        // Don't call cookies() — entry exists but value is not reactive
        Object.defineProperty(document, 'cookie', {
          get: () => `${COOKIE_PREFIX}unresolved=${encodeURIComponent(JSON.stringify({ a: 2 }))}`,
          configurable: true,
        });

        syncCookies();

        // Entry still in jar, value not reactive so not synced
        const entry = jar.get(`${COOKIE_PREFIX}unresolved`);
        expect(entry).toBeDefined();
        expect(anchor.has(entry!.value)).toBe(false);
      });
    });
  });
});
