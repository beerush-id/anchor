import { $do, type AnyType, awaited, createObserver, retriable, safeRun } from '@airlib/core';
import { RouteCache, type RouteCacheSnapshot } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import { ERROR_TYPE, ROUTE_STATUS, ROUTE_TYPE } from './enum.js';
import { GuardError, ProviderError, RouteError } from './error.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import type { Router } from './router.js';
import { generateSitemap } from './sitemap.js';
import { createState, getStore, safeRead } from './store.js';
import type {
  AnyRoute,
  ExtractParams,
  ExtractQueryParams,
  GuardBlocker,
  GuardContext,
  GuardHandler,
  MergedProvidersOut,
  NestedParams,
  NestedQueryParams,
  None,
  ProviderMap,
  ProviderOptions,
  ProviderResolver,
  ProviderResolverMap,
  ProviderResolvers,
  ProviderResolversOut,
  RouteContext,
  RouteEntry,
  RouteExceptionRenderer,
  RouteIndexRenderer,
  RouteMeta,
  RouteName,
  RouteOptions,
  RoutePath,
  RoutePathOutput,
  RouteRenderer,
  RouteRenderProps,
  RouteState,
  RouteStorage,
  RouteType,
  SitemapConfig,
  TRec,
  UnknownGuard,
  UnknownRoute,
} from './types.js';

export type IndexRoute<
  Path extends RoutePath,
  Params extends ExtractParams<Path>,
  QueryParams extends ExtractQueryParams<Path>,
  Data extends TRec = TRec,
  Parent = never,
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  Output = any,
  PParams = Params,
  PQueryParams = QueryParams,
  PData = Data,
> = Omit<Route<Path, Params, QueryParams, Data, Parent, Output, PParams, PQueryParams, PData>, 'route' | 'renderer'> & {
  renderer: RouteIndexRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>;
};

/**
 * Represents a route in the router with support for guards, providers, and nested routes.
 *
 * Routes can be static, dynamic (with parameters), or wildcards.
 * They support authentication guards, data providers, and reactive state management.
 *
 * @template Path - The route path type
 * @template Params - The route parameters type
 * @template QueryParams - The query parameters type
 * @template TOptions - The route options type
 * @template Data - The route data type
 * @template Parent - The parent route type
 */
export class Route<
  Path extends RoutePath,
  Params extends ExtractParams<Path>,
  QueryParams extends ExtractQueryParams<Path>,
  Data extends TRec = TRec,
  Parent = never,
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  Output = any,
  PParams = Params,
  PQueryParams = QueryParams,
  PData = Data,
