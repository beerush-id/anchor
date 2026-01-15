export type TRec = Record<string, unknown>;
export type None = Record<string, never>;
export type Merged<Left, Right> = Left extends None
  ? Right
  : Right extends None
    ? Left
    : {
        [K in keyof Left]: Left[K];
      } & {
        [K in keyof Right]: Right[K];
      } & {};

export type StripTrailingSlash<T extends string> = T extends `${infer Path}?${infer QueryPart}`
  ? `${StripTrailingSlash<Path>}?${QueryPart}`
  : T extends '/'
    ? T
    : T extends `${infer Path}/`
      ? StripTrailingSlash<Path>
      : T;

export type AddTrailingSlash<T extends string> = T extends `${infer Path}?${infer QueryPart}`
  ? `${AddTrailingSlash<Path>}?${QueryPart}`
  : T extends '/'
    ? T
    : T extends `${string}/`
      ? T
      : `${T}/`;

export type NormalizePath<
  TPath extends string,
  TOption extends 'strip' | 'require' | 'ignore' | undefined = 'strip',
> = TOption extends undefined
  ? StripTrailingSlash<TPath>
  : TOption extends 'strip'
    ? StripTrailingSlash<TPath>
    : TOption extends 'require'
      ? AddTrailingSlash<TPath>
      : TPath;

export type ParamTypeMap = {
  null: null;
  string: string;
  number: number;
  boolean: boolean;

  array: unknown[];
  object: Record<string, unknown>;
};

export type ExtractPath<TPath extends string> = TPath extends `${infer Path}?${string}` ? Path : TPath;
export type ExtractRoutePath<TPath extends string, TOptions> = NormalizePath<
  TPath,
  TOptions extends { trailingSlash?: infer Slash }
    ? Slash extends 'strip' | 'require' | 'ignore'
      ? Slash
      : 'strip'
    : 'strip'
>;

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
    ? { [K in Param]: P extends keyof ParamTypeMap ? ParamTypeMap[P] : string }
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

export type ResolverContext<TParams, TQueryParams> = {
  params: TParams;
  query: TQueryParams;
  signal: AbortSignal;
};
export type GuardContext<TParams, TQueryParams> = ResolverContext<TParams, TQueryParams>;

export type Redirect<TRoute = unknown> = {
  to: TRoute | string;
  params?: Record<string, string>;
  query?: Record<string, string>;
};

export type OpenGraphMeta = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
};

export type TwitterMeta = {
  card?: 'summary' | 'summary_large_image';
  title?: string;
  image?: string;
};

export type RouteMeta = {
  title?: string;
  description?: string;
  og?: OpenGraphMeta;
  twitter?: TwitterMeta;
  jsonLd?: object;
  custom?: Record<string, unknown>;
};

export type ResolveOptions<TParams, TQueryParams> = {
  key?: string | ((params: TParams, query: TQueryParams) => string);
  stale?: boolean;
  maxAge?: number;
  dedupe?: boolean;
};

export type TrailingSlashMode = 'strip' | 'require' | 'ignore';

export interface RouteOptions<TParams, TQueryParams> {
  exact?: boolean;
  baseUrl?: string;
  redirect?: Redirect | ((params: TParams, query: TQueryParams) => Redirect);
  trailingSlash?: TrailingSlashMode;
}

export type RouteType = 'static' | 'param' | 'wildcard';
export type RouteSegment = {
  path: string;
  type: RouteType;
  name?: string;
};

export type UrlBuilder<TParams, TQueryParams> = TParams extends None
  ? TQueryParams extends None
    ? () => URL
    : (params: None, query: TQueryParams) => URL
  : TQueryParams extends None
    ? (params: TParams) => URL
    : (params: TParams, query: TQueryParams) => URL;

export type RouteDefinition<TPath extends string, TOptions> = {
  readonly type: RouteType;
  readonly name: TPath;
  readonly path: ExtractPath<TPath>;
  readonly options: TOptions;
  readonly segments: RouteSegment[];
  readonly children: Map<string, Route<string, TRec, TRec, RouteOptions<TRec, TRec>, TRec>>;
};

export type Route<TPath extends string, TParams, TQueryParams, TOptions, TData> = UrlBuilder<TParams, TQueryParams> &
  RouteDefinition<TPath, TOptions> & {
    route: ChildRouteBuilder<TPath, TParams, TQueryParams, TOptions>;

    meta(
      builder: (data: TData, params: TParams, query: TQueryParams) => RouteMeta
    ): Route<TPath, TParams, TQueryParams, TOptions, TData>;
    guard(
      guard: (ctx: GuardContext<TParams, TQueryParams>) => boolean | Redirect | Promise<boolean | Redirect>
    ): Route<TPath, TParams, TQueryParams, TOptions, TData>;
    resolve<R>(
      resolver: (ctx: ResolverContext<TParams, TQueryParams>) => R | Promise<R>,
      options?: ResolveOptions<TParams, TQueryParams>
    ): Route<TPath, TParams, TQueryParams, TOptions, R>;
  };

export interface RouteBuilder {
  <
    TPath extends string,
    TParams extends ExtractParams<TPath> = ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath> = ExtractQueryParams<TPath>,
  >(
    path: TPath
  ): Route<NormalizePath<TPath>, TParams, TQueryParams, None, never>;

  <
    TPath extends string,
    TParams extends ExtractParams<TPath> = ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath> = ExtractQueryParams<TPath>,
    TOptions extends RouteOptions<TParams, TQueryParams> = RouteOptions<TParams, TQueryParams>,
  >(
    path: TPath,
    options: TOptions
  ): Route<ExtractRoutePath<TPath, TOptions>, TParams, TQueryParams, TOptions, never>;
}

export interface ChildRouteBuilder<ParentPath extends string, ParentParams, ParentQueryParams, ParentOptions> {
  <
    TPath extends string,
    TParams extends ExtractParams<TPath> = ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath> = ExtractQueryParams<TPath>,
  >(
    path: TPath
  ): Route<
    NormalizePath<`${ParentPath extends '/' ? '' : ParentPath}${TPath}`>,
    Merged<ParentParams, TParams>,
    Merged<ParentQueryParams, TQueryParams>,
    TRec,
    never
  >;

  <
    TPath extends string,
    TParams extends ExtractParams<TPath> = ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath> = ExtractQueryParams<TPath>,
    TOptions extends RouteOptions<ParentOptions & TParams, Merged<ParentQueryParams, TQueryParams>> = ParentOptions &
      RouteOptions<ParentOptions & TParams, Merged<ParentQueryParams, TQueryParams>>,
  >(
    path: TPath,
    options: TOptions
  ): Route<
    ExtractRoutePath<`${ParentPath extends '/' ? '' : ParentPath}${TPath}`, Merged<ParentOptions, TOptions>>,
    Merged<ParentParams, TParams>,
    Merged<ParentQueryParams, TQueryParams>,
    Merged<ParentOptions, TOptions>,
    never
  >;
}
