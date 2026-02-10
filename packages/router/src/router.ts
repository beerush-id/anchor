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

export class Router {
  private readonly options: RouterOptions;
  private readonly rootRoute: UnknownRoute;
  private readonly rootRegistry: RouteRegistry;
  private readonly cache: URLCache;

  private activeUrl?: string;

  public activeRoute: UnknownRoute | undefined;
  public activeContext: ActiveContext<TRec, TRec, TRec> = mutable({ data: {}, query: {}, params: {} });
  public activeSegments: UnknownRoute[] | undefined;

  constructor(options?: RouterOptions) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.rootRoute = new Route('/', this.options);
    this.rootRegistry = new RouteRegistry(this.rootRoute);
    this.cache = new URLCache(this.rootRegistry, options?.cacheSize);
  }

  public route<
    TPath extends RoutePath,
    TParams extends ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath>,
    TOptions extends RouteOptions,
    TData,
  >(path: TPath, options?: TOptions): Route<TPath, TParams, TQueryParams, TOptions, TData> {
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

  public find(url: string | URL): MatchResult | void {
    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    return this.cache.get(url);
  }

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

  public deactivate(): void {
    for (const route of [...(this.activeSegments || [])].reverse()) {
      route.deactivate();
    }

    this.activeUrl = undefined;
    this.activeRoute = undefined;
    this.activeSegments = undefined;
  }

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

export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
