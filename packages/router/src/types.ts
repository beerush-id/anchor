import type { RetriableOptions, StateObserver } from '@anchorlib/core';
import type { ROUTE_TYPE } from './enum.js';
import type { Redirect } from './redirect.js';
import type { Route } from './route.js';

export type TRec = Record<string, unknown>;
export type None = Record<string, never>;

export type ParamTypeMap = {
  null: null;
  string: string;
  number: number;
  boolean: boolean;

  array: unknown[];
  object: Record<string, unknown>;
};

export type ParamType<T> = T extends keyof ParamTypeMap ? ParamTypeMap[T] : string;

export type ExtractParamType<T extends string> = T extends `${infer Param}(${infer S})`
  ? { [K in Param]: ParamType<S> }
  : { [K in T]: string };

export type ExtractParams<TPath extends string> = TPath extends `${infer Path}?${string}`
  ? ExtractParamsPart<Path>
  : ExtractParamsPart<TPath>;

export type ExtractParamsPart<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? ExtractParamType<Param> & ExtractParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? ExtractParamType<Param>
    : None;

export type ExtractQueryParams<T extends string> = T extends `${string}?${infer QueryPart}`
  ? ExtractQueryPart<QueryPart>
  : None;

export type ExtractQueryPart<T extends string> = T extends `${infer First}&${infer Rest}`
  ? ExtractSingleQueryParam<First> & ExtractQueryPart<Rest>
  : ExtractSingleQueryParam<T>;

export type ExtractSingleQueryParam<T extends string> = T extends `${infer Param}=${infer S}`
  ? S extends `(${infer P})`
    ? {
        [K in Param]: P extends keyof ParamTypeMap ? ParamTypeMap[P] : string;
      }
    : { [K in Param]: S }
  : {
      [K in T]?: string;
    };

export type PathParams<TParams, TQueryParams> = {
  query: TQueryParams;
  params: TParams;
};

export type ExtractPathParams<TPath extends string> = TPath extends `${infer P}?${string}`
  ? PathParams<ExtractParams<P>, ExtractQueryParams<TPath>>
  : PathParams<ExtractParams<TPath>, None>;

export type GuardBlocker = Error | UnknownRedirect;
export type GuardContext<TParams, TQueryParams> = {
  query: TQueryParams;
  params: TParams;
};

export type GuardHandler<TParams, TQueryParams> = (
  context: GuardContext<TParams, TQueryParams>
) => Promise<void> | void;
export type UnknownGuard = (context: GuardContext<TRec, TRec>) => Promise<void> | void;

export type ProviderContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
};

export type RouteErrorType = 'guard' | 'provider' | 'timeout' | 'cancel';

export type RouteError = {
  type: RouteErrorType;
  cause?: Error;
  message: string;
};

export interface CacheOptions {
  maxAge?: number;
}
export interface ProviderOptions extends RetriableOptions, CacheOptions {}

export type ProviderMap = {
  name: string;
  provider: UnknownProvider;
  options?: ProviderOptions;
};

export type RouteType = (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];

export interface RouteOptions extends ProviderOptions {
  // Keep the route's context when de-activating.
  keepAlive?: boolean;
}

export type UnknownParams = ExtractParams<''>;
export type UnknownQueryParams = ExtractQueryParams<''>;
export type UnknownRoute = Route<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec, unknown>;
export type UnknownProvider = (ctx: ProviderContext<TRec, TRec, TRec>) => Promise<unknown> | unknown;
export type UnknownRedirect = Redirect<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec>;

export type ActiveContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
};

export type RouterOptions = RouteOptions & {
  baseUrl?: string;
};

export type FlatRec<TParams> = {
  [K in keyof TParams]: TParams[K];
};

export type RouteState<TParams, TQueryParams, TData> = {
  active: boolean;
  authenticated: boolean;

  data?: TData;
  error?: RouteError;
  context?: ActiveContext<FlatRec<TParams>, FlatRec<TQueryParams>, FlatRec<TData>>;
};

export type RoutePath = `${'/'}${string | never}`;
export type RouteName<TPath extends RoutePath> = TPath extends `/${infer TParam}`
  ? TParam extends `:${infer Param}`
    ? Param extends `${infer TName}(${string})`
      ? TName
      : Param
    : TParam
  : never;

export type RoutePathOutput<TParent, TPath extends RoutePath> = TParent extends Route<
  infer _PPath,
  infer _PParams,
  infer _PQueryParams,
  infer _POptions,
  infer _PData,
  infer _P
>
  ? TParent['path'] extends '/'
    ? TPath
    : `${TParent['path']}${TPath}`
  : TPath;

export type MatchedRoute = {
  route: UnknownRoute;
  params: TRec;
  segments: UnknownRoute[];
};

export type MatchResult = MatchedRoute & {
  url: URL;
  query: TRec;
};

export type CachedRouteData = {
  data: unknown;
  timestamp: number;
  scheduler: number;
};

export type ProviderCache = Map<string, CachedRouteData>;
export type ProviderObserver = {
  observer: StateObserver;
  resolver: () => Promise<unknown>;
};
