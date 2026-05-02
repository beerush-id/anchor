import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScope, withIsolation } from '@anchorlib/core';
import { cookies, COOKIE_PREFIX, setCookieContext } from '../src/cookie.js';

describe('Cookie Storage', () => {
  beforeEach(() => {
    // Reset document.cookie before each test
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
      configurable: true,
    });
  });

  describe('setCookieContext', () => {
    it('should parse cookie string and inject into scope', async () => {
      await withIsolation(async () => {
        const cookieStr = `${COOKIE_PREFIX}test1=%7B%22a%22%3A1%7D; other=value; ${COOKIE_PREFIX}test2=%7B%22b%22%3A2%7D`;
        setCookieContext(cookieStr);

        expect(getScope(`${COOKIE_PREFIX}test1`)).toBe('%7B%22a%22%3A1%7D');
        expect(getScope(`${COOKIE_PREFIX}test2`)).toBe('%7B%22b%22%3A2%7D');
        expect(getScope('other')).toBeUndefined();
      });
    });

    it('should handle empty or undefined cookie strings', async () => {
      await withIsolation(async () => {
        setCookieContext('');
        expect(getScope(`${COOKIE_PREFIX}test`)).toBeUndefined();
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCookieContext(undefined as any);
        expect(getScope(`${COOKIE_PREFIX}test`)).toBeUndefined();
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
        const cookieStr = `${COOKIE_PREFIX}settings=%7B%22theme%22%3A%22dark%22%7D`;
        setCookieContext(cookieStr);

        const state = cookies('settings', { theme: 'light' });
        expect(state.theme).toBe('dark');
      });
    });

    it('should fallback to default init if no cookie is present', async () => {
      await withIsolation(async () => {
        const state = cookies('settings', { theme: 'light' });
        expect(state.theme).toBe('light');
      });
    });

    it('should return the same reactive object for multiple calls with the same name', async () => {
      await withIsolation(async () => {
        const state1 = cookies('settings', { theme: 'light' });
        const state2 = cookies('settings', { theme: 'light' });

        expect(state1).toBe(state2);
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
        const state = cookies('settings', { theme: 'light' });
        
        state.theme = 'dark';
        
        vi.advanceTimersByTime(0);
        await Promise.resolve();

        expect(document.cookie).toContain(`${COOKIE_PREFIX}settings=`);
        expect(document.cookie).toContain(encodeURIComponent(JSON.stringify({ theme: 'dark' })));
      });
    });

    it('should respect cookie options', async () => {
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
        const state = cookies('settings', { theme: 'light' }, {
          path: '/app',
          maxAge: 3600,
          secure: true,
          sameSite: 'Strict'
        });
        
        state.theme = 'dark';
        
        vi.advanceTimersByTime(0);
        await Promise.resolve();

        expect(document.cookie).toContain('path=/app');
        expect(document.cookie).toContain('max-age=3600');
        expect(document.cookie).toContain('secure');
        expect(document.cookie).toContain('samesite=Strict');
      });
    });

    it('should handle malformed cookie values gracefully', async () => {
      // Mock error logger to avoid console clutter
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await withIsolation(async () => {
        const cookieStr = `${COOKIE_PREFIX}settings=invalid_json`;
        setCookieContext(cookieStr);

        const state = cookies('settings', { theme: 'light' });
        expect(state.theme).toBe('light'); // Falls back to initial state
      });

      errorSpy.mockRestore();
    });
  });
});
