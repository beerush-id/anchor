/**
 * Route type enumeration.
 *
 * Defines the different types of routes that can be created in the router.
 *
 * @example
 * ```ts
 * import { ROUTE_TYPE } from '@anchorlib/router';
 *
 * if (route.type === ROUTE_TYPE.DYNAMIC) {
 *   console.log('This is a dynamic route with parameters');
 * }
 * ```
 */
export const ROUTE_TYPE = {
  /** Index route - matches the root path `/` */
  INDEX: 'index',
  /** Static route - matches a fixed path segment */
  STATIC: 'static',
  /** Dynamic route - matches a parameterized path like `:id` */
  DYNAMIC: 'dynamic',
  /** Wildcard route - matches any remaining path segments using `*` */
  WILDCARD: 'wildcard',
} as const;

export const PRELOAD_MODE = {
  HOVER: 'hover',
  MANUAL: 'manual',
  ALWAYS: 'always',
} as const;

export const ROUTE_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export const RENDER_MODE = {
  DEFERRED: 'deferred',
  IMMEDIATE: 'immediate',
} as const;

export const RETRY_MODE = {
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
} as const;

export const MAX_AGE = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
  WEEK: 1000 * 60 * 60 * 24 * 7,
  MONTH: 1000 * 60 * 60 * 24 * 30,
  YEAR: 1000 * 60 * 60 * 24 * 365,
};
