import { anchor, mutable } from '@anchorlib/core';
import { URLCache } from './cache.js';
import { DYNAMIC_ROUTE_KEY, inheritConfig, WILDCARD_ROUTE_KEY } from './constant.js';
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
    return this.activeContext.data;
  }

  public get query() {
    return this.activeContext.query;
  }

  public get params() {
    return this.activeContext.params;
  }

  private get storage(): RouterStorage {
    const store = getStore();

    if (!store.has(this)) {
      store.set(this, {
        cache: new URLCache(this.rootRegistry, this.options.cacheSize),
        activeUrl: undefined,
        activeRoute: undefined,
        activeContext: mutable({ data: {}, query: {}, params: {} }),
        activeSegments: undefined,
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
  public get activeContext() {
    return this.storage.activeContext;
  }

  /** The currently active route segments */
  public get activeSegments() {
    return this.storage.activeSegments;
  }
  private set activeSegments(activeSegments) {
    this.storage.activeSegments = activeSegments;
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
    this.options = inheritConfig(options);
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
    path: TPath,
    options?: TOptions
  ): Route<TPath, TParams, TQueryParams, RouteOptions & TOptions, TData, never, Output> {
    const route = new Route(this, path, options);

    if (path === ('/' as TPath)) {
      return this.rootRoute as never;
    }

    const routeMap = new RouteRegistry(route as never as UnknownRoute);

    if (route.type === ROUTE_TYPE.STATIC) {
      this.rootRegistry.set(route.name, routeMap);
    } else if (route.type === ROUTE_TYPE.DYNAMIC) {
      this.rootRegistry.set(DYNAMIC_ROUTE_KEY, routeMap);
    } else if (route.type === ROUTE_TYPE.WILDCARD) {
      this.rootRegistry.set(WILDCARD_ROUTE_KEY, routeMap);
    }

    return route as Route<TPath, TParams, TQueryParams, TOptions, TData>;
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

    const match = this.find(url);
    if (!match) return;

    const { segments, context } = match;

    const currentSegments = this.activeSegments || [];
    const targetSegments = segments;

    // Update the active context reference to point to this URL's context
    anchor.assign(this.activeContext, context);

    // Update router state
    this.activeRoute = match.route;
    this.activeSegments = targetSegments;

    // Deactivate segments not in target (leaf to root)
    const toDeactivate = currentSegments.filter((r) => !targetSegments.includes(r));
    for (const route of toDeactivate.reverse()) {
      route.deactivate();
    }

    // Activate new segments (root to leaf) without preloading
    const toActivate = targetSegments.filter((r) => !currentSegments.includes(r));

    // Authenticate target segments.
    const blockers = await Promise.all(
      toActivate.map((r) => r.authenticate(context as ProviderContext<None, None, TRec>))
    );
    const blocker = blockers.find((b) => b instanceof Error || b instanceof Redirect);
    if (blocker) return blocker;

    // Check if still active after authentication (guards).
    if (this.activeUrl !== url.href) {
      return; // Newer navigation started, abort
    }

    // Activate immediate segments.
    for (const route of toActivate) {
      if (route.options.renderMode === RENDER_MODE.IMMEDIATE) {
        route.active = true;
      }
    }

    // Activate target segments.
    for (const route of toActivate) {
      await route.activate(this.activeContext as ProviderContext<None, None, TRec>);
    }
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
    for (const route of [...(this.activeSegments || [])].reverse()) {
      route.deactivate();
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

    const { segments, context } = match;

    const blockers = await Promise.all(
      segments.map((r) => r.authenticate(context as ProviderContext<None, None, TRec>))
    );
    const blocker = blockers.find((b) => b instanceof Error || b instanceof Redirect);
    if (blocker) return;

    // Preload all segments without activating them
    for (const route of segments) {
      await route.preload(context as ProviderContext<None, None, TRec>);
    }
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
