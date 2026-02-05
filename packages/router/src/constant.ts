import { ROUTE_TYPE } from './enum.js';

export const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost',
  trailingSlash: false,
  keepAlive: false,
};

export function configure(config: Partial<typeof DEFAULT_CONFIG>) {
  Object.assign(DEFAULT_CONFIG, config);
}

export const INDEX_ROUTE_KEY = Symbol(ROUTE_TYPE.INDEX);
export const DYNAMIC_ROUTE_KEY = Symbol(ROUTE_TYPE.DYNAMIC);
export const WILDCARD_ROUTE_KEY = Symbol(ROUTE_TYPE.WILDCARD);
export const FALLBACK_ROUTE_KEY = Symbol(ROUTE_TYPE.FALLBACK);

export const METHOD_MAP: {
  [key: string]: symbol;
} = {};
