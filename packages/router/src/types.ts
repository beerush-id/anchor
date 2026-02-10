import type { RetriableOptions, StateObserver } from '@anchorlib/core';
import type { ROUTE_TYPE } from './enum.js';
import type { Redirect } from './redirect.js';
import type { Route } from './route.js';

/** A generic record type with string keys and unknown values */
export type TRec = Record<string, unknown>;
/** An empty record type */
export type None = Record<string, never>;

/** Maps parameter type strings to their TypeScript types */
export type ParamTypeMap = {
  null: null;
  string: string;
  number: number;
  boolean: boolean;

  array: unknown[];
  object: Record<string, unknown>;
};

/** Gets the TypeScript type for a parameter type string */
export type ParamType<T> = T extends keyof ParamTypeMap ? ParamTypeMap[T] : string;

/** Extracts a typed parameter from a route path segment */
export type ExtractParamType<T extends string> = T extends `${infer Param}(${infer S})`
  ? { [K in Param]: ParamType<S> }
  : { [K in T]: string };

/** Extracts all parameters from a route path */
export type ExtractParams<TPath extends string> = TPath extends `${infer Path}?${string}`
  ? ExtractParamsPart<Path>
  : ExtractParamsPart<TPath>;

/** Internal helper for extracting parameters from path parts */
export type ExtractParamsPart<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? ExtractParamType<Param> & ExtractParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? ExtractParamType<Param>
    : None;

/** Extracts query parameters from a route path */
export type ExtractQueryParams<T extends string> = T extends `${string}?${infer QueryPart}`
  ? ExtractQueryPart<QueryPart>
  : None;

/** Internal helper for extracting query parameters */
export type ExtractQueryPart<T extends string> = T extends `${infer First}&${infer Rest}`
  ? ExtractSingleQueryParam<First> & ExtractQueryPart<Rest>
  : ExtractSingleQueryParam<T>;

/** Extracts a single query parameter */
export type ExtractSingleQueryParam<T extends string> = T extends `${infer Param}=${infer S}`
  ? S extends `(${infer P})`
    ? {
        [K in Param]: P extends keyof ParamTypeMap ? ParamTypeMap[P] : string;
      }
    : { [K in Param]: S }
  : {
      [K in T]?: string;
    };

/** Combines path and query parameters */
export type PathParams<TParams, TQueryParams> = {
  query: TQueryParams;
  params: TParams;
};

/** Extracts both path and query parameters from a route path */
export type ExtractPathParams<TPath extends string> = TPath extends `${infer P}?${string}`
  ? PathParams<ExtractParams<P>, ExtractQueryParams<TPath>>
  : PathParams<ExtractParams<TPath>, None>;

/** A blocker that can prevent route activation (Error or Redirect) */
export type GuardBlocker = Error | UnknownRedirect;

/** Context passed to guard functions */
export type GuardContext<TParams, TQueryParams> = {
  query: TQueryParams;
  params: TParams;
};

/** A guard function that can block navigation */
export type GuardHandler<TParams, TQueryParams> = (
  context: GuardContext<TParams, TQueryParams>
) => Promise<void> | void;

/** An untyped guard function */
export type UnknownGuard = (context: GuardContext<TRec, TRec>) => Promise<void> | void;

/** Context passed to provider functions */
export type ProviderContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
};

/** Possible error types for routes */
export type RouteErrorType = 'guard' | 'provider' | 'timeout' | 'cancel';

/** Error information for route failures */
export type RouteError = {
  type: RouteErrorType;
  cause?: Error;
  message: string;
};

/** Options for caching provider data */
export interface CacheOptions {
  maxAge?: number;
}

/** Options for providers, including retry and cache settings */
export interface ProviderOptions extends RetriableOptions, CacheOptions {}

/** A provider entry in the route's provider map */
export type ProviderMap = {
  name: string;
  provider: UnknownProvider;
  options?: ProviderOptions;
};

/** The type of a route (static, dynamic, wildcard, or index) */
export type RouteType = (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];

/** Options for configuring a route */
export interface RouteOptions extends ProviderOptions {
  /** Keep the route's context when de-activating */
  keepAlive?: boolean;
}

/** Unknown parameters type */
export type UnknownParams = ExtractParams<''>;
/** Unknown query parameters type */
export type UnknownQueryParams = ExtractQueryParams<''>;
/** Unknown route type */
export type UnknownRoute = Route<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec, unknown>;
/** Unknown provider type */
export type UnknownProvider = (ctx: ProviderContext<TRec, TRec, TRec>) => Promise<unknown> | unknown;
/** Unknown redirect type */
export type UnknownRedirect = Redirect<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec>;

/** Active context for a route */
export type ActiveContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
};

/** Options for configuring the router */
export type RouterOptions = RouteOptions & {
  baseUrl?: string;
  cacheSize?: number;
};

/** Flattens a record type */
export type FlatRec<TParams> = {
  [K in keyof TParams]: TParams[K];
};

/** Internal state for a route */
export type RouteState<TParams, TQueryParams, TData> = {
  active: boolean;
  authenticated: boolean;

  data?: TData;
  error?: RouteError;
  context?: ActiveContext<FlatRec<TParams>, FlatRec<TQueryParams>, FlatRec<TData>>;
};

/** A route path string */
export type RoutePath = `${'/'}${string | never}`;

/** Extracts the route name from a path */
export type RouteName<TPath extends RoutePath> = TPath extends `/${infer TParam}`
  ? TParam extends `:${infer Param}`
    ? Param extends `${infer TName}(${string})`
      ? TName
      : Param
    : TParam
  : never;

/** Computes the full path output including parent paths */
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

/** A matched route result */
export type MatchedRoute = {
  route: UnknownRoute;
  params: TRec;
  segments: UnknownRoute[];
};

/** A complete match result with URL and context */
export type MatchResult = MatchedRoute & {
  url: URL;
  query: TRec;
  context: ProviderContext<TRec, TRec, TRec>;
};

/** Cached route data with expiration */
export type CachedRouteData = {
  data: unknown;
  timestamp: number;
  scheduler: number;
};

/** Cache for provider data */
export type ProviderCache = Map<string, CachedRouteData>;

/** Observer for provider reactivity */
export type ProviderObserver = {
  observer: StateObserver;
  resolver: () => Promise<unknown>;
};
