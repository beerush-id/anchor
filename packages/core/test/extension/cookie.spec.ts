import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COOKIE_PREFIX,
  CookieJar,
  cookies,
  decodeCookies,
  encodeCookies,
  getCookieJar,
  setCookieContext,
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
});
