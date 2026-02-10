import { createObserver, mutable, retriable, untrack } from '@anchorlib/core';
import { RouteCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import type {
  ActiveContext,
  ExtractParams,
  ExtractQueryParams,
  GuardBlocker,
  GuardContext,
  GuardHandler,
  ProviderContext,
  ProviderMap,
  ProviderObserver,
  ProviderOptions,
  RouteError,
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
  private readonly state: RouteState<TParams, TQueryParams, TData> = mutable({ active: false, authenticated: false });
  private readonly cache = new RouteCache(this);
  private readonly dataCache = new WeakMap<ProviderContext<TRec, TRec, TRec>, TData>();
  private readonly activeResolvers = new Map<ProviderContext<TRec, TRec, TRec>, AbortController>();

  // Reactive observers.
  private readonly guardObserver = createObserver(() => {
    this.guardObserver.reset();
    this.authenticate((this.context ?? {}) as GuardContext<TParams, TQueryParams>);
  });
  private readonly providerObservers = new WeakMap<UnknownProvider, ProviderObserver>();

  public readonly name: RouteName<TPath>;
  public readonly type: RouteType;

  public set active(value: boolean) {
    this.state.active = value;
  }

  public get active(): boolean {
    return this.state.active;
  }

  public get data(): TData | undefined {
    return this.state.data;
  }

  public set data(value: TData | undefined) {
    this.state.data = value;
  }

  public get error(): RouteError | undefined {
    return this.state.error;
  }

  public set error(value: RouteError | undefined) {
    this.state.error = value;
  }

  public set context(value: ActiveContext<TParams, TQueryParams, TData> | undefined,) {
    this.state.context = value;
  }

  public get context(): ActiveContext<TParams, TQueryParams, TData> | undefined {
    return this.state.context;
  }

  public get query(): TQueryParams | undefined {
    return this.state.context?.query;
  }

  public get params(): TParams | undefined {
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
  public providers = new Map<string, ProviderMap>();

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
    const child = new Route(path, { ...this.options, ...options }, this);

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

  public guard<TGuard extends GuardHandler<TParams, TQueryParams>>(
    guard: TGuard
  ): Route<TPath, TParams, TQueryParams, TOptions, TData, TParent> {
    this.guards.add(guard as UnknownGuard);
    return this as never;
  }

  public provide<TName extends string, TProviderData>(
    name: TName,
    provider: (context: ProviderContext<TParams, TQueryParams, TData>) => Promise<TProviderData> | TProviderData,
    options?: ProviderOptions
  ): Route<TPath, TParams, TQueryParams, TOptions, TData & { [PK in TName]: TProviderData }, TParent> {
    this.providers.set(name, { name, provider, options } as ProviderMap);
    return this as never;
  }

  public async authenticate(context: GuardContext<TParams, TQueryParams>): Promise<boolean | GuardBlocker> {
    if (this.state.authenticated) return Promise.resolve(true);

    // Run the guard inside an observer, so whenever the state it reads change,
    // the observer will be re-run.
    return await this.guardObserver.run(async () => {
      try {
        const guards = Array.from(this.guards);
        await Promise.all(Array.from(guards).map((guard) => guard(context)));

        this.state.authenticated = true;
      } catch (error) {
        this.state.authenticated = false;

        if (error instanceof Redirect) {
          return error;
        } else if (error instanceof Error) {
          this.error = {
            type: 'guard',
            cause: error,
            message: error.message,
          };

          return error;
        } else {
          const cause = new Error('Unknown guard error.');

          this.error = {
            type: 'guard',
            cause,
            message: cause.message,
          };

          return cause;
        }
      }

      return true;
    });
  }

  public async preload(context: ProviderContext<TParams, TQueryParams, TData>): Promise<TData | undefined> {
    const authenticated = await this.authenticate(context);
    if (authenticated !== true) return;

    return await this.resolve(context as ProviderContext<TRec, TRec, TRec>);
  }

  public async resolve(context: ProviderContext<TRec, TRec, TRec>): Promise<TData | undefined> {
    // Create abort controller for this resolution
    const abortController = new AbortController();
    this.activeResolvers.set(context, abortController);

    try {
      const data = mutable({} as TRec);

      for (const [name, { provider, options }] of this.providers) {
        if (!this.providerObservers.has(provider)) {
          const observer = createObserver(() => {
            observer.reset();
            resolver();
          });

          // Run the provider inside an observer, so whenever the state it reads change,
          // the observer will be re-run.
          const resolver = () => {
            return observer.run(async () => {
              try {
                const providerData = await retriable(
                  async (signal) => {
                    if (signal.aborted) return;

                    return await this.cache.resolve(provider, context, options);
                  },
                  { ...DEFAULT_CONFIG, ...this.options, ...options, controller: abortController }
                );

                if (!providerData) return;

                untrack(() => {
                  context.data[name] = data[name] = providerData;
                });

                return providerData;
              } catch (error) {
                if (error instanceof Error) {
                  this.error = {
                    type: 'provider',
                    cause: error,
                    message: error.message,
                  };
                  return;
                } else {
                  const cause = new Error('Unknown provider error.');
                  this.error = {
                    type: 'provider',
                    cause,
                    message: cause.message,
                  };
                  return;
                }
              }
            });
          };

          this.providerObservers.set(provider, { observer, resolver });
        }

        const { resolver } = this.providerObservers.get(provider)!;
        const result = await resolver();

        if (!result) return;
      }

      // Cache route data for this context
      this.dataCache.set(context, data as TData);

      return data as TData;
    } finally {
      // Clean up after resolution completes or is cancelled
      this.activeResolvers.delete(context);
    }
  }

  public async activate(context: ProviderContext<TParams, TQueryParams, TData>, preload = true): Promise<void> {
    this.error = undefined;

    if (preload) {
      await this.preload(context);
    }

    this.context = context as ActiveContext<TParams, TQueryParams, TData>;
    this.data = this.dataCache.get(context as ProviderContext<TRec, TRec, TRec>);
    this.active = true;
  }

  public deactivate(): void {
    this.active = false;

    if (!this.options?.keepAlive) {
      this.error = undefined;
      this.context = undefined;
    }
  }

  public cancel(context?: ProviderContext<TRec, TRec, TRec>): void {
    if (context) {
      const controller = this.activeResolvers.get(context);

      if (controller) {
        controller.abort('Resolution cancelled');
        this.activeResolvers.delete(context);
      }
    } else {
      for (const controller of this.activeResolvers.values()) {
        controller.abort('Resolution cancelled');
      }

      this.activeResolvers.clear();
    }
  }
}
