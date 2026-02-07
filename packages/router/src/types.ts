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

export type GuardContext<TParams, TQueryParams> = {
  params: TParams;
  query: TQueryParams;
  signal: AbortSignal;
};

export type ProviderContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
  signal: AbortSignal;
};

export type RouteErrorType = 'guard' | 'provider' | 'timeout' | 'cancel';

export type RouteError = {
  type: RouteErrorType;
  message: string;
  route: UnknownRoute;
  cause?: Error;
};

export interface ExecutionOptions {
  // Retry options
  maxRetries?: number;
  retryDelay?: number;
  retryMode?: 'linear' | 'exponential';
  timeout?: number;
}

export type RouteType = (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];

export interface RouteOptions extends ExecutionOptions {
  // Keep the route's context when de-activating.
  keepAlive?: boolean;

  // Lifetime options
  maxAge?: number;
}

export type UnknownParams = ExtractParams<''>;
export type UnknownQueryParams = ExtractQueryParams<''>;
export type UnknownRoute = Route<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec, unknown>;
export type UnknownGuard = (
  ctx: GuardContext<TRec, TRec>
) => Promise<boolean | UnknownRedirect> | boolean | UnknownRedirect;
export type UnknownProvider = (ctx: ProviderContext<TRec, TRec, TRec>) => Promise<unknown> | unknown;
export type UnknownRedirect = Redirect<RoutePath, UnknownParams, UnknownQueryParams, RouteOptions, TRec>;

export type ActiveContext<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
};

export type RouterOptions = RouteOptions & {
  baseUrl?: string;
  cacheLimit?: number;
};

export type FlatRec<TParams> = {
  [K in keyof TParams]: TParams[K];
};

export type RouteState<TParams, TQueryParams, TData> = {
  active: boolean;
  context?: ActiveContext<FlatRec<TParams>, FlatRec<TQueryParams>, FlatRec<TData>>;
  error?: RouteError;
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

export type MatchedState = MatchedRoute & {
  query: TRec;
};

export type CachedMatch = {
  context: ProviderContext<TRec, TRec, TRec>;
  segments: UnknownRoute[];
  timestamp: number;
};
