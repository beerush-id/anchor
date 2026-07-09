import { anchor } from '../engine/index.js';
import { $symbol, isBrowser } from '../module.js';
import { mutable, subscribe } from '../reactive/index.js';
import { getScope, globalRun, onGlobalCleanup, setScope } from '../scope/index.js';
import { captureStack } from '../shared/index.js';
import type { ObjLike } from '../types.js';
import { microtask } from '../utils/index.js';

export const COOKIE_PREFIX = 'anchor-cookie://';

/** Scope key for the cookie jar. */
export const COOKIE_JAR_KEY = $symbol('cookie-jar');
export const COOKIE_JAR_WRITABLE = $symbol('cookie-jar-writable');

export type CookieOptions = {
  /** The URL path the cookie is restricted to. Defaults to '/'. */
  path?: string;
  /** Max age in seconds. */
  maxAge?: number;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
};

/** A single cookie with its name, decoded value, and transport options. */
export type CookieEntry<T extends ObjLike = ObjLike> = {
  name: string;
  value: T;
  /** The original default values, used to reset state when the cookie is deleted. */
  init?: T;
  options?: CookieOptions;
};

/** A collection of cookie entries keyed by their full prefixed name. */
export class CookieJar extends Map<string, CookieEntry> {
  /** Entries that have been mutated since the jar was created. */
  public changes = new Set<CookieEntry>();

  /**
   * Encodes cookie entries into an array of `Set-Cookie` header strings.
   *
   * @param onlyChanged - If `true` (default), encode only mutated entries.
   * @returns An array of `Set-Cookie` header strings.
   */
  encode(onlyChanged = true): string[] {
    return encodeCookies(this, onlyChanged);
  }
}

/**
 * Decodes a raw `Cookie` request header string into a {@link CookieJar}.
 *
 * Each anchor-prefixed cookie value is fully decoded (URI-decoded and
 * JSON-parsed) into a {@link CookieEntry}. Non-anchor cookies are ignored.
 * Malformed values produce entries with an empty object value.
 *
 * @param cookieString - The raw `Cookie` header value.
 * @returns A new {@link CookieJar}.
 *
 * @example
 * ```ts
 * const jar = decodeCookies(req.headers.get('cookie') ?? '');
 * setCookieContext(jar);
 * ```
 */
export function decodeCookies(cookieString: string): CookieJar {
  const jar = new CookieJar();

  for (const pair of (cookieString ?? '').split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 1) continue;

    const name = pair.slice(0, eq).trim();
    if (name.startsWith(COOKIE_PREFIX)) {
      try {
        jar.set(name, { name, value: JSON.parse(decodeURIComponent(pair.slice(eq + 1).trim())) });
      } catch (error) {
        captureStack.error.external(`Unable to decode cookie value:`, error as Error, decodeCookies);
        jar.set(name, { name, value: {} });
      }
    }
  }

  return jar;
}

/**
 * Encodes cookie entries into an array of `Set-Cookie` header strings.
 *
 * By default, only entries that have been mutated (tracked in
 * {@link CookieJar.changes}) are encoded, so the server only writes back
 * what actually changed during the request.
 *
 * @param jar         - The cookie jar to encode.
 * @param onlyChanged - If `true` (default), encode only mutated entries.
 * @returns An array of `Set-Cookie` header strings (one per entry).
 *
 * @example
 * ```ts
 * const jar = getCookieJar();
 * for (const header of encodeCookies(jar)) {
 *   res.headers.append('Set-Cookie', header);
 * }
 * ```
 */
export function encodeCookies(jar: CookieJar, onlyChanged = true): string[] {
  const headers: string[] = [];
  const entries = onlyChanged ? jar.changes : jar.values();

  for (const entry of entries) {
    const raw = anchor.get(entry.value, true);
    const opts = entry.options;

    let cookie = `${entry.name}=${encodeURIComponent(JSON.stringify(raw))}; path=${opts?.path ?? '/'}`;
    if (opts?.maxAge !== undefined) cookie += `; max-age=${opts.maxAge}`;
    if (opts?.secure) cookie += '; secure';
    if (opts?.sameSite) cookie += `; samesite=${opts.sameSite}`;
    if (opts?.httpOnly) cookie += '; httponly';
    headers.push(cookie);
  }

  return headers;
}

/**
 * Returns the {@link CookieJar} from the current async scope.
 *
 * @returns The current cookie jar, or `undefined` if none exists in scope.
 */
export function getCookieJar(): CookieJar | undefined {
  return getScope<CookieJar>(COOKIE_JAR_KEY);
}

/**
 * Injects a {@link CookieJar} into the current async execution scope.
 *
 * - SSR: call with the jar from {@link decodeCookies} inside `withIsolation()`.
 * - Client: called automatically at module load with `document.cookie`.
 *
 * @param jar - A {@link CookieJar} from {@link decodeCookies}.
 *
 * @example
 * ```ts
 * await withIsolation(async () => {
 *   const jar = decodeCookies(req.headers.get('cookie') ?? '');
 *   setCookieContext(jar);
 *   // ... render ...
 *   for (const header of encodeCookies(jar)) {
 *     res.headers.append('Set-Cookie', header);
 *   }
 * });
 * ```
 */
