import type { None, Route, RouteOptions, RoutePath } from '@anchorlib/router';
import type { AnchorHTMLAttributes, FC, ReactNode } from 'react';

/**
 * Represents any generic Route definition from the core router.
 */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AnyRoute = Route<RoutePath, any, any, RouteOptions, any, any>;

/**
 * Derives the required props for a Link component based on the target Route's params and query requirements.
 */
export type ComposedLinkProps<T extends AnyRoute> = T extends Route<
  infer _Path,
  infer Params,
  infer Query,
  infer _Options,
  infer _Data,
  infer _Parent
>
  ? Params extends None
    ? Query extends None
      ? { to?: RouteComponent<T> }
      : { to: RouteComponent<T>; query: Query }
    : Query extends None
      ? { to: RouteComponent<T>; params: Params }
      : { to: RouteComponent<T>; params: Params; query: Query }
  : { to?: RouteComponent<T> };

/**
 * Props for the Anchor Link component.
 */
export type LinkProps<R extends AnyRoute> = AnchorHTMLAttributes<HTMLAnchorElement> &
  ComposedLinkProps<R> & {
    preload?: 'hover' | 'always' | 'never';
    replace?: boolean;
    activeClass?: string;
  };

/**
 * A React component that represents a Route and provides static access to its underlying route definition.
 */
export type RouteComponent<T extends AnyRoute> = FC<{ children?: ReactNode }> & {
  index: T;
  route: T['route'];
};
