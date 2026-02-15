import { anchor, mutable } from '@anchorlib/core';
import { URLCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import { Route } from './route.js';
import type {
  ActiveContext,
  ExtractParams,
  ExtractQueryParams,
  GuardBlocker,
  MatchResult,
  None,
  ProviderContext,
  RouteOptions,
  RoutePath,
  RouterOptions,
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
export class Router {
  private readonly options: RouterOptions;
  private readonly rootRoute: UnknownRoute;
  private readonly rootRegistry: RouteRegistry;
  private readonly cache: URLCache;

  private activeUrl?: string;

  /** The currently active route */
  public activeRoute: UnknownRoute | undefined;
  /** The active context shared across all routes */
  public activeContext: ActiveContext<TRec, TRec, TRec> = mutable({ data: {}, query: {}, params: {} });
  /** The currently active route segments */
  public activeSegments: UnknownRoute[] | undefined;

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
    this.rootRoute = new Route('/', this.options);
    this.rootRegistry = new RouteRegistry(this.rootRoute);
    this.cache = new URLCache(this.rootRegistry, options?.cacheSize);
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
  >(path: TPath, options?: TOptions): Route<TPath, TParams, TQueryParams, RouteOptions & TOptions, TData> {
    const route = new Route(path, { ...this.options, ...options });

    if (path === ('/' as TPath)) {
      this.rootRoute.index = route as UnknownRoute;
      return this.rootRoute as never;
    }

    const routeMap = new RouteRegistry(route as UnknownRoute);

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
      url = new URL(url, this.options.baseUrl);
    }

    // Set active URL synchronously - prevents race condition
    this.activeUrl = url.href;

    const match = this.find(url);
    if (!match) return;

    const { segments, context } = match;

    // Update the active context reference to point to this URL's context
    anchor.assign(this.activeContext, context);

    const currentSegments = this.activeSegments || [];
    const targetSegments = segments;

    // Preload all segments first
    for (const route of segments) {
      const blocker = await route.preload(context as ProviderContext<None, None, TRec>);
      if (blocker instanceof Error || blocker instanceof Redirect) return blocker;
    }

    // Check if still active after preload
    if (this.activeUrl !== url.href) {
      return; // Newer navigation started, abort
    }

    // Deactivate segments not in target (leaf to root)
    const toDeactivate = currentSegments.filter((r) => !targetSegments.includes(r));
    for (const route of toDeactivate.reverse()) {
      route.deactivate();
    }

    // Activate new segments (root to leaf) without preloading
    const toActivate = segments.filter((r) => !currentSegments.includes(r));
    for (const route of toActivate) {
      // Activate without preloading (data already loaded)
      await route.activate(this.activeContext as ProviderContext<None, None, TRec>, false);
    }

    // Update router state
    this.activeRoute = match.route;
    this.activeSegments = targetSegments;
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
export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
