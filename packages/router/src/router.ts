import { anchor, mutable } from '@anchorlib/core';
import type { ProvidedContext } from 'vitest';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, INDEX_ROUTE_KEY, METHOD_MAP, WILDCARD_ROUTE_KEY } from './constant.js';
import { MATCH_MODE, PRELOAD_MODE, ROUTE_TYPE, TRAILING_SLASH_MODE } from './enum.js';
import type {
  ExtractParams,
  ExtractQueryParams,
  GuardContext,
  None,
  RouteBuilder,
  RouteOptions,
  RouteType,
  TRec,
  UrlBuilder,
} from './types.js';

export type UnknownParams = ExtractParams<''>;
export type UnknownQueryParams = ExtractQueryParams<''>;
export type UnknownRoute = Route<RoutePathInput, UnknownParams, UnknownQueryParams, RouteOptions, TRec, unknown>;
export type UnknownGuard = (ctx: GuardContext<TRec, TRec>) => Promise<boolean> | boolean;
export type UnknownProvider = (ctx: ProvidedContext) => Promise<unknown> | unknown;
export type Registry = Map<string | symbol, UnknownRoute | Registry>;

export type RouterState = {
  url?: string;
  params?: TRec;
  query?: TRec;
  segments?: string[];
  activeRoute?: UnknownRoute;
  activeSegments?: UnknownRoute[];
};

export type RouterOptions = RouteOptions & {
  baseUrl?: string;
};

export class Router {
  public state = mutable<RouterState>({});
  public routes: Registry = new Map();
  public rootRoute = new Route('/');

  public options: RouterOptions;

  public get activeUrl() {
    return this.state.url;
  }

  public set activeUrl(value: string | undefined) {
    if (typeof value === 'string') {
      const url = new URL(value);
      this.state.url = [url.pathname, url.search].filter(Boolean).join('');
    } else {
      anchor.remove(this.state, 'url', 'activeSegments', 'query', 'params');
    }
  }

  constructor(options?: RouterOptions) {
    this.options = {
      match: MATCH_MODE.FOLLOW,
      preload: PRELOAD_MODE.FOLLOW,
      baseUrl: DEFAULT_CONFIG.baseUrl,
      trailingSlash: TRAILING_SLASH_MODE.STRIP,
      ...options,
    };
  }

  public route<
    TPath extends RoutePathInput,
    TParams extends ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath>,
  >(path: TPath, options?: RouteOptions): Route<TPath, TParams, TQueryParams, RouteOptions, TRec> {
    return undefined as never;
  }

