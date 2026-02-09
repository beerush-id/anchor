import { ROUTE_TYPE } from './enum.js';
import type { RouterOptions } from './types.js';

export const DEFAULT_CONFIG: RouterOptions = {
  baseUrl: 'http://localhost',

  maxAge: 0,
  keepAlive: false,

  retryMode: 'linear' as const,
  retryDelay: 0,
  maxRetries: 0,
};

export function configure(config: Partial<RouterOptions>) {
  Object.assign(DEFAULT_CONFIG, config);
}

export const DYNAMIC_ROUTE_KEY = Symbol(ROUTE_TYPE.DYNAMIC);
export const WILDCARD_ROUTE_KEY = Symbol(ROUTE_TYPE.WILDCARD);

export const ROUTE_MAP_LINK = new WeakMap();
