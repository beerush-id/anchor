import { microtask } from '@anchorlib/core';
import type { Route } from './route.js';
import type { ExtractParams, ExtractQueryParams, RouteOptions, RoutePath, UnknownRedirect } from './types.js';

let redirectHandler: (redirect: UnknownRedirect) => void;

export function setRedirectHandler(handler: (redirect: UnknownRedirect) => void) {
  redirectHandler = handler;
}

const [schedule] = microtask(0);

export class Redirect<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData = unknown,
> {
  constructor(
    public route: Route<TPath, TParams, TQueryParams, TOptions, TData>,
    public params?: TParams,
    public query?: TQueryParams
  ) {}
}

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

export function redirectUrl(redirect: UnknownRedirect): string {
  let url = redirect.route.path as string;

  if (redirect.params) {
    for (const [key, value] of Object.entries(redirect.params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }

  if (redirect.query && Object.keys(redirect.query).length > 0) {
    const queryString = new URLSearchParams(Object.entries(redirect.query).map(([k, v]) => [k, String(v)])).toString();
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  return url;
}