  private async activate<TContext extends GuardContext<TRec, TRec>>(url: string, ctx?: TContext) {
    const parsedUrl = new URL(url, this.options.baseUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const search = parsedUrl.search.replace(/^\?/, '');
    const href = [pathname, search].filter(Boolean).join('?');

    const query: TRec = { ...ctx?.query };
    const params: TRec = { ...ctx?.params };

    parsedUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const segments = pathname.split(/\//g);
    const activeSegments = segments.reduce((acc, segment) => {
      const parent = acc[acc.length - 1] ?? this.rootRoute;
      const siblings = parent.children;

      const current = (siblings.get(segment) ??
        (siblings.get(DYNAMIC_ROUTE_KEY) as Registry)?.get(segment) ??
        (siblings.get(WILDCARD_ROUTE_KEY) as Registry)?.get(segment)) as UnknownRoute;

      if (current) {
        if (current.type === ROUTE_TYPE.DYNAMIC) {
          params[current.name] = segment;
        }

        acc.push(current);
      }

      return acc;
    }, [] as UnknownRoute[]);

    const lastRoute = activeSegments[activeSegments.length - 1];
    if (!lastRoute) {
      anchor.remove(this.state, 'activeRoute', 'activeSegments', 'query', 'params');
      return;
    }
    const activeRoute = (lastRoute.children.get(INDEX_ROUTE_KEY) as UnknownRoute) ?? lastRoute;

    anchor.assign(this.state, {
      url: href,
      query,
      params,
      segments,
      activeRoute,
      activeSegments,
    });
  }
}

export type RouteState<TParams, TQueryParams, TData> = {
  data: TData;
  query: TQueryParams;
  params: TParams;
  active: boolean;
};

export type RoutePathInput = `${'/'}${string | never}`;
export type CleanPath<P extends RoutePathInput> = P extends '/'
  ? ''
  : P extends `/${infer Out}`
    ? Out extends `:${infer Param}`
      ? Param
      : Out
    : P;
export type CleanSlash<P> = P extends '/' ? P : P extends `/${infer Out}` ? Out : P;

export type MergedPath<L extends RoutePathInput, R extends RoutePathInput> = L extends '/'
  ? `/${CleanSlash<R>}`
  : R extends '/'
    ? `/${CleanSlash<L>}`
    : `/${CleanSlash<L>}/${CleanSlash<R>}`;

export type MergedParams<TLeft, TRight> = TLeft extends None
  ? TRight extends None
    ? TRec
    : {
        [K in keyof TRight]: TRight[K];
      }
  : TRight extends None
    ? {
        [K in keyof TLeft]: TLeft[K];
      }
    : {
        [K in keyof (TLeft & TRight)]: (TLeft & TRight)[K];
      };

export type RoutePathOutput<TParent, TPath extends RoutePathInput> = TParent extends Route<
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

export class Route<
  TPath extends RoutePathInput,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData,
  TParent = never,
> {
  public readonly name: CleanPath<TPath>;
  public readonly type: RouteType;
  public readonly method: string;

  public get data(): TData {
    return this.state.data;
  }

  public get query(): TQueryParams {
    return this.state.query;
  }

  public get params(): TParams {
    return this.state.params;
  }

  public set active(value: boolean) {
    this.state.active = value;
  }

  public get active(): boolean {
    return this.state.active;
  }

  public state: RouteState<TParams, TQueryParams, TData> = mutable({
    data: {},
    query: {},
    params: {},
    active: false,
  } as never);

  public get path(): RoutePathOutput<TParent, TPath> {
    const parent = this.parentRoute;

    if (parent) {
      return [parent.path, this.name].join('/') as never;
    }

    return this.name as never;
  }

  public children: Registry = new Map();

  private get parentRoute() {
    return this.parent as Route<RoutePathInput, UnknownParams, UnknownQueryParams, RouteOptions, TRec, never>;
  }

  public guards = new Set<UnknownGuard>();
  public providers = new Map<string, UnknownProvider>();

  public constructor(
    name: TPath,
    public options?: RouteOptions,
    public parent?: TParent
  ) {
    this.name = (name.replace(/^\//, '').split(/\//g)[0] ?? '') as CleanPath<TPath>;
    this.type =
      this.name === ''
        ? ROUTE_TYPE.INDEX
        : this.name.startsWith(':')
          ? ROUTE_TYPE.DYNAMIC
          : this.name.startsWith('*')
            ? ROUTE_TYPE.DYNAMIC
            : ROUTE_TYPE.STATIC;
    this.method = (options?.method ?? 'get').toLowerCase();

    if (!METHOD_MAP[this.method]) {
      METHOD_MAP[this.method] = Symbol(this.method);
    }
  }

  public url(params: TParams, query: TQueryParams) {
    let url = this.path as string;

    for (const [key, value] of Object.entries(params as TRec)) {
      url = url.replace(`:${key}`, value as string);
    }

    const queries = Object.entries(query as TRec);

    if (queries.length) {
      if (!url.endsWith('?')) url += '?';

      url += queries.map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((v) => `${key}=${v}`).join('&');
        }

        return `${key}=${value}`;
      });
    }

    return url;
  }

  public route<
    TChildPath extends RoutePathInput,
    TChildParams extends ExtractParams<TChildPath>,
    TChildQueryParams extends ExtractQueryParams<TChildPath>,
    TChildOptions extends RouteOptions,
    TChildData,
  >(
    path: TChildPath,
    options?: TChildOptions
  ): Route<
    TChildPath,
    TParams & TChildParams,
    TQueryParams & TChildQueryParams,
    TOptions & TChildOptions,
    TData & TChildData,
    this
  > {
    const child = new Route(path, options, this);
    const childMethod = METHOD_MAP[child.method];

    if (child.method !== 'get') {
      if (!this.children.has(childMethod)) {
        this.children.set(childMethod, new Map());
      }
    }

    const registry = child.method === 'get' ? this.children : (this.children.get(childMethod) as Registry);

    if (child.type === ROUTE_TYPE.INDEX) {
      registry.set(INDEX_ROUTE_KEY, child as UnknownRoute);
    } else if (child.type === ROUTE_TYPE.DYNAMIC) {
      registry.set(DYNAMIC_ROUTE_KEY, child as UnknownRoute);
    } else if (child.type === ROUTE_TYPE.STATIC) {
      registry.set(child.name, child as UnknownRoute);
    } else if (child.type === ROUTE_TYPE.WILDCARD) {
      registry.set(WILDCARD_ROUTE_KEY, child as UnknownRoute);
    }

    return child as Route<
      TChildPath,
      TParams & TChildParams,
      TQueryParams & TChildQueryParams,
      TOptions & TChildOptions,
      TData & TChildData,
      this
    >;
  }

  public guard<TGuard extends (context: GuardContext<TParams, TQueryParams>) => boolean>(
    guard: TGuard
  ): Route<TPath, TParams, TQueryParams, TOptions, TData, TParent> {
    this.guards.add(guard as UnknownGuard);
    return this as never;
  }

  public provide<TName extends string, TProviderData>(
    name: TName,
    provider: (context: ProvidedContext) => Promise<TProviderData> | TProviderData
  ): Route<TPath, TParams, TQueryParams, TOptions, TData & { [PK in TName]: TProviderData }, TParent> {
    this.providers.set(name, provider as UnknownProvider);
    return this as never;
  }
}

export function createRouter(): RouteBuilder {
  const createRoute = <TPath extends string, TParams, TQueryParams>(
    path: TPath,
    options: RouteOptions,
    parent?: Route<RoutePathInput, UnknownParams, UnknownQueryParams, RouteOptions, TRec, never>
  ) => {
    const urlBuilder = ((params, query) => {
      // Placeholder.
    }) as UrlBuilder<TRec, TRec>;

    return urlBuilder;
  };

  return createRoute as RouteBuilder;
}

export const route = createRouter();

const root = new Route('/');
console.log(root.name, root.path, root.state.params, root.state.data);

const users = root
  .route('/users')
  .guard(() => true)
  .provide('users', () => [] as Array<{ id: string }>);
console.log(users.name, users.path, users.state.params, users.state.data);

const profile = users.route('/:user_id');
console.log(profile.name, profile.path, profile.state.params, profile.state.data);

const organizations = root
  .route('/organizations')
  .guard(() => true)
  .provide('organizations', () => [] as Array<{ id: string }>);
console.log(organizations.name, organizations.path, organizations.state.params, organizations.state.data);

const organizationProfile = organizations.route('/:organization_id');
console.log(
  organizationProfile.name,
  organizationProfile.path,
  organizationProfile.state.params,
  organizationProfile.state.data
);

const orgSetting = organizationProfile.route('/settings');
console.log(orgSetting.name, orgSetting.path, orgSetting.state.params, orgSetting.state.data);
