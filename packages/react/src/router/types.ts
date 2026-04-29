import type {
  IndexRoute,
  None,
  Route,
  RouteOptions,
  RoutePath,
  Router,
  RouteRendererFn,
  UnknownRoute,
} from '@anchorlib/router';
import type { AnchorHTMLAttributes, FC, ReactNode } from 'react';

/**
 * Represents any generic Route definition from the core router.
 */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AnyRoute = Route<RoutePath, any, any, RouteOptions, any, any>;

export type LinkDynamicProps<T, Params, Query> = Params extends None
  ? Query extends None
    ? { to?: RouteComponent<T> }
    : { to: RouteComponent<T>; query: Query }
  : Query extends None
    ? { to: RouteComponent<T>; params: Params }
    : { to: RouteComponent<T>; params: Params; query: Query };

/**
 * Derives the required props for a Link component based on the target Route's params and query requirements.
 */
export type ComposedLinkProps<T> = T extends IndexRoute<
  infer _Path,
  infer Params,
  infer Query,
  infer _Options,
  infer _Data,
  infer _Parent
>
  ? LinkDynamicProps<T, Params, Query>
  : T extends Route<infer _Path, infer Params, infer Query, infer _Options, infer _Data, infer _Parent>
    ? LinkDynamicProps<T, Params, Query>
    : { to?: RouteComponent<T> };

/**
 * Props for the Anchor Link component.
 */
export type LinkProps<R> = AnchorHTMLAttributes<HTMLAnchorElement> &
  ComposedLinkProps<R> & {
    preload?: 'hover' | 'always' | 'never';
    replace?: boolean;
    activeClass?: string;
  };

/**
 * A React component that represents a Route and provides static access to its underlying route definition.
 */
export type RouteComponent<T> = FC<{ children?: ReactNode }> & {
  index: T;
  route: T extends AnyRoute ? T['route'] : never;
  render: T extends Route<
    infer _TPath,
    infer TParams,
    infer TQueryParams,
    infer _TOptions,
    infer TData,
    infer _TParent,
    infer TOutput
  >
    ? (renderer: RouteRendererFn<TParams, TQueryParams, TData, TOutput>) => RouteComponent<T>
    : T extends IndexRoute<
          infer _TPath,
          infer TParams,
          infer TQueryParams,
          infer _TOptions,
          infer TData,
          infer _TParent,
          infer TOutput
        >
      ? (renderer: RouteRendererFn<TParams, TQueryParams, TData, TOutput>) => RouteComponent<T>
      : never;
};

export type RouteStacks = Map<UnknownRoute, FC>;

/**
 * Props for the root UIRouter component.
 */
export type UIRouterProps = {
  router: Router<ReactNode>;
  root: RouteComponent<AnyRoute>;
  url?: string;
  headless?: boolean;
  resetScroll?: boolean | 'smooth' | 'auto' | 'instant';
};
