import { mutable } from '@anchorlib/core';
import { DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { RouteRegistry } from './registry.js';
import type {
  ActiveContext,
  ExtractParams,
  ExtractQueryParams,
  FlatRec,
  GuardContext,
  ProviderContext,
  RouteName,
  RouteOptions,
  RoutePath,
  RoutePathOutput,
  RouteState,
  RouteType,
  TRec,
  UnknownGuard,
  UnknownProvider,
  UnknownRoute,
} from './types.js';

export class Route<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData,
  TParent = never,
> {
  private readonly state: RouteState<TParams, TQueryParams, TData> = mutable({ active: false });

  public readonly name: RouteName<TPath>;
  public readonly type: RouteType;

  public set active(value: boolean) {
    this.state.active = value;
  }

  public get active(): boolean {
    return this.state.active;
  }

  public set context(value: ActiveContext<FlatRec<TParams>, FlatRec<TQueryParams>, FlatRec<TData>>) {
    this.state.context = value;
  }

  public get context(): ActiveContext<FlatRec<TParams>, FlatRec<TQueryParams>, FlatRec<TData>> | undefined {
    return this.state.context;
  }

  public get data(): FlatRec<TData> | undefined {
    return this.state.context?.data;
  }

  public get query(): FlatRec<TQueryParams> | undefined {
    return this.state.context?.query;
  }

  public get params(): FlatRec<TParams> | undefined {
    return this.state.context?.params;
  }

  public get path(): RoutePathOutput<TParent, TPath> {
    const parent = this.parent as UnknownRoute;

    if (parent) {
      return [parent.path, this.name].join('/') as never;
    }

    return this.name as never;
  }

  public index?: UnknownRoute;
  public guards = new Set<UnknownGuard>();
  public providers = new Map<string, UnknownProvider>();

  public constructor(
    name: TPath,
    public options?: RouteOptions,
    public parent?: TParent
  ) {
    this.name = (name.replace(/^\//, '').split(/\//g)[0] ?? '') as RouteName<TPath>;
    this.type = this.name.startsWith(':')
      ? ROUTE_TYPE.DYNAMIC
      : this.name.startsWith('*')
        ? ROUTE_TYPE.WILDCARD
        : ROUTE_TYPE.STATIC;
  }

  public url(params?: TParams, query?: TQueryParams) {
    let url = this.path as string;

    for (const [key, value] of Object.entries((params ?? {}) as TRec)) {
      url = url.replace(`:${key}`, value as string);
    }

    const queries = Object.entries((query ?? {}) as TRec);

    if (queries.length) {
      if (!url.endsWith('?')) url += '?';

      url += queries
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map((v) => `${key}=${v}`).join('&');
          }

          return `${key}=${value}`;
        })
        .join('&');
    }

    return url;
  }

  public route<
    TChildPath extends RoutePath,
    TChildParams extends ExtractParams<TChildPath>,
    TChildQueryParams extends ExtractQueryParams<TChildPath>,
    TChildOptions extends RouteOptions,
    TChildData,
  >(
    path: TChildPath,
    options?: TChildOptions
  ): TChildPath extends '/'
    ? this
    : Route<
        TChildPath,
        TParams & TChildParams,
        TQueryParams & TChildQueryParams,
        TOptions & TChildOptions,
        TData & TChildData,
        this
      > {
    const child = new Route(path, options, this);

    if (path === ('/' as TChildPath)) {
      this.index = child as UnknownRoute;
      return this as never;
    }

    const childMap = new RouteRegistry(child as UnknownRoute);
    const parentMap = ROUTE_MAP_LINK.get(this) as RouteRegistry;

    if (!parentMap) {
      throw new Error('RouteMap not found');
    }

    if (child.type === ROUTE_TYPE.STATIC) {
      parentMap.set(child.name, childMap);
    } else if (child.type === ROUTE_TYPE.DYNAMIC) {
      parentMap.set(DYNAMIC_ROUTE_KEY, childMap);
    } else if (child.type === ROUTE_TYPE.WILDCARD) {
      parentMap.set(WILDCARD_ROUTE_KEY, childMap);
    }

    return child as never;
  }

  public guard<TGuard extends (context: GuardContext<TParams, TQueryParams>) => boolean>(
    guard: TGuard
  ): Route<TPath, TParams, TQueryParams, TOptions, TData, TParent> {
    this.guards.add(guard as UnknownGuard);
    return this as never;
  }

  public provide<TName extends string, TProviderData>(
    name: TName,
    provider: (context: ProviderContext<TParams, TQueryParams>) => Promise<TProviderData> | TProviderData
  ): Route<TPath, TParams, TQueryParams, TOptions, TData & { [PK in TName]: TProviderData }, TParent> {
    this.providers.set(name, provider as UnknownProvider);
    return this as never;
  }
}
