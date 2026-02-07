import { ROUTE_TYPE } from './enum.js';

export const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost',
  maxRetries: 0,
  retryDelay: 0,
  retryMode: 'linear' as const,
  keepAlive: false,
};

export function configure(config: Partial<typeof DEFAULT_CONFIG>) {
  Object.assign(DEFAULT_CONFIG, config);
}

export const DYNAMIC_ROUTE_KEY = Symbol(ROUTE_TYPE.DYNAMIC);
export const WILDCARD_ROUTE_KEY = Symbol(ROUTE_TYPE.WILDCARD);

export const ROUTE_MAP_LINK = new WeakMap();
