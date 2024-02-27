import { isBrowser, isObject, logger } from '../utils/index.js';

export type CookieOptions = {
  global?: boolean;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
  path?: string;
}

const OPTION_KEYS = [ 'global', 'secure', 'httpOnly', 'sameSite', 'maxAge', 'expires', 'path' ];

export type Cookies = {
  [key: string]: string | number;
}

export type Cookie<T extends Cookies> = {
  [K in keyof T]: T[K];
} & {
  subscribe: (fn: ((cookies: Cookies) => void), emit?: boolean) => () => void;
};

export type CookieInit<T extends Cookies> = T | CookieOptions;

export type CookieEncoder = <S extends boolean = true>(stringify?: S) => S extends true ? string : string[];
export type CookieGetter = () => string;
export type CookieSetter = () => void;

let CURRENT_COOKIE = '';
let CURRENT_HEADERS: Headers | void;

export function setCookieContext(source: string | Headers, target?: Headers) {
  CURRENT_COOKIE = (typeof source === 'object' && typeof source.get === 'function'
                    ? source.get('Cookie')
                    : source) as never ?? '';
  CURRENT_HEADERS = target;

  return () => {
    CURRENT_COOKIE = '';
    CURRENT_HEADERS = undefined;
  };
}

export function cookie<T extends Cookies>(
  init?: CookieInit<T>,
  headers?: Headers,
): [ Cookie<T>, CookieEncoder, CookieGetter, CookieSetter ] {
  const options: CookieOptions = {};
  const subscribers = new Set<(value: Cookies) => void>();
  const values = createValues(headers);

  let shouldUpdate = false;

  if (isObject(init)) {
    for (const [ key, value ] of Object.entries(init as object)) {
      if (OPTION_KEYS.includes(key)) {
        options[key as keyof CookieOptions] = value;
      } else {
        if (!(key in values)) {
          shouldUpdate = true;
          values[key] = value;
        }
      }
    }
  }

  const publish = () => {
    for (const emit of subscribers) {
      emit({ ...values });
    }

    assign();
  };

  const json = () => {
    return JSON.stringify(values);
  };

  const encode: CookieEncoder = ((stringify = true) => {
    return encodeCookie(values, options, stringify);
  }) as never;

  const assign = () => {
    if (!headers && typeof CURRENT_HEADERS === 'object') {
      headers = CURRENT_HEADERS;
    }

    if (headers) {
      headers.set('Set-Cookie', encode());
    } else if (isBrowser()) {
      for (const [ key, item ] of Object.entries(values)) {
        document.cookie = encodeCookie({ [key]: item }, options);
      }
    }

    logger.debug('[anchor:cookie] Cookie values assigned.');
  };

  const _cookie = new Proxy(
    {
      subscribe: (fn: ((cookies: Cookies) => void), emit?: boolean) => {
        if (emit ?? true) {
          fn({ ...values });
        }

        subscribers.add(fn);

        return () => {
          subscribers.delete(fn);
        };
      },
    },
    {
      get: (target, key) => {
        if (key === 'subscribe') return target[key as never] as never;
        return values[key as string];
      },
      set: (target, key, value) => {
        if (value !== values[key as string]) {
          values[key as string] = value as string;
          publish();
        }

        return true;
      },
      deleteProperty: (target, key) => {
        if (key in values) {
          delete values[key as string];
          publish();
        }

        return true;
      },
    },
  ) as Cookie<T>;

  if (shouldUpdate) {
    assign();
  }

  return [ _cookie, encode, json, assign ];
}

function createValues(headers?: Headers): Cookies {
  const _cookie = headers
                  ? headers.get('Cookie') || ''
                  : CURRENT_COOKIE || (isBrowser() ? document.cookie : '');

  if (_cookie) {
    return decodeCookie(_cookie);
  }

  return {};
}

function decodeCookie(value: string) {
  const values: Cookies = {};

  for (const item of value.split(/\s?;\s*/g)) {
    const [ key, value ] = item.split('=');
    values[key] = value;
  }

  return values;
}

function encodeCookie(values: Cookies, options: CookieOptions): string;
function encodeCookie(values: Cookies, options: CookieOptions, stringify: boolean): string[];
function encodeCookie(values: Cookies = {}, options: CookieOptions, stringify = true) {
  const cookieSet = new Set<string>();

  for (const [ key, item ] of Object.entries(values)) {
    const value = [ 'string', 'number' ].includes(typeof item) && item
                  ? `${ key }=${ item }`
                  : `${ key }`;

    cookieSet.add(value);
  }

  const { global, secure, httpOnly, sameSite, expires, maxAge, path } = options ?? {};

  if (global) cookieSet.add('Path=/');
  if (secure) cookieSet.add('Secure');
  if (httpOnly) cookieSet.add('HttpOnly');
  if (sameSite) cookieSet.add(`SameSite=${ sameSite }`);
  if (expires) cookieSet.add(`Expires=${ expires.toUTCString() }`);
  if (maxAge) cookieSet.add(`Max-Age=${ maxAge }`);
  if (path) cookieSet.add(`Path=${ path }`);

  const items = Array.from(cookieSet);

  return (stringify ?? true) ? items.join('; ') : items;
}
