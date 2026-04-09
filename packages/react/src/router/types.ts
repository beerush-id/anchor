import type { None, Route, RouteOptions, RoutePath } from '@anchorlib/router';
import type { AnchorHTMLAttributes, FC, ReactNode } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AnyRoute = Route<RoutePath, any, any, RouteOptions, any, any>;

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

export type LinkProps<R extends AnyRoute> = AnchorHTMLAttributes<HTMLAnchorElement> &
  ComposedLinkProps<R> & {
    preload?: 'hover' | 'always' | 'never';
    replace?: boolean;
    activeClass?: string;
  };

export type RouteComponent<T extends AnyRoute> = FC<{ children?: ReactNode }> & {
  index: T;
  route: T['route'];
};
