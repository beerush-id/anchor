import { isBrowser } from '@anchorlib/core';
import { type RouteCacheSnapshot, URLCache } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { RouterContext } from './context.js';
import { ERROR_TYPE, RENDER_MODE, ROUTE_TYPE } from './enum.js';
import { RouteError } from './error.js';
import { Redirect } from './redirect.js';
import { RouteRegistry } from './registry.js';
import { getExceptionRendererFactory, type IndexRoute, Route } from './route.js';
import { createState, getStore, safeAssign, safeRead } from './store.js';
import type {
  ExtractParams,
  ExtractQueryParams,
  MatchResult,
  MatchRouteSegment,
  None,
  RouteContext,
  RouteExceptionRenderer,
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
 */

export const HYDRATION_KEY = '__ANCHOR_ROUTER_CACHE__';

export type RouterSnapshot = Array<RouteCacheSnapshot[]>;

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export class Router<Output = any> {
  private hydratedSegments?: RouterSnapshot;

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
        state: createState({ progress: 0, activating: 0 }),
        cache: new URLCache(this.routes, this.options.cacheSize),
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
  public readonly rootRoute: Route<'/', None, None>;
  public readonly rootRegistry: RouteRegistry;
  public readonly routes = new Set<RouteRegistry>();

  private exceptionRendererState = createState<
    RouteExceptionRenderer<None, None, TRec, None, None, TRec, Output> | undefined
  >(undefined);

  public get exceptionRenderer() {
    return this.exceptionRendererState.value;
  }

  private get cache() {
    return this.storage.cache;
  }

  /** The currently active route */
  public get activeRoute() {
    return this.storage.activeRoute;
  }

  /** The active context shared across all routes */
  public get context() {
    return this.storage.context;
  }

  /** The currently active route segments */
  public get activeSegments() {
    return this.storage.activeSegments;
  }

  /**
   * Creates a new Router instance.
   *
   * @param options - Optional router configuration
   */
  constructor(options?: RouterOptions) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.rootRoute = new Route<'/', None, None>(this, '/', this.options, undefined, '/');
    this.rootRegistry = new RouteRegistry(this.rootRoute);
    this.routes.add(this.rootRegistry);

    if (isBrowser() && Array.isArray(window[HYDRATION_KEY as keyof Window])) {
      this.hydratedSegments = window[HYDRATION_KEY as keyof Window] as RouterSnapshot;
      delete window[HYDRATION_KEY as keyof Window];
      document.querySelector(`#${HYDRATION_KEY}`)?.remove();
    }
  }

  /**
   * Clears all routes from the router.
   */
  public clear() {
    this.routes.clear();
    this.routes.add(this.rootRegistry);
  }

  /**
   * Get the root route object.
   * @returns Route - The root route.
   */
  public route(): Route<'/', None, None, TRec, never, Output>;

  /**
   * Creates a new route.
   *
   * If path is '/', creates an index route and returns the root route.
   * Otherwise, creates a new child route and returns it.
   *
   * @template Path - The route path type
   * @template Params - The route parameters type
   * @template QueryParams - The query parameters type
   * @template TOptions - The route options type
   * @template Data - The route data type
   * @param path - The route path
   * @param options - Optional route options
   * @returns The created route
   */
  public route<
    Path extends RoutePath,
    Params extends ExtractParams<Path>,
    QueryParams extends ExtractQueryParams<Path>,
    Data extends TRec = TRec,
  >(
    path?: Path,
    options?: RouteOptions
  ): Path extends '/'
    ? IndexRoute<Path, Params, QueryParams, Data, never, Output>
    : Route<Path, Params, QueryParams, Data, never, Output>;

  public route<
    Path extends RoutePath,
    Params extends ExtractParams<Path>,
    QueryParams extends ExtractQueryParams<Path>,
    Data extends TRec = TRec,
  >(
    path?: Path,
    options?: RouteOptions
  ): Path extends '/'
    ? IndexRoute<Path, Params, QueryParams, Data, never, Output>
    : Route<Path, Params, QueryParams, Data, never, Output> {
    if (!path) return this.rootRoute as never;
    const route = new Route(this, path, options);

    if (path === ('/' as Path)) {
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
   * Creates a new top-level route that independently handles navigation.
   *
   * @template Path - The route path type
   * @template Params - The route parameters type
   * @template QueryParams - The query parameters type
   * @template TOptions - The route options type
   * @template Data - The route data type
   * @param path - The route path
   * @param options - Optional route options
   * @returns The created route
   */
  public append<
    Path extends RoutePath,
    Params extends ExtractParams<Path>,
    QueryParams extends ExtractQueryParams<Path>,
    Data extends TRec = TRec,
  >(
    path?: Path,
    options?: RouteOptions
  ): Path extends '/'
    ? IndexRoute<Path, Params, QueryParams, Data, never, Output>
    : Route<Path, Params, QueryParams, Data, never, Output> {
    if (!path || path === ('/' as never))
      throw new RouteError(ERROR_TYPE.ROUTER, 'Invalid path: Path must be string' + ' "/{path}".');

    const route = new Route(this, path, options);
    const routeMap = new RouteRegistry(route as never as UnknownRoute, true);
    this.routes.add(routeMap);

    return route as never;
  }

  /**
   * Finds a route matching the given URL.
   *
   * Uses the URL cache for performance.
   *
   * @param url - The URL to match (string or URL object)
   * @returns The match result, or undefined if no match
   */
  public find(url: string | URL): MatchResult | undefined {
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
   * @param withHydration - Whether to hydrate the route with cached data
   * @param controller - An optional AbortController
   * @returns A GuardBlocker if navigation was blocked, otherwise void
   */
  public async activate(
    url: string | URL,
    withHydration?: boolean,
    controller?: AbortController
  ): Promise<RouterSnapshot> {
    const snapshots: RouterSnapshot = [];
    const storage = this.storage;

    if (typeof url === 'string') {
      url = new URL(url, url.startsWith('http') ? undefined : this.options.baseUrl);
    }

    const match = this.find(url);
    if (!match) return snapshots;

    if (storage.activeUrl === url.href) return snapshots;

    // Cancel previous activations.
    if (storage.activatingSegments.size) {
      storage.activatingSegments.forEach((segment) => {
        storage.context.detach(segment.store);
      });

      storage.activatingSegments.clear();
    }

    const { segments, exception } = match;
    storage.context.exception = exception;

    const currentSegments = storage.activeSegments || [];
    const targetSegments = segments;

    // Deactivate segments not in target (leaf to root)
    const toDeactivate = currentSegments.filter((r) => {
      return !targetSegments.find((n) => n.route === r.route && n.store === r.store);
    });

    // Activate new segments (root to leaf) without preloading
    const toActivate = targetSegments.filter((r) => {
      return !currentSegments.find((n) => n.route === r.route && n.store === r.store);
    });

    if (Array.isArray(this.hydratedSegments)) {
      withHydration = true;

      toActivate.forEach((segment, i) => {
        const snapshot = this.hydratedSegments![i];

        if (snapshot) {
          segment.route.hydrate(snapshot);
        }
      });

      delete this.hydratedSegments;
    }

    const activationLengths = toActivate.reduce((acc, segment) => {
      acc += segment.route.guards.size;
      acc += segment.route.providers.size;

      return acc;
    }, 0);

    // Detach stores from previous segments.
    for (const segment of toDeactivate) {
      safeRead(() => {
        segment.store.exception = undefined;
        storage.context.detach(segment.store);
      });
    }

    // Attach stores to new segments and register to activating segments.
    for (const segment of toActivate) {
      safeRead(() => {
        storage.activatingSegments.add(segment);
        storage.context.attach(segment.store);
        segment.route.preActivate(segment.store as RouteContext<None, None, TRec>);
      });
    }

    this.start(activationLengths);

    const authenticatedSegments: MatchRouteSegment[] = [];

    // Authenticate all routes before activating.
    for (const segment of toActivate) {
      if (controller?.signal.aborted) return snapshots;

      const { route } = segment;

      const blocker = await route.authenticate(storage.context as RouterContext<None, None, TRec>);
      if (!storage.activatingSegments.has(segment)) return snapshots;

      if (blocker instanceof Redirect) {
        this.finish();
        throw blocker;
      }

      if (blocker instanceof RouteError) {
        storage.context.exception = blocker;
        segment.store.exception = blocker;
        authenticatedSegments.push(segment);
        break;
      }

      authenticatedSegments.push(segment);
    }

    // Immediately tell renderer to render when the render mode is immediate.
    if (this.options.renderMode === RENDER_MODE.IMMEDIATE) {
      safeRead(() => {
        for (const { route } of toDeactivate.reverse()) {
          route.deactivate();
        }
        for (const { route } of authenticatedSegments) {
          route.active = true;
        }
      });
    }

    // Activate target segments.
    for (const segment of authenticatedSegments) {
      if (controller?.signal.aborted) return snapshots;

      const { route, store } = segment;
      if (store.exception) continue;

      await route.activate(store as RouteContext<None, None, TRec>, true, true, withHydration, controller);

      if (withHydration) snapshots.push(route.snapshot());
      if (!storage.activatingSegments.has(segment)) return snapshots;
      storage.activatingSegments.delete(segment);
    }

    // Render target segments if not already rendered.
    if (this.options.renderMode !== RENDER_MODE.IMMEDIATE) {
      safeRead(() => {
        for (const { route } of toDeactivate.reverse()) {
          route.deactivate();
        }
        for (const { route } of authenticatedSegments) {
          route.active = true;
        }
      });
    }

    // Update router state
    storage.activeUrl = url.href;
    storage.context.url = url.href;
    storage.activeRoute = match.route;
    storage.activeSegments = targetSegments;

    this.finish();
    return snapshots;
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
    const { state } = this.storage;
    const { steps, activating } = safeRead(() => ({ activating: state.activating, steps: state.steps }));

    if (activating) {
      safeRead(() => safeAssign(state, { steps: steps + length }));
    } else {
      safeRead(() => safeAssign(state, { activating: true, steps: length, progress: 0 }));
    }
  }

  /**
   * Finishes a progress indicator for route activation.
   */
  public finish() {
    safeRead(() => safeAssign(this.state, { steps: 0, progress: 0, activating: false }));
  }

  /**
   * Deactivates all currently active routes.
   *
   * Clears all active segments and resets router state.
   */
  public deactivate(): void {
    const storage = this.storage;

    for (const segment of [...(storage.activeSegments || [])].reverse()) {
      segment.route.deactivate();
      storage.context.detach(segment.store);
    }

    storage.activeUrl = undefined;
    storage.activeRoute = undefined;
    storage.activeSegments = undefined;
  }

  /**
   * Preloads a route without activating it.
   *
   * Useful for prefetching routes before navigation.
   *
   * @param url - The URL to preload (string or URL object)
   */
  public async preload(url: string | URL): Promise<void> {
    const storage = this.storage;

    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    const match = this.find(url);
    if (!match) return;

    const { segments } = match;

    for (const segment of segments) {
      storage.context.attach(segment.store);
    }

    // Preload all segments without activating them
    for (const { route, store } of segments) {
      const blocked = await route.authenticate(store as RouterContext<None, None, TRec>);
      if (blocked instanceof Error || blocked instanceof Redirect) return;

      await route.preload(store as RouteContext<None, None, TRec>);
    }
  }

  /**
   * Cleans up all route data and resources.
   * Useful for cleaning up after a server side rendering.
   */
  public cleanup() {
    const { activeSegments } = this.storage;

    for (const segment of [...(activeSegments || [])].reverse()) {
      segment.route.cleanup();
    }

    getStore().clear();
  }

  /**
   * Sets a custom exception renderer for route exceptions.
   * @param {RouteExceptionRenderer<None, None, TRec, None, None, TRec, unknown>} renderer - The exception renderer function.
   */
  public catch(renderer: RouteExceptionRenderer<None, None, TRec, None, None, TRec, Output>) {
    this.exceptionRendererState.value = getExceptionRendererFactory()(this.rootRoute, renderer);
  }

  public createHydrationScript(snapshot: RouterSnapshot) {
    const jsonString = JSON.stringify(snapshot)
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E')
      .replace(/\//g, '\\u002F')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    return `<script id="${HYDRATION_KEY}">window.${HYDRATION_KEY} = ${jsonString}</script>`;
  }
}

/**
 * Creates a new Router instance.
 *
 * Convenience function for creating a router with optional options.
 *
 * @param options - Optional router configuration
 * @returns A new Router instance
 */
export function createRouter<Output>(options?: RouterOptions): Router<Output> {
  return new Router(options);
}
