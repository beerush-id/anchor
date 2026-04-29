import { anchor, mutable, untrack } from '@anchorlib/core';
import { URLCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { RouterContext } from './context.js';
import { RENDER_MODE, ROUTE_TYPE } from './enum.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import { Route } from './route.js';
import { getStore } from './store.js';
import type {
  ExtractParams,
  ExtractQueryParams,
  GuardBlocker,
  MatchResult,
  None,
  ProviderContext,
  RouteOptions,
  RoutePath,
  RouterOptions,
  RouterState,
  RouterStorage,
  TRec,
  UnknownRoute,
} from './types.js';

/**
 * A type-safe router for managing routes and navigation.
 *
 * Supports nested routes, guards, data providers, and caching.
 * Routes can be activated, deactivated, and preloaded.
 *
 * @example
 * ```ts
 * const router = new Router({ baseUrl: 'https://example.com' });
 *
 * const usersRoute = router.route('/users');
 * const userRoute = usersRoute.route('/:id');
 *
 * await router.activate('/users/123');
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export class Router<Output = any> {
  public get path() {
    return this.activeRoute?.path;
  }

  public get data() {
    return this.context.data;
  }

  public get query() {
    return this.context.query;
  }

  public get params() {
    return this.context.params;
  }

  public get state(): RouterState {
    return this.storage.state;
  }

  private get storage(): RouterStorage {
    const store = getStore();

    if (!store.has(this)) {
      store.set(this, {
        state: mutable({ progress: 0, activating: 0 }),
        cache: new URLCache(this.rootRegistry, this.options.cacheSize),
        context: new RouterContext(),
        activeUrl: undefined,
        activeRoute: undefined,
        activeSegments: undefined,
        activatingSegments: new Set(),
      });
    }

    return store.get(this) as RouterStorage;
  }

  public readonly options: RouterOptions;
  public readonly rootRoute: UnknownRoute;
  public readonly rootRegistry: RouteRegistry;

  private get cache() {
    return this.storage.cache;
  }

  private get activeUrl() {
    return this.storage.activeUrl;
  }
  private set activeUrl(activeUrl) {
    this.storage.activeUrl = activeUrl;
  }

  /** The currently active route */
  public get activeRoute() {
    return this.storage.activeRoute;
  }
  private set activeRoute(activeRoute) {
    this.storage.activeRoute = activeRoute;
  }

  /** The active context shared across all routes */
  public get context() {
    return this.storage.context;
  }

  /** The currently active route segments */
  public get activeSegments() {
    return this.storage.activeSegments;
  }
  private set activeSegments(activeSegments) {
    this.storage.activeSegments = activeSegments;
  }

  private get activatingSegments() {
    return this.storage.activatingSegments;
  }

  /**
   * Creates a new Router instance.
   *
   * @param options - Optional router configuration
   *
   * @example
   * ```ts
   * const router = new Router({
   *   baseUrl: 'https://example.com',
   *   cacheSize: 100,
   *   maxAge: 60000
   * });
   * ```
   */
  constructor(options?: RouterOptions) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.rootRoute = new Route(this, '/', this.options);
    this.rootRegistry = new RouteRegistry(this.rootRoute);
  }

  /**
   * Creates a new route.
   *
   * If path is '/', creates an index route and returns the root route.
   * Otherwise, creates a new child route and returns it.
   *
   * @template TPath - The route path type
   * @template TParams - The route parameters type
   * @template TQueryParams - The query parameters type
   * @template TOptions - The route options type
   * @template TData - The route data type
   * @param path - The route path
   * @param options - Optional route options
   * @returns The created route
   *
   * @example
   * ```ts
   * const usersRoute = router.route('/users');
   * const userRoute = usersRoute.route('/:id');
   * const indexRoute = router.route('/');
   * ```
   */
  public route<
    TPath extends RoutePath,
    TParams extends ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath>,
    TOptions extends RouteOptions,
    TData,
  >(
    path?: TPath,
    options?: TOptions
  ): TPath extends '/'
    ? Omit<Route<TPath, TParams, TQueryParams, RouteOptions & TOptions, TData, never, Output>, 'route'>
    : Route<TPath, TParams, TQueryParams, RouteOptions & TOptions, TData, never, Output> {
    if (!path) return this.rootRoute as never;
    const route = new Route(this, path, options);

    if (path === ('/' as TPath)) {
      route.closed = true;
      this.rootRoute.index = route as never;
      return route as never;
    }

    const routeMap = new RouteRegistry(route as never as UnknownRoute);

    if (route.type === ROUTE_TYPE.STATIC) {
      this.rootRegistry.set(route.name, routeMap);
    } else if (route.type === ROUTE_TYPE.DYNAMIC) {
      this.rootRegistry.set(DYNAMIC_ROUTE_KEY, routeMap);
    } else if (route.type === ROUTE_TYPE.WILDCARD) {
      this.rootRegistry.set(WILDCARD_ROUTE_KEY, routeMap);
    }

    return route as never;
  }

  /**
   * Finds a route matching the given URL.
   *
   * Uses the URL cache for performance.
   *
   * @param url - The URL to match (string or URL object)
   * @returns The match result, or undefined if no match
   *
   * @example
   * ```ts
   * const match = router.find('/users/123');
   * if (match) {
   *   console.log(match.route, match.params);
   * }
   * ```
   */
  public find(url: string | URL): MatchResult | void {
    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    return this.cache.get(url);
  }

  /**
   * Activates a route by URL.
   *
   * Preloads all route segments, deactivates old segments,
   * and activates new segments. Handles race conditions by
   * checking if the URL is still active after preloading.
   *
   * @param url - The URL to activate (string or URL object)
   * @returns A GuardBlocker if navigation was blocked, otherwise void
   *
   * @example
   * ```ts
   * const blocker = await router.activate('/users/123');
   * if (blocker) {
   *   console.log('Navigation blocked:', blocker);
   * }
   * ```
   */
  public async activate(url: string | URL): Promise<void | GuardBlocker> {
    if (typeof url === 'string') {
      url = new URL(url, url.startsWith('http') ? undefined : this.options.baseUrl);
    }

    if (this.activeUrl === url.href) return;

    // Set active URL synchronously - prevents race condition
    this.activeUrl = url.href;

    // Cancel previous activations.
    if (this.activatingSegments.size) {
      this.activatingSegments.forEach((segment) => {
        this.context.detach(segment.store);
      });

      this.activatingSegments.clear();
    }

    const match = this.find(url);
    if (!match) return;

    const { segments } = match;

    const currentSegments = this.activeSegments || [];
    const targetSegments = segments;

    // Deactivate segments not in target (leaf to root)
    const toDeactivate = currentSegments.filter((r) => {
      return !targetSegments.find((n) => n.route === r.route && n.store === r.store);
    });

    // Activate new segments (root to leaf) without preloading
    const toActivate = targetSegments.filter((r) => {
      return !currentSegments.find((n) => n.route === r.route && n.store === r.store);
    });

    const activationLengths = toActivate.reduce((acc, segment) => {
      acc += segment.route.guards.size;
      acc += segment.route.providers.size;

      return acc;
    }, 0);

    // Attach store and activate immediate segments.
    for (const segment of toActivate) {
      this.activatingSegments.add(segment);
      this.context.attach(segment.store);

      if (segment.route.options.renderMode === RENDER_MODE.IMMEDIATE) {
        segment.route.active = true;
      }
    }

    this.start(activationLengths);

    // Activate target segments.
    for (const segment of toActivate) {
      const { route, store } = segment;
      if (!this.activatingSegments.has(segment)) return;

      const blocker = await route.authenticate(this.context as RouterContext<None, None, TRec>);
      if (blocker instanceof Error || blocker instanceof Redirect) {
        this.finish();
        return blocker;
      }

      await route.activate(store as ProviderContext<None, None, TRec>);

      // Remove from activating routes.
      this.activatingSegments.delete(segment);
    }

    untrack(() => {
      for (const segment of toDeactivate.reverse()) {
        this.context.detach(segment.store);
        segment.route.deactivate();
      }

      for (const { route } of toActivate) {
        if (route.options.renderMode !== RENDER_MODE.IMMEDIATE) {
          route.active = true;
        }
      }
    });

    // Update router state
    this.activeRoute = match.route;
    this.activeSegments = targetSegments;
    this.finish();
  }

  /**
   * Pushes a progress step for route activation.
   * @param {number} step
   */
  public progress(step: number = 1): void {
    this.state.progress = step;
  }

  /**
   * Starts a progress indicator for route activation.
   * @param {number} length
   */
  public start(length: number = 1) {
    const { steps, activating } = untrack(() => ({ activating: this.state.activating, steps: this.state.steps }));

    if (activating) {
      untrack(() => anchor.assign(this.state, { steps: steps + length }));
    } else {
      untrack(() => anchor.assign(this.state, { activating: true, steps: length, progress: 0 }));
    }
  }

  /**
   * Finishes a progress indicator for route activation.
   */
  public finish() {
    untrack(() => anchor.assign(this.state, { steps: 0, progress: 0, activating: false }));
  }

  /**
   * Deactivates all currently active routes.
   *
   * Clears all active segments and resets router state.
   *
   * @example
   * ```ts
   * router.deactivate();
   * ```
   */
  public deactivate(): void {
    for (const segment of [...(this.activeSegments || [])].reverse()) {
      segment.route.deactivate();
      this.context.detach(segment.store);
    }

    this.activeUrl = undefined;
    this.activeRoute = undefined;
    this.activeSegments = undefined;
  }

  /**
   * Preloads a route without activating it.
   *
   * Useful for prefetching routes before navigation.
   *
   * @param url - The URL to preload (string or URL object)
   *
   * @example
   * ```ts
   * await router.preload('/users/123');
   * // Route data is now cached
   * ```
   */
  public async preload(url: string | URL): Promise<void> {
    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    const match = this.find(url);
    if (!match) return;

    const { segments } = match;
    const tempContext = new RouterContext();

    for (const segment of segments) {
      this.context.attach(segment.store);
    }

    // Preload all segments without activating them
    for (const { route, store } of segments) {
      const blocked = await route.authenticate(tempContext as RouterContext<None, None, TRec>);
      if (blocked instanceof Error || blocked instanceof Redirect) return;

      await route.preload(store as ProviderContext<None, None, TRec>);
    }

    tempContext.clear();
  }

  public cleanup() {
    for (const segment of [...(this.activeSegments || [])].reverse()) {
      segment.route.cleanup();
    }

    getStore().delete(this);
  }
}

/**
 * Creates a new Router instance.
 *
 * Convenience function for creating a router with optional options.
 *
 * @param options - Optional router configuration
 * @returns A new Router instance
 *
 * @example
 * ```ts
 * const router = createRouter({ baseUrl: 'https://example.com' });
 * ```
 */
export function createRouter<Output>(options?: RouterOptions): Router<Output> {
  return new Router(options);
}
