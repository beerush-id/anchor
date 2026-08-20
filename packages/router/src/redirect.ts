import { $symbol, getScope, microtask, setScope } from '@airlib/core';
import type { AnyRoute, InferParams, InferQuery, RouteTarget, UnknownRedirect } from './types.js';
import { createUrl } from './url.js';

const REDIRECT_HANDLER = $symbol('redirect-handler');

/**
 * Gets the handler for processing redirects.
 * @returns {((redirect: UnknownRedirect) => void) | undefined}
 */
export function getRedirectHandler(): ((redirect: UnknownRedirect) => void) | undefined {
  return getScope<(redirect: UnknownRedirect) => void>(REDIRECT_HANDLER);
}

/**
 * Sets the handler for processing redirects.
 *
 * This allows customizing how redirects are handled, such as
 * integrating with a specific routing library or browser history API.
 *
 * @param handler - A function that receives a redirect object
 */
export function setRedirectHandler(handler: (redirect: UnknownRedirect) => void) {
  setScope(REDIRECT_HANDLER, handler);
}

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
 */
export class Redirect<T> {
  public url?: string;
  public route?: RouteTarget<T>;
  public params?: InferParams<T>;
  public query?: InferQuery<T>;

  /**
   * Creates a new Redirect instance.
   *
   * @param url - The URL to redirect to
   */
  constructor(url: string);
  /**
   * Creates a new Redirect instance.
   *
   * @param route - The target route to redirect to
   * @param params - Optional route parameters
   * @param query - Optional query parameters
   */
  constructor(route: RouteTarget<T>, params?: InferParams<T>, query?: InferQuery<T>);
  constructor(route: RouteTarget<T> | string, params?: InferParams<T>, query?: InferQuery<T>) {
    this.url = typeof route === 'string' ? route : (undefined as string | undefined);
    this.route = typeof route === 'string' ? undefined : (route as RouteTarget<T>);
    this.query = query;
    this.params = params;
  }
}

const [schedule] = microtask(0);

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
 */
export function redirect<T>(
  route: string | RouteTarget<T>,
  params?: InferParams<T>,
  query?: InferQuery<T>
): Redirect<T> {
  const redirect = new Redirect(route as RouteTarget<T>, params, query);
  const redirectTo = getRedirectHandler();

  schedule(() => redirectTo?.(redirect as UnknownRedirect));
  return redirect;
}

/**
 * Converts a Redirect object to a URL string.
 *
 * Replaces route parameters with their values and appends query parameters.
 *
 * @param redirect - The redirect object to convert
 * @returns The full URL string for the redirect
 */
export function redirectUrl(redirect: UnknownRedirect): string {
  if (typeof redirect.url === 'string') return redirect.url;
  return createUrl((redirect.route as AnyRoute).path, redirect.params, redirect.query);
}
