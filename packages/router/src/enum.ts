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
