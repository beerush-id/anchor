import { createObserver, mutable, retriable, type StateObserver, untrack } from '@anchorlib/core';
import { RouteCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import { getStore } from './store.js';
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

export type RouteStorage = {
  state: RouteState<unknown, unknown, unknown>;
  cache: RouteCache;
  dataCache: WeakMap<ProviderContext<TRec, TRec, TRec>, TRec>;
  activeResolvers: Map<ProviderContext<TRec, TRec, TRec>, AbortController>;
  guardObserver: StateObserver;
  providerObservers: WeakMap<UnknownProvider, ProviderObserver>;
};

/**
 * Represents a route in the router with support for guards, providers, and nested routes.
 *
 * Routes can be static, dynamic (with parameters), or wildcards.
 * They support authentication guards, data providers, and reactive state management.
 *
 * @template TPath - The route path type
 * @template TParams - The route parameters type
 * @template TQueryParams - The query parameters type
 * @template TOptions - The route options type
 * @template TData - The route data type
 * @template TParent - The parent route type
 *
 * @example
 * ```ts
 * const usersRoute = router.route('/users');
 * const userRoute = usersRoute.route('/:id');
 *
 * userRoute
 *   .guard(async ({ params }) => {
 *     if (!await isAuthenticated()) {
 *       throw redirect(loginRoute);
 *     }
 *   })
 *   .provide('user', async ({ params }) => {
 *     return await fetchUser(params.id);
 *   });
 * ```
 */
export class Route<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData,
  TParent = never,
> {
  /** The name of this route */
  public readonly name: RouteName<TPath>;
  /** The type of this route (static, dynamic, or wildcard) */
  public readonly type: RouteType;
  public readonly options: TOptions;

  /**
   * Sets whether this route is currently active.
   *
   * @param value - true if the route is active, false otherwise
   */
  public set active(value: boolean) {
    this.state.active = value;
  }

  /**
   * Gets whether this route is currently active.
   *
   * @returns true if the route is active, false otherwise
   */
  public get active(): boolean {
    return this.state.active;
  }

  /**
   * Gets the data loaded for this route.
   *
   * @returns The route data, or undefined if not loaded
   */
  public get data(): TData | undefined {
    return this.state.data;
  }

  /**
   * Sets the data for this route.
   *
   * @param value - The route data, or undefined to clear
   */
  public set data(value: TData | undefined) {
    this.state.data = value;
  }

  /**
   * Gets any error that occurred during route loading.
   *
   * @returns The route error, or undefined if no error
   */
  public get error(): RouteError | undefined {
    return this.state.error;
  }

  /**
   * Sets the error for this route.
   *
   * @param value - The route error, or undefined to clear
   */
  public set error(value: RouteError | undefined) {
    this.state.error = value;
  }

  /**
   * Sets the active context for this route.
   *
   * @param value - The active context, or undefined to clear
   */
  public set context(value: ActiveContext<TParams, TQueryParams, TData> | undefined,) {
    this.state.context = value;
  }

  /**
   * Gets the active context for this route.
   *
   * @returns The active context, or undefined if not active
   */
  public get context(): ActiveContext<TParams, TQueryParams, TData> | undefined {
    return this.state.context;
  }

  /**
   * Gets the query parameters for this route.
   *
   * @returns The query parameters, or undefined if not active
   */
  public get query(): TQueryParams | undefined {
    return this.state.context?.query;
  }

  /**
   * Gets the route parameters for this route.
   *
   * @returns The route parameters, or undefined if not active
   */
  public get params(): TParams | undefined {
    return this.state.context?.params;
  }

  /**
   * Gets the full path for this route, including parent paths.
   *
   * @returns The full route path
   */
  public get path(): RoutePathOutput<TParent, TPath> {
    const parent = this.parent as UnknownRoute;

    if (parent) {
      return [parent.path, this.name].join('/') as never;
    }

    return this.name as never;
  }

  /** Optional index route for this route */
  public index?: UnknownRoute;
  /** Set of guards for this route */
  public guards = new Set<UnknownGuard>();
  /** Map of data providers for this route */
  public providers = new Map<string, ProviderMap>();

  private get storage(): RouteStorage {
    const store = getStore();

    if (!store.has(this)) {
      store.set(this, {
        state: mutable({ active: false, authenticated: false }),
        cache: new RouteCache(this as UnknownRoute),
        dataCache: new WeakMap(),
        activeResolvers: new Map(),
        guardObserver: createObserver(() => {
          this.guardObserver.reset();
          this.authenticate((this.context ?? {}) as GuardContext<TParams, TQueryParams>, true);
        }),
        providerObservers: new WeakMap(),
      });
    }

    return store.get(this) as RouteStorage;
  }

  private get state(): RouteState<TParams, TQueryParams, TData> {
    return this.storage.state as RouteState<TParams, TQueryParams, TData>;
  }

  private get cache(): RouteCache {
    return this.storage.cache;
  }

  private get dataCache(): WeakMap<ProviderContext<TRec, TRec, TRec>, TData> {
    return this.storage.dataCache as WeakMap<ProviderContext<TRec, TRec, TRec>, TData>;
  }

  private get activeResolvers(): Map<ProviderContext<TRec, TRec, TRec>, AbortController> {
    return this.storage.activeResolvers as Map<ProviderContext<TRec, TRec, TRec>, AbortController>;
  }

  // Reactive observers.
  private get guardObserver(): StateObserver {
    return this.storage.guardObserver;
  }

  private get providerObservers(): WeakMap<UnknownProvider, ProviderObserver> {
    return this.storage.providerObservers as WeakMap<UnknownProvider, ProviderObserver>;
  }

  /**
   * Creates a new Route instance.
   *
   * @param name - The route path
   * @param options - Optional route options
   * @param parent - Optional parent route
   */
  public constructor(
    name: TPath,
    options?: RouteOptions,
    public parent?: TParent
  ) {
    this.name = (name ?? '').replace(/^\//, '').split(/\//g)[0] as RouteName<TPath>;
    this.type = this.name.startsWith(':')
      ? ROUTE_TYPE.DYNAMIC
      : this.name.startsWith('*')
        ? ROUTE_TYPE.WILDCARD
        : ROUTE_TYPE.STATIC;
    this.options = { ...DEFAULT_CONFIG, ...options } as TOptions;
  }

  /**
   * Generates a URL for this route with the given parameters and query.
   *
   * @param params - Optional route parameters
   * @param query - Optional query parameters
   * @returns The generated URL string
   *
   * @example
   * ```ts
   * const url = userRoute.url({ id: '123' }, { tab: 'profile' });
   * // Returns: '/users/123?tab=profile'
   * ```
   */
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

  /**
   * Creates a child route.
   *
   * If the path is '/', creates an index route and returns this route.
   * Otherwise, creates a new child route and returns it.
   *
   * @template TChildPath - The child route path type
   * @template TChildParams - The child route parameters type
   * @template TChildQueryParams - The child query parameters type
   * @template TChildOptions - The child route options type
   * @template TChildData - The child route data type
   * @param path - The child route path
   * @param options - Optional child route options
   * @returns This route if path is '/', otherwise the new child route
   *
   * @example
   * ```ts
   * const usersRoute = router.route('/users');
   * const userRoute = usersRoute.route('/:id');
   * const postsRoute = userRoute.route('/posts');
   * ```
   */
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
        RouteOptions & TOptions & TChildOptions,
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

  /**
   * Adds a guard to this route.
   *
   * Guards are run before the route is activated and can block navigation
   * by throwing an error or a Redirect.
   *
   * @template TGuard - The guard handler type
   * @param guard - The guard function to add
   * @returns This route for chaining
   *
   * @example
   * ```ts
   * route.guard(async ({ params }) => {
   *   if (!await isAuthenticated()) {
   *     throw redirect(loginRoute);
   *   }
   * });
   * ```
   */
  public guard<TGuard extends GuardHandler<TParams, TQueryParams>>(
    guard: TGuard
  ): Route<TPath, TParams, TQueryParams, TOptions, TData, TParent> {
    this.guards.add(guard as UnknownGuard);
    return this as never;
  }

  /**
   * Adds a data provider to this route.
   *
   * Providers are run when the route is activated and their data is
   * available in the route's context.
   *
   * @template TName - The provider name type
   * @template TProviderData - The provider data type
   * @param name - The name of the provider
   * @param provider - The provider function
   * @param options - Optional provider options
   * @returns This route for chaining
   *
   * @example
   * ```ts
   * route.provide('user', async ({ params }) => {
   *   return await fetchUser(params.id);
   * });
   * ```
   */
  public provide<TName extends string, TProviderData>(
    name: TName,
    provider: (context: ProviderContext<TParams, TQueryParams, TData>) => Promise<TProviderData> | TProviderData,
    options?: ProviderOptions
  ): Route<TPath, TParams, TQueryParams, TOptions, TData & { [PK in TName]: TProviderData }, TParent> {
    this.providers.set(name, { name, provider, options } as ProviderMap);
    return this as never;
  }

  /**
   * Runs all guards for this route.
   *
   * Guards are run inside an observer, so they will re-run when
   * reactive state they depend on changes.
   *
   * @param context - The guard context
   * @param force - Whether to force re-running the guards
   * @returns true if all guards pass, otherwise a GuardBlocker
   *
   * @example
   * ```ts
   * const result = await route.authenticate({ params: { id: '123' }, query: {} });
   * if (result !== true) {
   *   // Navigation was blocked
   * }
   * ```
   */
  public async authenticate(context: GuardContext<TParams, TQueryParams>, force = false): Promise<true | GuardBlocker> {
    if (this.state.authenticated && !force) return Promise.resolve(true);

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

  /**
   * Preloads data for this route without activating it.
   *
   * Runs authentication and resolves all providers.
   *
   * @param context - The provider context
   * @returns The loaded data, or a GuardBlocker if authentication failed
   *
   * @example
   * ```ts
   * await route.preload({ params: { id: '123' }, query: {}, data: {} });
   * ```
   */
  public async preload(context: ProviderContext<TParams, TQueryParams, TData>): Promise<TData | GuardBlocker> {
    const authenticated = await this.authenticate(context);
    if (authenticated !== true) return authenticated;

    return (await this.resolve(context as ProviderContext<TRec, TRec, TRec>)) as TData;
  }

  /**
   * Resolves all providers for this route.
   *
   * Providers are run inside observers, so they will re-run when
   * reactive state they depend on changes.
   *
   * @param context - The provider context
   * @returns The resolved data, or undefined if a provider failed
   *
   * @example
   * ```ts
   * const data = await route.resolve({ params: { id: '123' }, query: {}, data: {} });
   * ```
   */
  public async resolve(context: ProviderContext<TRec, TRec, TRec>): Promise<TData | undefined> {
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
                  async () => {
                    return await this.cache.resolve(provider, context, options);
                  },
                  { ...DEFAULT_CONFIG, ...this.options, ...options, controller: abortController }
                );

                if (abortController.signal.aborted) return;

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

      this.dataCache.set(context, data as TData);

      return data as TData;
    } finally {
      this.activeResolvers.delete(context);
    }
  }

  /**
   * Activates this route.
   *
   * Optionally preloads data, then sets the route as active.
   *
   * @param context - The provider context
   * @param preload - Whether to preload data (default: true)
   *
   * @example
   * ```ts
   * await route.activate({ params: { id: '123' }, query: {}, data: {} });
   * ```
   */
  public async activate(context: ProviderContext<TParams, TQueryParams, TData>, preload = true): Promise<void> {
    this.error = undefined;

    if (preload) {
      await this.preload(context);
    }

    this.data = this.dataCache.get(context as ProviderContext<TRec, TRec, TRec>);
    this.context = context as ActiveContext<TParams, TQueryParams, TData>;
    this.active = true;
  }

  /**
   * Deactivates this route.
   *
   * Clears data and context unless keepAlive is enabled.
   *
   * @example
   * ```ts
   * route.deactivate();
   * ```
   */
  public deactivate(): void {
    this.active = false;

    if (!this.options?.keepAlive) {
      this.data = undefined;
      this.error = undefined;
      this.context = undefined;
    }
  }

  /**
   * Cancels any pending provider resolutions.
   *
   * If a context is provided, only cancels that specific resolution.
   * Otherwise, cancels all pending resolutions.
   *
   * @param context - Optional context to cancel
   *
   * @example
   * ```ts
   * route.cancel(); // Cancel all
   * route.cancel(context); // Cancel specific
   * ```
   */
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
