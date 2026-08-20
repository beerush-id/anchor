// biome-ignore assist/source/organizeImports: false
import type { NavigateOptions, Redirect, RedirectOptions, RouteTarget } from '@airlib/router';
import { createUrl, redirect as redirectTo, Route } from '@airlib/router';
import type { AnyRoute, RouteComponent } from './types.js';

/**
 * Programmatically navigate to a URL path.
 *
 * @param path The path string to navigate to.
 * @param options Query, params, and history replacement options.
 */
export function navigate(path: string, options?: NavigateOptions<string>): void;

/**
 * Programmatically navigate to a route.
 *
 * @param route The Route defining the destination.
 * @param options Query, params, and history replacement options.
 */
export function navigate<T>(route: RouteTarget<T>, options?: NavigateOptions<T>): void;

/**
 * Programmatically navigate to a route component.
 *
 * @param route The Route component defining the destination.
 * @param options Query, params, and history replacement options.
 */
export function navigate<T>(route: RouteComponent<T>, options?: NavigateOptions<T>): void;

export function navigate<T>(
  target: string | RouteTarget<T> | RouteComponent<T>,
  options: NavigateOptions<T> = {} as NavigateOptions<T>
) {
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  const { params, query, redirect, replace } = options as any;
  const path = ((target as RouteComponent<T>).route as AnyRoute)?.path ?? (target as AnyRoute).path;
  const href = createUrl(typeof target === 'string' ? target : path, params, query);

  const state = { href, query, params, redirect };

  if (replace) {
    history.replaceState(state, '', href);
  } else {
    history.pushState(state, '', href);
  }

  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}

/**
 * Programmatically redirect to a route component.
 * @param route - The route component to redirect to.
 * @param options - Optional redirect options.
 */
export function redirect<T>(route: RouteTarget<T> | RouteComponent<T>, options?: RedirectOptions<T>): Redirect<T> {
  if (typeof route === 'string' || route instanceof Route) {
    return redirectTo(route as never, options?.params, options?.query) as never;
  }

  return redirectTo((route as RouteComponent<T>).route as never, options?.params, options?.query) as never;
}
