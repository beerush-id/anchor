import {
  anchor,
  captureStack,
  getScope,
  isBrowser,
  microtask,
  mutable,
  type ObjLike,
  setScope,
  subscribe,
} from '@anchorlib/core';

export const COOKIE_PREFIX = 'anchor-cookie://';

export type CookieOptions = {
  /** The URL path the cookie is restricted to. Defaults to '/'. */
  path?: string;
  /** Max age in seconds. */
  maxAge?: number;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

function parseCookieValue<T extends ObjLike>(value: string, init: T): T {
  if (!value) return mutable<T>({ ...init });

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<T>;
    return mutable<T>({ ...init, ...parsed });
  } catch (error) {
    captureStack.error.external(`Unable to parse cookie value:`, error as Error, parseCookieValue);
    return mutable<T>({ ...init });
  }
}

/**
 * Parses a cookie string and injects each anchor cookie raw value into the
 * current async execution scope.
 *
 * - SSR: call with req.headers.cookie before rendering, inside withIsolation().
 * - Client: called automatically at module load with document.cookie.
 *
 * @example
 * ```ts
 * // SSR
 * await withIsolation(async () => {
 *   setCookieContext(req.headers.cookie ?? '');
 *   // ... activate router, renderToString
 * });
 * ```
 */
export function setCookieContext(cookieString: string) {
  for (const pair of (cookieString ?? '').split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    if (name.startsWith(COOKIE_PREFIX)) {
      setScope(name, pair.slice(eq + 1).trim());
    }
  }
}

if (isBrowser()) {
  setCookieContext(document.cookie);
}

function writeDocumentCookie(name: string, state: ObjLike, options: CookieOptions) {
  const data = anchor.get(state, true);

  let cookie = `${name}=${encodeURIComponent(JSON.stringify(data))}; path=${options.path ?? '/'}`;
  if (options.maxAge !== undefined) cookie += `; max-age=${options.maxAge}`;
  if (options.secure) cookie += '; secure';
  if (options.sameSite) cookie += `; samesite=${options.sameSite}`;

  document.cookie = cookie;
}

/**
 * Creates a reactive state object backed by a browser cookie.
 *
 * @param name    - Unique cookie identifier.
 * @param init    - Initial values, overridden by any stored cookie data.
 * @param options - Cookie attributes: path, maxAge, secure, sameSite.
 *
 * @example
 * ```ts
 * const settings = cookies('app-settings', { theme: 'light' as AppTheme });
 * settings.theme = 'dark'; // writes to document.cookie automatically
 * ```
 */
export function cookies<T extends ObjLike>(name: string, init: T, options?: CookieOptions): T {
  const cookieName = `${COOKIE_PREFIX}${name}`;
  const stored = getScope<string | T>(cookieName);

  if (stored && typeof stored === 'object') return stored;

  const state = parseCookieValue<T>(typeof stored === 'string' ? stored : '', init);
  setScope(cookieName, state);

  if (isBrowser()) {
    const [schedule] = microtask(0);
    const controller = subscribe.resolve(state);

    if (typeof controller?.subscribe === 'function') {
      controller.subscribe(() => schedule(() => writeDocumentCookie(cookieName, state, options ?? {})));
    }
  }

  return state;
}
