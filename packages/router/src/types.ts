import type { RetriableOptions, StateObserver } from '@anchorlib/core';
import type { RouteCache, URLCache } from './cache.js';
import type { RouterContext } from './context.js';
import type { PRELOAD_MODE, RENDER_MODE, ROUTE_STATUS, ROUTE_TYPE } from './enum.js';
import type { Redirect } from './redirect.js';
import type { ContextReader, IndexRoute, Route } from './route.js';

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

export type NestedParams<PParams, CParams> = PParams extends None ? CParams : PParams & CParams;
export type NestedQueryParams<PQuery, CQuery> = PQuery extends None ? CQuery : PQuery & CQuery;

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
  /** Blocking mode for route rendering */
  preloadMode?: PreloadMode;

  /** Keep the route's context when de-activating */
  keepAlive?: boolean;
}

/** Unknown parameters type */
export type UnknownParams = ExtractParams<''>;
/** Unknown query parameters type */
export type UnknownQueryParams = ExtractQueryParams<''>;
/** Unknown route type */
export type UnknownRoute = Route<RoutePath, UnknownParams, UnknownQueryParams>;
/** Unknown provider type */
export type UnknownProvider = (ctx: RouteContext<TRec, TRec, TRec>) => Promise<unknown> | unknown;
/** Unknown redirect type */
export type UnknownRedirect = Redirect<UnknownRoute>;

/** Options for configuring the router */
export type RouterOptions = RouteOptions & {
  baseUrl?: string;
  cacheSize?: number;
  renderMode?: RenderMode;
};

export type RouteStatus = (typeof ROUTE_STATUS)[keyof typeof ROUTE_STATUS];

/** Internal state for a route */
export type RouteState = {
  status: RouteStatus;
  active: boolean;
  resolved: boolean;
  resolving: boolean;
  authenticated: boolean;
  authenticating: boolean;

  error?: RouteError;
};

/** Internal context for a route */
export type RouteContext<Params, QueryParams, Data> = {
  data: Data;
  query: QueryParams;
  params: Params;
  exception?: Error;
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
  infer _PData,
  infer _Parent
>
  ? TParent['path'] extends '/'
    ? TPath
    : `${TParent['path']}${TPath}`
  : TPath;

export type MatchRouteSegment = {
  route: UnknownRoute;
  store: RouteContext<TRec, TRec, TRec>;
};

/** A matched route result */
export type MatchedRoute = {
  route: UnknownRoute;
  query: TRec;
  params: TRec;
  segments: MatchRouteSegment[];
  exception?: Error;
};

/** A complete match result with URL and context */
export type MatchResult = MatchedRoute & {
  url: URL;
};

/** Cached route data with expiration */
export type CachedRouteData = {
  data: unknown;
  maxAge: number;
  timestamp: number;
  scheduler: number;
  temporary?: boolean;
};

/** Cache for provider data */
export type ProviderCache = Map<string, CachedRouteData>;

export type GuardObserver = {
  observer: StateObserver;
  authenticator: () => void | Promise<void>;
};

/** Observer for provider reactivity */
export type ProviderObserver = {
  observer: StateObserver;
  resolver: () => Promise<unknown>;
};

export type RouteStorage = {
  state: RouteState;
  cache: RouteCache;
  context: { value: RouteContext<TRec, TRec, TRec> };
  dataCache: WeakMap<RouteContext<TRec, TRec, TRec>, TRec>;
  activeResolvers: Map<RouteContext<TRec, TRec, TRec>, AbortController>;
  guardObserver: StateObserver;
  guardObservers: WeakMap<UnknownGuard, GuardObserver>;
  providerObservers: WeakMap<UnknownProvider, ProviderObserver>;
};

export type RouterState = {
  steps: number;
  progress: number;
  activating: boolean;
};

export type RouterStorage = {
  state: RouterState;
  cache: URLCache;
  context: RouterContext<TRec, TRec, TRec>;
  activeUrl: string | undefined;
  activeRoute: UnknownRoute | undefined;
  activeSegments: MatchRouteSegment[] | undefined;
  activatingSegments: Set<MatchRouteSegment>;
};

export type PreloadMode = (typeof PRELOAD_MODE)[keyof typeof PRELOAD_MODE];
export type RenderMode = (typeof RENDER_MODE)[keyof typeof RENDER_MODE];

export type RouteRenderProps<Params, QueryParams, Data> = {
  state: ContextReader<Params, QueryParams, Data>;
  context: RouterContext<Params, QueryParams, Data>;
};

export type RouteLayoutRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output> = (props: {
  state: ContextReader<Params, QueryParams, Data>;
  context: RouterContext<PParams, PQueryParams, PData>;
  children: Output;
}) => Output;
export type RouteIndexRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output> = (props: {
  state: ContextReader<Params, QueryParams, Data>;
  context: RouterContext<PParams, PQueryParams, PData>;
}) => Output;
export type RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output> = Path extends '/'
  ? RouteIndexRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>
  : RouteLayoutRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>;

export type RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output> = (props: {
  error: Error;
  state: ContextReader<Params, QueryParams, Data>;
  context: RouterContext<PParams, PQueryParams, PData>;
}) => Output;

export type RouteTarget<T> = T extends
  | Route<infer _Path, infer _Params, infer _Query, infer _Data, infer _Parent>
  | IndexRoute<infer _IPath, infer _IParams, infer _IQuery, infer _IData, infer _IParent>
  ? T
  : never;

export type InferState<T> = T extends Route<infer _Path, infer Params, infer Query, infer Data, infer _TParent>
  ? ContextReader<Params, Query, Data>
  : None;
export type InferContext<T> = T extends Route<
  infer _Path,
  infer _Params,
  infer _Query,
  infer _TData,
  infer _TParent,
  infer PParams,
  infer PQuery,
  infer PData
>
  ? RouterContext<PParams, PQuery, PData>
  : None;

export type InferParams<T> = T extends Route<infer _Path, infer Params, infer _Query, infer _TData, infer _TParent>
  ? Params
  : None;
export type InferQuery<T> = T extends Route<infer _Path, infer _Params, infer Query, infer _TData, infer _TParent>
  ? Query
  : None;

export type ExtractOptions<Params, Query> = Params extends None
  ? Query extends None
    ? None
    : { query: Query }
  : Query extends None
    ? { params: Params }
    : { query: Query; params: Params };

export type RedirectOptions<T> = T extends Route<
  infer _Path,
  infer Params,
  infer Query,
  infer _Data,
  infer _Parent,
  infer _Output,
  infer _PParams,
  infer _PQuery,
  infer _PData
>
  ? ExtractOptions<Params, Query>
  : never;

export type NavigateParams<Params, Query> = Params extends None
  ? Query extends None
    ? { replace?: boolean; redirect?: string }
    : { replace?: boolean; redirect?: string; query: Query }
  : Query extends None
    ? { replace?: boolean; redirect?: string; params: Params }
    : { replace?: boolean; redirect?: string; query: Query; params: Params };

/**
 * Navigation options for programmatic routing.
 */
export type NavigateOptions<T> = T extends Route<infer Params, infer Query, infer _Data, infer _Parent>
  ? NavigateParams<Params, Query>
  : NavigateParams<None, None>;