export function setCookieContext(jar: CookieJar) {
  setScope(COOKIE_JAR_KEY, jar);
}

/**
 * Re-reads `document.cookie` and synchronizes any server-set cookie values
 * into the corresponding reactive state objects in the current {@link CookieJar}.
 *
 * This is useful after a server response that includes `Set-Cookie` headers,
 * so the client-side reactive state reflects the server's changes immediately.
 *
 * Can be triggered manually or via a DOM event:
 * ```ts
 * // Direct call (requires Anchor dependency):
 * syncCookies();
 *
 * // DOM event (zero dependency — any library can dispatch):
 * window.dispatchEvent(new Event('anchor:cookie-sync'));
 * ```
 */
let syncing = false;

export function syncCookies() {
  if (!isBrowser()) return;

  const jar = getScope<CookieJar>(COOKIE_JAR_KEY);
  if (!jar) return;

  syncing = true;

  try {
    const current = decodeCookies(document.cookie);

    // Sync updated values
    for (const [name, incoming] of current) {
      const entry = jar.get(name);

      if (entry && anchor.has(entry.value)) {
        anchor.assign(entry.value, incoming.value);
      }
    }

    // Handle deletions — cookie removed by server (max-age=0)
    for (const [name, entry] of jar) {
      if (!current.has(name) && entry.init) {
        if (anchor.has(entry.value)) {
          anchor.assign(entry.value, entry.init, true);
        }
        jar.delete(name);
      }
    }
  } finally {
    syncing = false;
  }
}

if (isBrowser()) {
  setScope(COOKIE_JAR_WRITABLE, true);
  setCookieContext(decodeCookies(document.cookie));
  window.addEventListener('anchor:cookie-sync', syncCookies);
}

function writeDocumentCookie(entry: CookieEntry) {
  const data = anchor.get(entry.value, true);
  const opts = entry.options ?? {};

  let cookie = `${entry.name}=${encodeURIComponent(JSON.stringify(data))}; path=${opts.path ?? '/'}`;
  if (opts.maxAge !== undefined) cookie += `; max-age=${opts.maxAge}`;
  if (opts.secure) cookie += '; secure';
  if (opts.sameSite) cookie += `; samesite=${opts.sameSite}`;

  // biome-ignore lint/suspicious/noDocumentCookie: Expect behavior.
  document.cookie = cookie;
}

/**
 * Creates a reactive state object backed by a browser cookie.
 *
 * On the server, the reactive state lives inside the {@link CookieJar}
 * so that {@link encodeCookies} reflects any mutations made during SSR.
 *
 * @param name    - Unique cookie identifier (without prefix).
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
  const cookieName = `${COOKIE_PREFIX}${name.replace(/\s+/g, '-')}`;
  const jar = getScope<CookieJar>(COOKIE_JAR_KEY);
  let entry = jar?.get(cookieName);

  // Already resolved to reactive state by a previous cookies() call.
  if (entry && anchor.has(entry.value)) return entry.value as T;

  // Create reactive state, merging decoded values (if any) with init defaults.
  const state = globalRun(() => mutable({ ...init, ...(entry?.value as Partial<T>) }));

  if (!entry) {
    entry = { name: cookieName, value: state, init: { ...init } as T, options };
    jar?.set(cookieName, entry);
  } else {
    entry.value = state;
    entry.init = { ...init } as T;
    entry.options = options;
  }

  const controller = subscribe.resolve(state);

  if (typeof controller?.subscribe === 'function') {
    if (isBrowser()) {
      const [schedule] = microtask(0);
      const unsubscribe = controller.subscribe((_s, e) => {
        if (e.type === 'init' || syncing) return;
        jar?.changes.add(entry);
        schedule(() => writeDocumentCookie(entry));
      });
      onGlobalCleanup(unsubscribe);
    } else if (jar) {
      const unsubscribe = controller.subscribe((_s, e) => {
        if (e.type === 'init' || syncing) return;

        if (!isJarWritable()) {
          const error = new Error('CookieJar is not writable.');
          captureStack.violation.general(
            'CookieJar violation detected.',
            'Attempted to mutate cookies on a non-writable (streaming) context.',
            error,
            [
              'CookieJar write-propagation is exclusive to these conditions:',
              '- Write is performed in Browser environment.',
              '- Write is performed in server environment that supports write-back handling.',
            ]
          );
        }

        jar.changes.add(entry);
      });
      onGlobalCleanup(unsubscribe);
    }
  }

  return state;
}

function isJarWritable() {
  return getScope<boolean>(COOKIE_JAR_WRITABLE) === true;
}
