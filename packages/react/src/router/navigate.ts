import { createUrl } from '@anchorlib/router';
import type { AnyRoute, RouteComponent } from './types.js';

/**
 * Navigation options for programmatic routing.
 */
export interface NavigateOptions {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  replace?: boolean;
  redirect?: string;
}

/**
 * Programmatically navigate to a route or path.
 *
 * @param path The path string to navigate to.
 * @param options Query, params, and history replacement options.
 */
export function navigate(path: string, options?: NavigateOptions): void;

/**
 * Programmatically navigate to a typed Route.
 *
 * @param route The Route defining the destination.
 * @param options Query, params, and history replacement options.
 */
export function navigate<T extends AnyRoute>(route: T, options?: NavigateOptions): void;

/**
 * Programmatically navigate to a typed Route component.
 *
 * @param route The Route component defining the destination.
 * @param options Query, params, and history replacement options.
 */
export function navigate<T extends AnyRoute>(route: RouteComponent<T>, options?: NavigateOptions): void;

export function navigate(target: string | AnyRoute | RouteComponent<AnyRoute>, options: NavigateOptions = {}) {
  const url =
    typeof target === 'string'
      ? createUrl(target, options.params, options.query)
      : createUrl(target.index ? target.index.path : (target as AnyRoute).path, options.params, options.query);

  const state = { href: url, query: options.query, params: options.params, redirect: options.redirect };

  if (options.replace) {
    history.replaceState(state, '', url);
  } else {
    history.pushState(state, '', url);
  }

  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}
