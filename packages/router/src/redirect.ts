import { microtask } from '@anchorlib/core';
import type { Route } from './route.js';
import type { ExtractParams, ExtractQueryParams, RouteOptions, RoutePath, UnknownRedirect } from './types.js';

/**
 * Internal handler for processing redirects.
 *
 * Set via {@link setRedirectHandler} to customize redirect behavior.
 *
 * @internal
 */
let redirectHandler: (redirect: UnknownRedirect) => void;

/**
 * Sets the handler for processing redirects.
 *
 * This allows customizing how redirects are handled, such as
 * integrating with a specific routing library or browser history API.
 *
 * @param handler - A function that receives a redirect object
 *
 * @example
 * ```ts
 * import { setRedirectHandler } from '@anchorlib/router';
 *
 * setRedirectHandler((redirect) => {
 *   const url = redirectUrl(redirect);
 *   window.location.href = url;
 * });
 * ```
 */
export function setRedirectHandler(handler: (redirect: UnknownRedirect) => void) {
  redirectHandler = handler;
}

const [schedule] = microtask(0);

/**
 * Represents a redirect to a different route.
 *
 * Redirects can be thrown from guards to trigger navigation to another route.
 *
 * @template TPath - The route path type
 * @template TParams - The route parameters type
 * @template TQueryParams - The query parameters type
 * @template TOptions - The route options type
 * @template TData - The route data type
 *
 * @example
 * ```ts
 * import { Redirect } from '@anchorlib/router';
 *
 * const redirect = new Redirect(loginRoute, { returnTo: '/dashboard' });
 * throw redirect;
 * ```
 */
export class Redirect<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData = unknown,
> {
  /**
   * Creates a new Redirect instance.
   *
   * @param route - The target route to redirect to
   * @param params - Optional route parameters
   * @param query - Optional query parameters
   */
  constructor(
    public route: Route<TPath, TParams, TQueryParams, TOptions, TData>,
    public params?: TParams,
    public query?: TQueryParams
  ) {}
}

/**
 * Creates a redirect to a different route.
 *
 * This function creates a Redirect object and schedules it to be processed
 * by the redirect handler. Can be thrown from guards to trigger navigation.
 *
 * @template TPath - The route path type
 * @template TParams - The route parameters type
 * @template TQueryParams - The query parameters type
 * @template TOptions - The route options type
 * @template TData - The route data type
 * @param route - The target route to redirect to
 * @param params - Optional route parameters
 * @param query - Optional query parameters
 * @returns A Redirect object
 *
 * @example
 * ```ts
 * import { redirect } from '@anchorlib/router';
 *
 * route.guard(async ({ params }) => {
 *   if (!await isAuthenticated()) {
 *     throw redirect(loginRoute, { returnTo: '/dashboard' });
 *   }
 * });
 * ```
 */
export function redirect<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData,
>(
  route: Route<TPath, TParams, TQueryParams, TOptions, TData>,
  params?: TParams,
  query?: TQueryParams
): Redirect<TPath, TParams, TQueryParams, TOptions, TData> {
  const redirect = new Redirect(route, params, query);
  schedule(() => redirectHandler?.(redirect as UnknownRedirect));
  return redirect;
}

/**
 * Converts a Redirect object to a URL string.
 *
 * Replaces route parameters with their values and appends query parameters.
 *
 * @param redirect - The redirect object to convert
 * @returns The full URL string for the redirect
 *
 * @example
 * ```ts
 * import { redirect, redirectUrl } from '@anchorlib/router';
 *
 * const r = redirect(userRoute, { id: '123' }, { tab: 'profile' });
 * const url = redirectUrl(r);
 * // Returns: '/users/123?tab=profile'
 * ```
 */
export function redirectUrl(redirect: UnknownRedirect): string {
  let url = redirect.route.path as string;

  if (redirect.params) {
    for (const [key, value] of Object.entries(redirect.params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }

  if (redirect.query && Object.keys(redirect.query).length > 0) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(redirect.query)) {
      if (Array.isArray(value)) {
        (value as string[]).forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.set(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  return `/${url}`;
}
