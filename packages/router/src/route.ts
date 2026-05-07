import { createObserver, retriable } from '@anchorlib/core';
import { RouteCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import type { RouterContext } from './context.js';
import { RENDER_MODE, ROUTE_STATUS, ROUTE_TYPE } from './enum.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import type { Router } from './router.js';
import { createState, getStore, safeRead } from './store.js';
import type {
  ExtractParams,
  ExtractQueryParams,
  GuardBlocker,
  GuardContext,
  GuardHandler,
  NestedParams,
  NestedQueryParams,
  ProviderContext,
  ProviderMap,
  ProviderOptions,
  RouteExceptionRendererFn,
  RouteInternalRenderer,
  RouteName,
  RouteOptions,
  RoutePath,
  RoutePathOutput,
  RouteRendererFn,
  RouteState,
  RouteStorage,
  RouteType,
  TRec,
  UnknownGuard,
  UnknownRoute,
} from './types.js';

export type IndexRoute<
  TPath extends RoutePath,
  TParams extends ExtractParams<TPath>,
  TQueryParams extends ExtractQueryParams<TPath>,
  TOptions extends RouteOptions,
  TData,
  TParent = never,
  TOutput = any,
> = Omit<Route<TPath, TParams, TQueryParams, TOptions, TData, TParent, TOutput>, 'route'>;

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
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  TOutput = any,
> {
  /** The name of this route */
  public readonly name: RouteName<TPath>;
  /** The type of this route (static, dynamic, or wildcard) */
  public readonly type: RouteType;
  public readonly options: TOptions;
  public closed = false;

  private rendererState = createState<RouteInternalRenderer<TOutput> | undefined>(undefined);
  private exceptionRendererState = createState<RouteInternalRenderer<TOutput> | undefined>(undefined);

  public get renderer(): RouteInternalRenderer<TOutput> | undefined {
    return this.rendererState.value as RouteInternalRenderer<TOutput>;
  }

  public get exceptionRenderer(): RouteInternalRenderer<TOutput> | undefined {
    return (this.exceptionRendererState.value ?? this.router.exceptionRenderer) as RouteInternalRenderer<TOutput>;
  }

  /**
   * Sets whether this route is currently active.
   *
   * @param value - true if the route is active, false otherwise
   */
  public set active(value: boolean) {
    safeRead(() => {
      const { state } = this.storage;

      if (value && !state.resolved) {
        state.resolving = true;
      }

      state.active = value;
    });
  }

  /**
   * Gets whether this route is currently active.
   *
   * @returns true if the route is active, false otherwise
   */
  public get active(): boolean {
    return this.storage.state.active;
  }

  public get data(): TData {
    return this.storage.context.value.data as TData;
  }

  /**
   * Gets the exception for this route.
   * @returns {Error | undefined}
   */
  public get exception(): Error | undefined {
    return this.storage.context.value.exception;
  }

  /**
   * Gets the full path for this route, including parent paths.
   *
   * @returns The full route path
   */
  public get path(): RoutePathOutput<TParent, TPath> {
    const parent = this.parent as UnknownRoute;

    if (parent) {
      const parentPath = parent.path;
      return [parentPath === '/' ? '' : parentPath, this.name].join('/') as never;
    }

    return `/${this.name}` as never;
  }

  /** Optional index route for this route */
  public index?: UnknownRoute;
  /** Set of guards for this route */
  public guards = new Set<UnknownGuard>();
  /** Map of data providers for this route */
  public providers = new Map<string, ProviderMap>();

  public get state(): RouteState {
    return this.storage.state;
  }

  public get context(): ProviderContext<TParams, TQueryParams, TData> {
    return this.storage.context.value as ProviderContext<TParams, TQueryParams, TData>;
  }

  public get storage(): RouteStorage {
    const store = getStore();

    if (!store.has(this)) {
      safeRead(() => {
        store.set(this, {
          state: createState<RouteState>({
            status: 'idle',
            active: false,
            resolved: false,
            resolving: false,
            authenticated: false,
            authenticating: false,
          }),
          cache: new RouteCache(this as UnknownRoute),
          context: createState({ value: { data: {}, query: {}, params: {} } }),
          guardObservers: new WeakMap(),
          activeResolvers: new Map(),
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
    public router: Router<TOutput>,
    name: TPath,
    options?: RouteOptions,
    public parent?: TParent,
    public displayName?: string
  ) {
    this.name = (name ?? '').replace(/^\//, '').split(/\//g)[0] as RouteName<TPath>;
    this.type = this.name.startsWith(':')
      ? ROUTE_TYPE.DYNAMIC
      : this.name.startsWith('*')
        ? ROUTE_TYPE.WILDCARD
        : ROUTE_TYPE.STATIC;
    this.options = { ...DEFAULT_CONFIG, ...router?.options, ...options } as TOptions;
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
    ? IndexRoute<
        TChildPath,
        NestedParams<TParams, TChildParams>,
        NestedQueryParams<TQueryParams, TChildQueryParams>,
        RouteOptions & TOptions & TChildOptions,
        TData & TChildData,
        this,
        TOutput
      >
    : Route<
        TChildPath,
        NestedParams<TParams, TChildParams>,
        NestedQueryParams<TQueryParams, TChildQueryParams>,
        RouteOptions & TOptions & TChildOptions,
        TData & TChildData,
        this,
        TOutput
      > {
    if (this.closed) throw new Error(`Index route can't have a child route.`);
    const child = new Route(this.router, path, { ...this.options, ...options }, this, path);

    if (path === ('/' as TChildPath)) {
      child.closed = true;
      this.index = child as never as UnknownRoute;
      return child as never;
    }

    const childMap = new RouteRegistry(child as never as UnknownRoute);
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
    const { state, guardObservers } = this.storage;

    if (state.authenticated && !force) return Promise.resolve(true);
    state.authenticating = true;

    try {
      const authentications = Array.from(this.guards).map((guard) => {
        if (!guardObservers.has(guard)) {
          const observer = createObserver(() => {
            this.router.start(1);

            observer.reset();
            authenticator();
          });

          const authenticator = () => {
            // Run the guard inside an observer, so whenever the state it reads change,
            // the observer will be re-run.
            return observer.runAsync(async () => {
              try {
                return await guard(context);
              } finally {
                safeRead(() => this.router.progress());
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
      state.authenticated = false;

      if (error instanceof Redirect) {
        return error;
      } else if (error instanceof Error) {
        state.error = {
          type: 'guard',
          cause: error,
          message: error.message,
        };

        return error;
      } else {
        const cause = new Error('Unknown guard error.');

        state.error = {
          type: 'guard',
          cause,
          message: cause.message,
        };

        return cause;
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
    const { state, cache, activeResolvers, providerObservers } = this.storage;

    const abortController = new AbortController();
    activeResolvers.set(context, abortController);

    try {
      for (const [name, { provider, options }] of this.providers) {
        if (!providerObservers.has(provider)) {
          const observer = createObserver(() => {
            this.router.start(1);
            observer.reset();
            resolver();
          });

          // Run the provider inside an observer, so whenever the state it reads change,
          // the observer will be re-run.
          const resolver = () => {
            return observer.runAsync(async () => {
              state.resolving = true;

              try {
                const providerData = await retriable(
                  async () => {
                    return await cache.resolve(provider, context, options);
                  },
                  { ...DEFAULT_CONFIG, ...this.options, ...options, controller: abortController }
                );

                if (abortController.signal.aborted) return;

                safeRead(() => {
                  context.data[name] = providerData;
                });

                return providerData;
              } catch (error) {
                state.status = ROUTE_STATUS.ERROR;

                if (error instanceof Error) {
                  state.error = {
                    type: 'provider',
                    cause: error,
                    message: error.message,
                  };
                  return error;
                } else {
                  const cause = new Error('Unknown provider error.');
                  state.error = {
                    type: 'provider',
                    cause,
                    message: cause.message,
                  };
                  return cause;
                }
                /* v8 ignore next - V8 coverage considers finally to have a hidden branch here */
              } finally {
                state.resolving = false;
              }
            });
          };

          providerObservers.set(provider, { observer, resolver });
        }

        const resolve = providerObservers.get(provider)!.resolver;

        const result = await resolve();
        if (result instanceof Error) return;
      }

      state.resolved = true;

      return context.data as TData;
    } finally {
      activeResolvers.delete(context);
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
    const { state, context: ctx } = this.storage;
    ctx.value = context as ProviderContext<TRec, TRec, TRec>;

    state.status = ROUTE_STATUS.PENDING;
    state.error = undefined;

    // Set the route as active immediately if renderMode is immediate
    if (this.options.renderMode === RENDER_MODE.IMMEDIATE) {
      state.active = true;
    }

    if (preload) {
      await this.preload(context);
    }

    // If the route is deactivated during preload, do nothing.
    if (state.status !== ROUTE_STATUS.PENDING) return;

    state.status = ROUTE_STATUS.SUCCESS;
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
   *
   * @example
   * ```ts
   * route.cancel(); // Cancel all
   * route.cancel(context); // Cancel specific
   * ```
   */
  public cancel(context?: ProviderContext<TRec, TRec, TRec>): void {
    const { activeResolvers } = this.storage;

    if (context) {
      const controller = activeResolvers.get(context);

      if (controller) {
        controller.abort('Resolution cancelled');
        activeResolvers.delete(context);
      }
    } else {
      for (const controller of activeResolvers.values()) {
        controller.abort('Resolution cancelled');
      }

      activeResolvers.clear();
    }
  }

  public render(renderer: RouteRendererFn<TParams, TQueryParams, TData, TOutput>): this {
    this.rendererState.value = createRenderer(this as UnknownRoute, renderer, true);
    return this;
  }

  public catch(renderer: RouteExceptionRendererFn<TParams, TQueryParams, TData, TOutput>) {
    this.exceptionRendererState.value = createExceptionRenderer(this.router, renderer);
  }

  public cleanup() {
    this.deactivate();
    this.cleanupObservers();
    getStore().delete(this);
  }

  private cleanupObservers() {
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
}

/**
 * A context reader for route state.
 */
export class ContextReader<Params, Query, Data> {
  constructor(
    private state: RouteState,
    private context: { value: ProviderContext<Params, Query, Data> }
  ) {}

  get active() {
    return this.state.active;
  }
  get status() {
    return this.state.status;
  }
  get resolved() {
    return this.state.resolved;
  }
  get resolving() {
    return this.state.resolving;
  }
  get authenticated() {
    return this.state.authenticated;
  }
  get authenticating() {
    return this.state.authenticating;
  }
  get data() {
    return this.context.value.data;
  }
  get error() {
    return this.state.error;
  }
  get query() {
    return this.context.value.query;
  }
  get params() {
    return this.context.value.params;
  }
  get exception() {
    return this.context.value.exception;
  }
}

let createRenderer = <TParams, TQueryParams, TData, TOutput>(
  route: UnknownRoute,
  renderer: RouteRendererFn<TParams, TQueryParams, TData, TOutput>,
  layout?: boolean
): RouteInternalRenderer<TOutput> => {
  return ({ children }) => {
    const { state, context } = route.storage;
    const reader = new ContextReader<TParams, TQueryParams, TData>(
      state,
      context as { value: ProviderContext<TParams, TQueryParams, TData> }
    );

    if (layout) return safeRead(() => renderer(reader, route.router.context as never, children));
    return safeRead(() => renderer(reader, route.router.context as never));
  };
};

let createExceptionRenderer = <TParams, TQueryParams, TData, TOutput>(
  router: Router,
  renderer: RouteExceptionRendererFn<TParams, TQueryParams, TData, TOutput>
): RouteInternalRenderer<TOutput> => {
  return () => {
    const context = router.context as RouterContext<TParams, TQueryParams, TData>;
    return safeRead(() => renderer(context));
  };
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
