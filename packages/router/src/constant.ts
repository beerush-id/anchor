import { PRELOAD_MODE, RENDER_MODE, RETRY_MODE, ROUTE_TYPE } from './enum.js';
import type { RouterOptions } from './types.js';

/**
 * Default configuration options for the router.
 *
 * These values are used as fallbacks when specific options are not provided.
 * Can be modified using the {@link configure} function.
 */
export const DEFAULT_CONFIG: RouterOptions = {
  baseUrl: 'http://localhost',

  maxAge: 0,
  keepAlive: false,

  retryMode: RETRY_MODE.LINEAR,
  retryDelay: 0,
  maxRetries: 0,
  renderMode: RENDER_MODE.IMMEDIATE,
  preloadMode: PRELOAD_MODE.MANUAL,
};

/**
 * Configures the default router options.
 *
 * Merges the provided configuration with the existing DEFAULT_CONFIG.
 * This affects all routers created after this call.
 *
 * @param config - Partial configuration options to merge with defaults
 */
export function configure(config: Partial<RouterOptions>) {
  Object.assign(DEFAULT_CONFIG, config);
}

/**
 * Symbol used as a key for dynamic routes in the route registry.
 *
 * Dynamic routes are routes with parameters like `:id` that match any value.
 *
 * @internal
 */
export const DYNAMIC_ROUTE_KEY = Symbol(ROUTE_TYPE.DYNAMIC);

/**
 * Symbol used as a key for wildcard routes in the route registry.
 *
 * Wildcard routes match any remaining path segments using `*`.
 *
 * @internal
 */
export const WILDCARD_ROUTE_KEY = Symbol(ROUTE_TYPE.WILDCARD);

/**
 * WeakMap linking routes to their registries.
 *
 * Maintains a bidirectional relationship between Route instances
 * and their RouteRegistry instances without preventing garbage collection.
 *
 * @internal
 */
export const ROUTE_MAP_LINK = new WeakMap();
