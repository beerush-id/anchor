import { anchor, mutable } from '@anchorlib/core';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { parseQuery } from './query.js';
import { RouteRegistry } from './registry.js';
import { Route } from './route.js';
import type {
  ActiveContext,
  ExtractParams,
  ExtractQueryParams,
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

  private abortController?: AbortController;

  public activeRoute: UnknownRoute | undefined;
  public activeContext: ActiveContext<TRec, TRec, TRec> = mutable({ data: {}, query: {}, params: {} });
  public activeSegments: UnknownRoute[] | undefined;

  constructor(options?: RouterOptions) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.rootRoute = new Route('/', this.options);
    this.rootRegistry = new RouteRegistry(this.rootRoute);
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

    const query = parseQuery(url.search);
    const pathname = url.pathname;

    const match = this.rootRegistry.match(pathname) as MatchResult;

    if (match) {
      match.url = url;
      match.query = query;
    }

    return match;
  }

  public async activate(url: string | URL): Promise<void> {
    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    // Cancel any ongoing activation
    this.cancel();

    const match = this.find(url);
    if (!match) return;

    const { query, params, segments } = match;
    anchor.assign(this.activeContext, { query, params });

    const currentSegments = this.activeSegments || [];
    const targetSegments = match.segments;

    // Create abort controller for this activation
    this.abortController = new AbortController();

    // Deactivate segments not in target (leaf to root)
    const toDeactivate = currentSegments.filter((r) => !targetSegments.includes(r));
    for (const route of toDeactivate.reverse()) {
      route.deactivate();
    }

    // Phase 4: Preload and activate new segments
    const toActivate = segments.filter((r) => !currentSegments.includes(r));

    for (const route of toActivate) {
      await route.activate(this.activeContext as ProviderContext<None, None, TRec>);
    }

    try {
      // Phase 4: Preload and activate new segments
      const toActivate = segments.filter((r) => !currentSegments.includes(r));

      for (const route of toActivate) {
      }

      // Update router state
      this.activeRoute = match.route;
      this.activeContext = { params: match.params, query: match.query, data: {} };
      this.activeSegments = targetSegments;
    } catch (error) {
      if (error instanceof Error && error.message === 'Navigation cancelled') {
        return;
      }
      throw error;
    } finally {
      this.abortController = undefined;
    }
  }

  public deactivate(): void {
    // Deactivate from leaf to root (reverse order)
    for (const route of [...(this.activeSegments || [])].reverse()) {
      route.deactivate();
    }

    this.activeRoute = undefined;
    this.activeSegments = undefined;
  }

  public cancel(): void {
    this.abortController?.abort();
  }

  public async preload(url: string | URL): Promise<void> {
    if (typeof url === 'string') {
      url = new URL(url, this.options.baseUrl);
    }

    const match = this.find(url);
    if (!match) return;

    const { query, params, segments } = match;
  }
}

export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
