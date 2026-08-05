import type { RetriableOptions, StateObserver } from '@anchorlib/core';
import type { RouteCache, URLCache } from './cache.js';
import type { RouterContext } from './context.js';
import type { ERROR_TYPE, PRELOAD_MODE, RENDER_MODE, ROUTE_STATUS, ROUTE_TYPE } from './enum.js';
import type { RouteError } from './error.js';
import type { Redirect } from './redirect.js';
import type { ContextReader, IndexRoute, Route } from './route.js';

/** A generic record type with string keys and unknown values */
export type TRec = Record<string, unknown>;
/** An empty record type */
export type None = Record<string, never>;

/**
 * Metadata attached to route nodes (page title, menu section, icon, etc.).
 * Empty by default — apps declare their keys via module augmentation:
 *
 * Meta is set at runtime with `route.meta(partial)` and read back with `route.meta()`.
 * File-routing MDX pages receive their meta from frontmatter keys automatically.
 */
// biome-ignore lint/suspicious/noEmptyInterface: Expect overrides.
export interface RouteMeta {}

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
export type GuardBlocker = RouteError | UnknownRedirect;

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
export type RouteErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

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
  parallel?: boolean;
};

export type ProviderResolver<O, P, Q, D> = (context: RouteContext<P, Q, D>) => Promise<O> | O;
export type ProviderResolvers<Params, Query, Data> = {
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  [key: string]: (context: RouteContext<Params, Query, Data>) => any;
};
export type ProviderResolversOut<P> =
  P extends ProviderResolvers<infer _P, infer _Q, infer _D>
    ? {
        [K in keyof P]: P[K] extends (...args: infer _A) => infer O ? (O extends Promise<infer D> ? D : O) : P[K];
      }
    : TRec;
export type ProviderResolverMap = {
  [key: string]: {
    handler: UnknownProvider;
    options?: ProviderOptions;
  };
};
export type MergedProvidersOut<D extends TRec, O extends TRec> = D & {
  [K in keyof O]: O[K];
} & {};

/** The type of a route (static, dynamic, wildcard, or index) */
export type RouteType = (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];

export interface SitemapEntry {
  /** The URL or relative path for this sitemap entry */
  loc?: string;
  /** Last modification date (ISO string or Date or YYYY-MM-DD string) */
  lastmod?: string | Date;
  /** Change frequency */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority between 0.0 and 1.0 */
  priority?: number;
  /** If true, maps this entry across all static child routes of the generating route */
  nested?: boolean;
  /** The language code (e.g. 'en', 'fr') for this specific entry to enable auto cross-linking */
  hreflang?: string;
  /** Explicit list of alternate versions of this page */
  alternates?: { hreflang: string; href: string }[];
}

export type SitemapGeneratorResult =
  | string
  | SitemapEntry
  | undefined
  | null
  | (string | SitemapEntry | undefined | null)[];

export type SitemapGenerator<
  Path extends RoutePath = RoutePath,
  Params extends ExtractParams<Path> = ExtractParams<Path>,
  QueryParams extends ExtractQueryParams<Path> = ExtractQueryParams<Path>,
> = {
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  (route: Route<Path, Params, QueryParams, any, any>): SitemapGeneratorResult | Promise<SitemapGeneratorResult>;
};

export type SitemapOption<
  Path extends RoutePath = RoutePath,
  Params extends ExtractParams<Path> = ExtractParams<Path>,
  QueryParams extends ExtractQueryParams<Path> = ExtractQueryParams<Path>,
> = boolean | SitemapEntry | SitemapGenerator<Path, Params, QueryParams>;

/** Options for configuring a route */
export interface RouteOptions<
  Path extends RoutePath = RoutePath,
  Params extends ExtractParams<Path> = ExtractParams<Path>,
  QueryParams extends ExtractQueryParams<Path> = ExtractQueryParams<Path>,
