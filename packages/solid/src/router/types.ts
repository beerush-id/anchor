import type {
  AnyRoute,
  IndexRoute,
  None,
  PreloadMode,
  Route,
  RouteIndexRenderer,
  RouteLayoutRenderer,
  Router,
  UnknownRoute,
} from '@airlib/router';
import type { Component, JSX, ParentComponent } from '../solid.js';

/**
 * Represents any generic Route definition from the core router.
 */
export type { AnyRoute };

export type LinkDynamicProps<T, Params, Query> = Params extends None
  ? Query extends None
    ? { to?: T | RouteComponent<T> }
    : { to: T | RouteComponent<T>; query?: Query }
  : Query extends None
    ? { to: T | RouteComponent<T>; params: Params }
    : { to: T | RouteComponent<T>; params: Params; query?: Query };

/**
 * Derives the required props for a Link component based on the target Route's params and query requirements.
 */
export type ComposedLinkProps<T> =
  T extends IndexRoute<infer _Path, infer Params, infer Query, infer _Data, infer _Parent>
    ? LinkDynamicProps<T, Params, Query>
    : T extends Route<infer _Path, infer Params, infer Query, infer _Data, infer _Parent>
      ? LinkDynamicProps<T, Params, Query>
      : { to?: T | RouteComponent<T> };

/**
 * Props for the Anchor Link component.
 */
export type LinkProps<R> = JSX.AnchorHTMLAttributes<HTMLAnchorElement> &
  ComposedLinkProps<R> & {
    preload?: PreloadMode;
    replace?: boolean;
    fullMatch?: boolean;
    activeClass?: string;
    resetScroll?: boolean | 'smooth' | 'auto' | 'instant';
    keepVisible?: boolean | 'smooth' | 'auto' | 'instant';
  };

/**
 * A Solid component that represents a Route and provides static access to its underlying route definition.
 */
export type RouteComponent<T> = ParentComponent & {
  route: T;
  render: T extends Route<
    infer _TPath,
    infer TParams,
    infer TQueryParams,
    infer TData,
    infer _TParent,
    infer TOutput,
    infer PParams,
    infer PQueryParams,
    infer PData
  >
    ? (
        renderer: RouteLayoutRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>
      ) => RouteComponent<T>
    : T extends IndexRoute<
          infer _TPath,
          infer TParams,
          infer TQueryParams,
          infer TData,
          infer _TParent,
          infer TOutput,
          infer PParams,
          infer PQueryParams,
          infer PData
        >
      ? (
          renderer: RouteIndexRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>
        ) => RouteComponent<T>
      : never;
  renderAsync: T extends Route<
    infer _TPath,
    infer TParams,
    infer TQueryParams,
    infer TData,
    infer _TParent,
    infer TOutput,
    infer PParams,
    infer PQueryParams,
    infer PData
  >
    ? (
        loader: () => Promise<RouteLayoutRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>>,
        fallback?: RouteLayoutRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>
      ) => RouteComponent<T>
    : T extends IndexRoute<
          infer _TPath,
          infer TParams,
          infer TQueryParams,
          infer TData,
          infer _TParent,
          infer TOutput,
          infer PParams,
          infer PQueryParams,
          infer PData
        >
      ? (
          loader: () => Promise<
            RouteIndexRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>
          >,
          fallback?: RouteIndexRenderer<TParams, TQueryParams, TData, PParams, PQueryParams, PData, TOutput>
        ) => RouteComponent<T>
      : never;
};

export type RouteStacks = Map<UnknownRoute, Component>;

/**
 * Props for the root UIRouter component.
 */
export type UIRouterProps = {
  router: Router<JSX.Element>;
  url?: string;
  root?: RouteComponent<AnyRoute>;
  headless?: boolean;
  resetScroll?: boolean | 'smooth' | 'auto' | 'instant';
  children?: JSX.Element;
};