> {
  #meta: RouteMeta = {};

  /** The name of this route */
  public readonly name: RouteName<Path>;
  /** The type of this route (static, dynamic, or wildcard) */
  public readonly type: RouteType;
  public readonly options: RouteOptions<Path, Params, QueryParams>;
  public closed = false;
  public target?: AnyRoute;

  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  private loadRenderer?: () => Promise<RouteRenderer<any, any, any, any, any, any, any, any>>;
  private rendererState = createState<
    RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output> | unknown
  >(undefined);
  private exceptionRendererState = createState<
    RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output> | undefined
  >(undefined);

  public get renderer():
    | RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output>
    | undefined {
    return this.rendererState.value as RouteRenderer<
      Path,
      Params,
      QueryParams,
      Data,
      PParams,
      PQueryParams,
      PData,
      Output
    >;
  }

  public get exceptionRenderer():
    | RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>
    | undefined {
    const renderer = this.exceptionRendererState.value ?? (this.parent as unknown as this)?.exceptionRenderer;
    return (renderer ?? this.router.exceptionRenderer) as RouteExceptionRenderer<
      Params,
      QueryParams,
      Data,
      PParams,
      PQueryParams,
      PData,
      Output
    >;
  }

  /**
   * Gets the metadata for this route.
   * @returns {RouteMeta}
   */
  public get metadata(): RouteMeta {
    return this.#meta;
  }

  /**
   * Sets whether this route is currently active.
   *
   * @param value - true if the route is active, false otherwise
   */
  public set active(value: boolean) {
    safeRead(() => (this.state.active = value));
  }

  /**
   * Gets whether this route is currently active.
   *
   * @returns true if the route is active, false otherwise
   */
  public get active(): boolean {
    return this.storage.state.active;
  }

  /**
   * Gets the exception for this route.
   * @returns {RouteError | undefined}
   */
  public get exception(): RouteError | undefined {
    return this.storage.context.value.exception;
  }

  /**
   * Gets the full path for this route, including parent paths.
   *
   * @returns The full route path
   */
  public get path(): RoutePathOutput<Parent, Path> {
    const parent = this.parent as UnknownRoute;

    if (parent) {
      const parentPath = parent.path;
      return [parentPath === '/' ? '' : parentPath, this.name].join('/') as never;
    }

    return `/${this.name}` as never;
  }

  public queryKeys = new Set<string>();

  /** Optional index route for this route */
  public index?: IndexRoute<Path, Params, QueryParams, Data, this, Output>;
  /** Set of guards for this route */
  public guards = new Set<UnknownGuard>();
  /** Map of data providers for this route */
  public providers = new Map<string, ProviderMap>();
  public resolvers = new Set<ProviderResolverMap>();

  public get state(): RouteState {
    return this.storage.state;
  }

  public get context(): RouteContext<Params, QueryParams, Data> {
    return this.storage.context.value as RouteContext<Params, QueryParams, Data>;
  }

  public get params(): Params {
    return this.storage.context.value.params as Params;
  }

  public get query(): QueryParams {
    return this.storage.context.value.query as QueryParams;
  }

  public get data(): Data {
    return this.storage.context.value.data as Data;
  }

  public get children(): RouteRegistry | undefined {
    return ROUTE_MAP_LINK.get(this);
  }

  public get isIndex(): boolean {
    return this.closed;
  }

  public get authenticated() {
    return this.state.authenticated;
  }

  public get storage(): RouteStorage {
    const store = getStore();

    if (!store.has(this)) {
      safeRead(() => {
        store.set(this, {
          state: createState<RouteState>({
            status: ROUTE_STATUS.IDLE,
            active: false,
            resolved: false,
            resolving: new Set(),
            authenticated: false,
            authenticating: false,
          }),
          cache: new RouteCache(this as never),
          context: createState({ value: { data: {}, query: {}, params: {} } }),
          guardObservers: new WeakMap(),
          activeControllers: new Map(),
          providerObservers: new WeakMap(),
        });
      });
    }

    return store.get(this) as RouteStorage;
  }

  /**
   * Creates a new Route instance.
   *
   * @param router - The router instance
   * @param name - The route path
   * @param options - Optional route options
   * @param parent - Optional parent route
   * @param displayName - Optional display name for the route
   */
  public constructor(
    public router: Router<Output>,
    name: Path,
    options?: RouteOptions<Path, Params, QueryParams>,
    public parent?: Parent,
    public displayName?: string
  ) {
    const [path] = (name ?? '').split(/\?/);
    this.name = path.replace(/^\//, '').split(/\//g)[0] as RouteName<Path>;
    this.type = this.name.startsWith(':')
      ? ROUTE_TYPE.DYNAMIC
      : this.name.startsWith('*')
        ? ROUTE_TYPE.WILDCARD
        : ROUTE_TYPE.STATIC;
    this.options = { ...DEFAULT_CONFIG, ...router?.options, ...options } as RouteOptions;

    const url = new URL(name, DEFAULT_CONFIG.baseUrl);
    for (const [key] of url.searchParams) {
      this.queryKeys.add(key);
    }
  }

  /**
   * Updates the configuration options for this route.
   * Useful for configuring generated routes (e.g. meta, cache).
   *
   * @param options - Partial route options to merge
   * @returns This route instance for chaining
   */
  public config(options: Partial<RouteOptions<Path, Params, QueryParams>>): this {
    Object.assign(this.options, { ...options });
    return this;
  }

  /**
   * Reads the live metadata object attached to this route.
   *
   * The returned object is the route's own meta storage — it reflects
   * later merges (no snapshot), so manifests and menus always read current values.
   *
   * @returns The current metadata object.
   */
  public meta(): RouteMeta;

  /**
   * Merges partial metadata into this route's meta storage.
   *
   * Keys are typed via the app-augmented {@link RouteMeta} interface.
   * Overwriting an existing key logs a warning during development.
   *
   * @param partial - The metadata keys to merge.
   * @returns This route for chaining.
   */
  public meta(partial: RouteMeta): this;
  public meta(partial?: RouteMeta): RouteMeta | this {
    if (typeof partial === 'undefined') return this.#meta;
    Object.assign(this.#meta, partial);
    return this;
  }

  /**
   * Generates a URL for this route with the given parameters and query.
   *
   * @param params - Optional route parameters
   * @param query - Optional query parameters
   * @returns The generated URL string
   */
  public url(params?: Params, query?: QueryParams) {
    let url = this.path as string;

    for (const [key, value] of Object.entries((params ?? {}) as TRec)) {
      if (key.startsWith('*')) {
        url = url.replace(key, value as string);
      } else if (url.includes(`*${key}`)) {
        url = url.replace(`*${key}`, value as string);
      } else {
        url = url.replace(`:${key}`, value as string);
      }
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
   * Gets all route entries starting from this route and its children.
   *
   * @returns An array of [path, { type, isIndex, route, toString }] tuples
   */
  public entries(): RouteEntry[] {
    const results: RouteEntry[] = [];
    const registry = ROUTE_MAP_LINK.get(this as never as UnknownRoute);

    const collect = (reg: RouteRegistry) => {
      results.push(createRouteEntry(reg.route, false));
      if (reg.route.index) {
        results.push(createRouteEntry(reg.route.index as never as UnknownRoute, true));
      }
      for (const childReg of reg.values()) {
        collect(childReg);
      }
    };

    if (registry) {
      collect(registry);
    } else {
      const isIndex = Boolean(this.parent && (this.parent as never as UnknownRoute).index === (this as unknown));
      results.push(createRouteEntry(this as never as UnknownRoute, isIndex));
    }

    return results;
  }

  /**
   * Generates an XML sitemap for this route and its children.
   *
   * @param config - Optional sitemap configuration
   * @returns The generated XML sitemap string
   */
  public async sitemap(config?: SitemapConfig): Promise<string> {
    let filteredConfig = config;
    if (config?.exclude?.length) {
      const exclude = config.exclude.filter((ex) => {
        let curr: UnknownRoute | undefined = this as unknown as UnknownRoute;
        while (curr) {
          if (curr === ex) return false;
          curr = curr.parent;
        }
        return true;
      });
      filteredConfig = { ...config, exclude };
    }
    return generateSitemap(this.entries(), filteredConfig, this.router?.options?.baseUrl);
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
   */
  public route<
    TChildPath extends RoutePath,
    TChildParams extends ExtractParams<TChildPath>,
    TChildQueryParams extends ExtractQueryParams<TChildPath>,
    TChildData extends TRec = TRec,
  >(
    path: TChildPath,
    options?: RouteOptions<TChildPath, TChildParams, TChildQueryParams>
  ): TChildPath extends '/'
    ? IndexRoute<
        TChildPath,
        TChildParams,
        TChildQueryParams,
        TChildData,
        this,
        Output,
        NestedParams<Params, TChildParams>,
        NestedQueryParams<QueryParams, TChildQueryParams>,
        Data & TChildData
      >
    : Route<
        TChildPath,
        TChildParams,
        TChildQueryParams,
        TChildData,
        this,
        Output,
        NestedParams<Params, TChildParams>,
        NestedQueryParams<QueryParams, TChildQueryParams>,
        Data & TChildData
      > {
    if (this.closed) throw new RouteError(ERROR_TYPE.ROUTE, `Index route can't have a child route.`);
    const child = new Route(
      this.router,
      path,
      { ...this.options, ...options } as RouteOptions<TChildPath, TChildParams, TChildQueryParams>,
      this,
      path
    );

    const [pathname] = path.split(/\?/);
    if (pathname === ('/' as TChildPath)) {
      child.closed = true;
      this.index = child as never as IndexRoute<Path, Params, QueryParams, Data, this, Output>;
      return child as never;
    }

    const childMap = new RouteRegistry(child as never as UnknownRoute);
    const parentMap = ROUTE_MAP_LINK.get(this) as RouteRegistry;

    if (!parentMap) {
      throw new RouteError(ERROR_TYPE.ROUTE, 'RouteMap not found');
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
   */
  public guard<TGuard extends GuardHandler<Params, QueryParams>>(
    guard: TGuard
  ): Route<Path, Params, QueryParams, Data, Parent> {
    this.guards.add(guard as UnknownGuard);
    return this as never;
  }

  /**
   * Adds parallel data providers to this route.
   * The data providers are run in parallel and their data
   * is available in the route's context.
   *
   * @template Name - The provider name type
   * @template ProviderData - The provider data type
   * @param providers - An array of provider definitions [name, resolver, options]
   * @param options - Optional provider options
   * @returns This route for chaining with updated data types
   */
  public provide<P extends ProviderResolvers<Params, QueryParams, Data>>(
    providers: P,
    options?: ProviderOptions
  ): Route<Path, Params, QueryParams, Data & ProviderResolversOut<P>, Parent>;

  /**
   * Adds a data provider to this route.
   *
   * Providers are run when the route is activated and their data is
   * available in the route's context.
   *
   * @template Name - The provider name type
   * @template ProviderData - The provider data type
   * @param name - The name of the provider
   * @param provider - The provider function
   * @param options - Optional provider options
   * @returns This route for chaining
   */
  public provide<Name extends string, ProviderData>(
    name: Name,
    provider: ProviderResolver<ProviderData, Params, QueryParams, Data>,
    options?: ProviderOptions
  ): Route<Path, Params, QueryParams, MergedProvidersOut<Data, { [PK in Name]: ProviderData }>, Parent>;

  public provide<Name extends string, ProviderData>(
    // biome-ignore lint/suspicious/noExplicitAny: Expect any.
    nameOrProviders: any,
    // biome-ignore lint/suspicious/noExplicitAny: Expect any.
    providerOrOptions?: any,
    options?: ProviderOptions
  ): Route<Path, Params, QueryParams, MergedProvidersOut<Data, { [PK in Name]: ProviderData }>, Parent> {
    if (typeof nameOrProviders === 'object' && nameOrProviders !== null) {
      const resolvers = {} as ProviderResolverMap;

      Object.entries(nameOrProviders).forEach(([name, provider]) => {
        resolvers[name] = {
          handler: provider as never,
          options,
        };

        this.providers.set(name, {
          name,
          provider,
          options: providerOrOptions,
        } as ProviderMap);
      });

      this.resolvers.add(resolvers);
      return this as never;
    }

    this.resolvers.add({
      [nameOrProviders]: {
        handler: providerOrOptions,
        options,
      },
    });

    this.providers.set(nameOrProviders, {
      name: nameOrProviders,
      provider: providerOrOptions,
      options,
    } as ProviderMap);

    return this as never;
  }

  /**
   * Rewrites this route to a different route.
   *
   * @param route - The route to rewrite to
   * @returns This route for chaining
   */
  public rewrite<T extends AnyRoute>(route: T) {
    this.target = route;
    return this;
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
   */
  public async authenticate(context: GuardContext<Params, QueryParams>, force = false): Promise<true | GuardBlocker> {
    const { state, guardObservers } = this.storage;

    if (state.authenticated && !force) return Promise.resolve(true);
    state.authenticating = true;

    try {
      const authentications = Array.from(this.guards).map((guard) => {
        if (!guardObservers.has(guard)) {
          const observer = createObserver(() => {
            this.router.start(1);

            // observer.reset();
            authenticator();
          });

          const authenticator = () => {
            // Run the guard inside an observer, so whenever the state it reads change,
            // the observer will be re-run.
            return observer.runAsync(async () => {
              try {
                this.router.progress(0.5);
                return await guard(context);
              } finally {
                this.router.progress(0.5);
              }
            });
          };

          guardObservers.set(guard, { authenticator, observer });
        }

        const authenticate = guardObservers.get(guard)!.authenticator!;
        return authenticate();
      });
      await Promise.all(authentications);

      state.authenticated = true;
    } catch (error) {
      state.status = ROUTE_STATUS.ERROR;
      state.authenticated = false;

      if (error instanceof Redirect) {
        return error;
      } else if (error instanceof Error) {
        state.error = error instanceof GuardError ? error : new GuardError(error.message, error);
        return state.error;
      } else {
        state.error = new GuardError('Unknown guard error.', error as Error);
        return state.error;
      }
    } finally {
      state.authenticating = false;
    }

    return true;
  }

  /**
   * Preloads data for this route without activating it.
   *
   * Runs authentication and resolves all providers.
   *
   * @param context - The provider context
   * @param hydration - Whether this is a hydration request
   * @param controller - An optional abort controller
   * @returns The loaded data, or a GuardBlocker if authentication failed
   */
  public async preload(
    context: RouteContext<Params, QueryParams, Data>,
    hydration?: boolean,
    controller?: AbortController
  ): Promise<Data | GuardBlocker> {
    void this.ensureRenderer();
    const authenticated = await this.authenticate(context);
    if (authenticated !== true) return authenticated;
    return (await this.resolve(context as RouteContext<TRec, TRec, TRec>, hydration, controller)) as Data;
  }

  /**
   * Resolves all providers for this route.
   *
   * Providers are run inside observers, so they will re-run when
   * reactive state they depend on changes.
   *
   * @param context - The provider context
   * @param hydration - Whether this is a hydration request
   * @param controller - An optional abort controller
   * @returns The resolved data, or undefined if a provider failed
   */
  public async resolve(
    context: RouteContext<TRec, TRec, TRec>,
    hydration?: boolean,
    controller?: AbortController
  ): Promise<Data | undefined> {
    const { state, cache, activeControllers, providerObservers } = this.storage;

    const abortController = controller ?? new AbortController();
    activeControllers.set(context, abortController);

    const signal = abortController.signal;
    context.signal = signal;

    // Enjoy pronounce them :P
    const aborted = () => signal.aborted;
    const abortIt = () => {
      $do(() => {
        state.resolved = false;
        state.resolving.clear();
        activeControllers.delete(context);
      });
    };
    signal.addEventListener('abort', abortIt, { once: true });

    try {
      for (const batch of this.resolvers) {
        const promises = [];

        for (const [name, { handler, options }] of Object.entries(batch)) {
          if (!providerObservers.has(handler)) {
            const observer = createObserver(() => {
              this.router.start(1);
              // observer.reset();
              resolver();
            });

            // Run the provider inside an observer, so whenever the state it reads change,
            // the observer will be re-run.
            const resolver = () => {
              return observer.runAsync(async () => {
                this.router.progress(0.5);

                $do(() => state.resolving.add(name));

                try {
                  const providerData = await awaited(
                    retriable(
                      async () => {
                        return await awaited(cache.resolve(name, handler, context, options, hydration));
                      },
                      { ...DEFAULT_CONFIG, ...this.options, ...options, controller: abortController }
                    )
                  );

                  if (!aborted()) {
                    $do(() => {
                      context.data[name] = providerData;
                      state.resolving.delete(name);
                    });
                    this.router.progress(0.5);
                  }

                  return providerData;
                } catch (error) {
                  if (!aborted()) {
                    $do(() => state.resolving.delete(name));
                    this.router.progress(0.5);
                    state.status = ROUTE_STATUS.ERROR;

                    if (error instanceof Error) {
                      state.error = error instanceof ProviderError ? error : new ProviderError(error.message, error);
                      return state.error;
                    } else {
                      state.error = new ProviderError('Unknown provider error.', error as Error);
                      return state.error;
                    }
                  }
                }
              });
            };

            providerObservers.set(handler, { observer, resolver });
          }

          const resolve = providerObservers.get(handler)!.resolver;
          const promise = resolve().then((result) => {
            if (result instanceof Error && !aborted()) {
              state.status = ROUTE_STATUS.ERROR;
              state.error = result instanceof ProviderError ? result : new ProviderError(result.message, result);

              abortController.abort();
              throw state.error;
            }
          });

          promises.push(promise);
        }

        try {
          await Promise.all(promises);
        } catch (_error) {
          return;
        }
      }

      state.resolved = true;
      return context.data as Data;
    } finally {
      signal.removeEventListener('abort', abortIt);
    }
  }

  /**
   * Pre-activates this route.
   *
   * Sets the route as pending, and sets the route context.
   *
   * @param context - The provider context
   */
  public preActivate(context: RouteContext<Params, QueryParams, Data>) {
    const { state, context: ctx } = this.storage;

    ctx.value = context as RouteContext<TRec, TRec, TRec>;

    state.error = undefined;
    state.status = ROUTE_STATUS.PENDING;

    return { state, ctx };
  }

  /**
   * Activates this route.
   *
   * Optionally preloads data, then sets the route as active.
   *
   * @param context - The provider context
   * @param resolve - Whether to preload data (default: true)
   * @param controlled - Whether the activation is controlled.
   * @param hydration - Whether this is a hydration request
   * @param controller - An optional abort controller
   */
  public async activate(
    context: RouteContext<Params, QueryParams, Data>,
    resolve = true,
    controlled?: boolean,
    hydration?: boolean,
    controller?: AbortController
  ): Promise<void> {
    const { state } = this.preActivate(context);

    this.router.start();
    this.router.progress(0.5);

    await this.ensureRenderer();

    this.router.progress(0.5);

    // Preload data if preload is enabled.
    if (resolve) {
      await this.resolve(context, hydration, controller);
    }

    // If the route is deactivated during preload, do nothing.
    if (state.status !== ROUTE_STATUS.PENDING) return;

    // Set the route as active if full is enabled.
    if (!controlled) state.active = true;

    state.status = ROUTE_STATUS.SUCCESS;
  }

  /**
   * Deactivates this route.
   *
   * Clears data and context unless keepAlive is enabled.
   */
  public deactivate(): void {
    safeRead(() => {
      const { state, context } = this.storage;

      state.active = false;
      state.status = ROUTE_STATUS.IDLE;

      if (this.options?.keepAlive) {
        context.value.exception = undefined;
      } else {
        context.value = { query: {}, params: {}, data: {}, exception: undefined };
      }

      if (!this.options?.keepAlive) {
        state.error = undefined;
        state.resolved = false;
        state.authenticated = false;
        this.cancel();
        this.cleanupObservers();
      }
    });
  }

  /**
   * Cancels any pending provider resolutions.
   *
   * If a context is provided, only cancels that specific resolution.
   * Otherwise, cancels all pending resolutions.
   *
   * @param context - Optional context to cancel
   */
  public cancel(context?: RouteContext<TRec, TRec, TRec>): void {
    const { activeControllers } = this.storage;

    if (context) {
      const controller = activeControllers.get(context);

      if (controller) {
        controller.abort('Resolution cancelled');
        activeControllers.delete(context);
      }
    } else {
      for (const controller of activeControllers.values()) {
        controller.abort('Resolution cancelled');
      }

      activeControllers.clear();
    }
  }

  public render(renderer: RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output>): this {
    this.rendererState.value = createRenderer(this as never, renderer as never);
    return this;
  }

  public renderAsync<R extends RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output>>(
    loader: () => Promise<R>,
    fallback?: RouteRenderer<Path, Params, QueryParams, Data, PParams, PQueryParams, PData, Output>
  ): this {
    this.loadRenderer = loader;
    if (fallback) this.render(fallback);

    safeRun(() => {
      if (!this.rendererState.value) return;
      this.ensureRenderer(true);
    });

    return this;
  }

  public catch(renderer: RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>) {
    this.exceptionRendererState.value = createExceptionRenderer(this as never, renderer as never);
  }

  public cleanup() {
    this.deactivate();
    this.cleanupObservers();
    getStore().delete(this);
  }

  public snapshot() {
    return this.storage.cache.snapshot();
  }

  public hydrate(snapshot: RouteCacheSnapshot[]) {
    this.storage.cache.hydrate(snapshot);
  }

  public cleanupObservers() {
    const { guardObservers, providerObservers } = this.storage;

    for (const guard of this.guards.values()) {
      guardObservers.get(guard)?.observer.destroy();
      guardObservers.delete(guard);
    }

    for (const { provider } of this.providers.values()) {
      providerObservers.get(provider)?.observer.destroy();
      providerObservers.delete(provider);
    }
  }

  private renderLoaderQueue: AnyType | undefined;

  public async ensureRenderer(force?: boolean): Promise<void> {
    if (typeof this.loadRenderer !== 'function') return;
    if (this.rendererState.value && !force) return;

    if (this.renderLoaderQueue) {
      await this.renderLoaderQueue;
      return;
    }

    try {
      this.renderLoaderQueue = this.loadRenderer();
      const renderer = await this.renderLoaderQueue;
      this.render(renderer as AnyType);

      delete this.loadRenderer;
      delete this.renderLoaderQueue;
    } catch (error) {
      const { state } = this.storage;
      state.status = ROUTE_STATUS.ERROR;
      state.error = new RouteError(ERROR_TYPE.ROUTE, (error as Error).message, error as Error);
    }
  }
}

/**
 * A context reader for route state.
 */
export class ContextReader<Params, Query, Data> {
  readonly #state: RouteState;
  readonly #context: { value: RouteContext<Params, Query, Data> };

  constructor(state: RouteState, context: { value: RouteContext<Params, Query, Data> }) {
    this.#state = state;
    this.#context = context;
  }

  get active() {
    return this.#state.active;
  }
  get status() {
    return this.#state.status;
  }
  get resolved() {
    return this.#state.resolved;
  }
  get resolving() {
    return this.#state.resolving;
  }
  get authenticated() {
    return this.#state.authenticated;
  }
  get authenticating() {
    return this.#state.authenticating;
  }
  get data() {
    return this.#context.value.data;
  }
  get error() {
    return this.#state.error;
  }
  get query() {
    return this.#context.value.query;
  }
  get params() {
    return this.#context.value.params;
  }
  get exception() {
    return this.#context.value.exception;
  }
}

/**
 * Get render props for a route.
 * @param {UnknownRoute} route
 * @returns {RouteRenderProps<None, None, TRec>}
 */
export function getRenderProps(route: UnknownRoute): RouteRenderProps<None, None, TRec> {
  return $do(() => {
    const { state, context } = route.storage;
    const reader = new ContextReader<None, None, TRec>(state, context as { value: RouteContext<None, None, TRec> });
    return { state: reader, context: route.router.context as never };
  });
}

let createRenderer = <Path, Params, QueryParams, Data, Output>(
  _route: UnknownRoute,
  renderer: RouteRenderer<Path, Params, QueryParams, Data, Params, QueryParams, Data, Output>
): RouteRenderer<Path, Params, QueryParams, Data, Params, QueryParams, Data, Output> => {
  return renderer;
};

let createExceptionRenderer = <Params, QueryParams, Data, PParams, PQueryParams, PData, Output>(
  _route: UnknownRoute,
  renderer: RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output>
): RouteExceptionRenderer<Params, QueryParams, Data, PParams, PQueryParams, PData, Output> => {
  return renderer;
};

export type RendererFactory = typeof createRenderer;
export type ExceptionRendererFactory = typeof createExceptionRenderer;

export function getRendererFactory(): RendererFactory {
  return createRenderer;
}

export function getExceptionRendererFactory(): ExceptionRendererFactory {
  return createExceptionRenderer;
}

export function setRendererFactory(factory: RendererFactory) {
  createRenderer = factory;
}

export function setExceptionRendererFactory(factory: ExceptionRendererFactory) {
  createExceptionRenderer = factory;
}

export function createRouteEntry(route: UnknownRoute, isIndex = false): RouteEntry {
  return [
    route.path,
    {
      type: route.type,
      isIndex,
      route,
      toString: (params?: TRec, query?: TRec) => route.url(params as never, query as never),
    },
  ];
}