> extends ProviderOptions {
  /** Blocking mode for route rendering */
  preloadMode?: PreloadMode;

  /** Keep the route's context when de-activating */
  keepAlive?: boolean;

  /**
   * Sitemap configuration for this route.
   * - `false`: Exclude this route from the sitemap.
   * - `true` or undefined: Include this route with default settings (static routes only).
   * - `SitemapEntry`: Include this route with custom attributes (changefreq, priority, etc.).
   * - `SitemapGenerator`: Function or async function returning sitemap entries or paths.
   */
  sitemap?: SitemapOption<Path, Params, QueryParams>;
}

/** Unknown parameters type */
export type UnknownParams = ExtractParams<''>;
/** Unknown query parameters type */
export type UnknownQueryParams = ExtractQueryParams<''>;
/** Unknown route type */
export type UnknownRoute = Route<RoutePath, UnknownParams, UnknownQueryParams>;
/** Any Route type */
export type AnyRoute =
  | Route<RoutePath, UnknownParams, UnknownQueryParams>
  | IndexRoute<RoutePath, UnknownParams, UnknownQueryParams>;
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
  resolving: Set<string>;
  authenticated: boolean;
  authenticating: boolean;

  error?: RouteError;
};

/** Internal context for a route */
export type RouteContext<Params, QueryParams, Data> = {
  data: Data;
  query: QueryParams;
  params: Params;
  signal?: AbortSignal;
  exception?: RouteError;
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
export type RoutePathOutput<TParent, TPath extends RoutePath> =
  TParent extends Route<infer _PPath, infer _PParams, infer _PQueryParams, infer _PData, infer _Parent>
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
  exception?: RouteError;
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
  activeControllers: Map<RouteContext<TRec, TRec, TRec>, AbortController>;
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
  activeController?: AbortController;
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
  error: RouteError;
  state: ContextReader<Params, QueryParams, Data>;
  context: RouterContext<PParams, PQueryParams, PData>;
}) => Output;

export type RouteTarget<T> = T extends
  | Route<infer _Path, infer _Params, infer _Query, infer _Data, infer _Parent>
  | IndexRoute<infer _IPath, infer _IParams, infer _IQuery, infer _IData, infer _IParent>
  ? T
  : never;

export type InferState<T> =
  T extends Route<infer _Path, infer Params, infer Query, infer Data, infer _TParent>
    ? ContextReader<Params, Query, Data>
    : None;
export type InferContext<T> =
  T extends Route<
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

export type InferParams<T> =
  T extends Route<infer _Path, infer Params, infer _Query, infer _TData, infer _TParent> ? Params : None;
export type InferQuery<T> =
  T extends Route<infer _Path, infer _Params, infer Query, infer _TData, infer _TParent> ? Query : None;

export type ExtractOptions<Params, Query> = Params extends None
  ? Query extends None
    ? None
    : { query: Query }
  : Query extends None
    ? { params: Params }
    : { query: Query; params: Params };

export type RedirectOptions<T> =
  T extends Route<
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
export type NavigateOptions<T> =
  T extends Route<infer Params, infer Query, infer _Data, infer _Parent>
    ? NavigateParams<Params, Query>
    : NavigateParams<None, None>;

export type RouteEntryValue = {
  type: RouteType;
  isIndex: boolean;
  route: UnknownRoute;
  toString: (params?: TRec, query?: TRec) => string;
};

export type RouteEntry = [string, RouteEntryValue];

export interface SitemapConfig {
  /** The base origin URL (e.g. 'https://example.com'). Defaults to router.options.baseUrl */
  baseUrl?: string;
  /**
   * Request URL or sitemap endpoint URL (e.g., 'https://example.com/docs/sitemap.xml').
   * If provided, strips '/sitemap.xml' to match the corresponding subtree route.
   */
  url?: string | URL;
  /**
   * Routes to exclude from this sitemap generation.
   * Excluding a route automatically excludes all child routes beneath it.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Accept any concrete Route instance.
  exclude?: (UnknownRoute | Route<any, any, any, any, any, any, any, any, any>)[];
  /**
   * The XML root element and item wrapper type.
   * - `'urlset'` (default): Standard sitemap wrapping items in `<url>`.
   * - `'index'` or `'sitemapindex'`: Sitemap index wrapping items in `<sitemap>`.
   */
  type?: 'urlset' | 'index' | 'sitemapindex';
}
