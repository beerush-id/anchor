import { mutable } from '@anchorlib/core';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { RouteRegistry } from './registry.js';
import { Route } from './route.js';
import type {
  ActiveContext,
  ExtractParams,
  ExtractQueryParams,
  GuardContext,
  MatchedRoute,
  RouteOptions,
  RoutePath,
  RouterOptions,
  TRec,
  UnknownRoute,
} from './types.js';

export class Router {
  private readonly rootRoute: UnknownRoute;
  private readonly rootRegistry: RouteRegistry;

  public readonly options: RouterOptions;

  public activeRoute: UnknownRoute | undefined;
  public activeContext: ActiveContext<TRec, TRec, TRec> | undefined;
  public activeSegments: UnknownRoute[] | undefined;

  constructor(options?: RouterOptions) {
    this.options = { baseUrl: DEFAULT_CONFIG.baseUrl, ...options };

    this.rootRoute = new Route('/');
    this.rootRegistry = new RouteRegistry(this.rootRoute);
  }

  public route<
    TPath extends RoutePath,
    TParams extends ExtractParams<TPath>,
    TQueryParams extends ExtractQueryParams<TPath>,
    TOptions extends RouteOptions,
    TData,
  >(path: TPath, options?: TOptions): Route<TPath, TParams, TQueryParams, TOptions, TData> {
    const route = new Route(path, options);

    if (path === ('/' as TPath)) {
      this.rootRoute.index = route;
      return this.rootRoute as never;
    }

    const routeMap = new RouteRegistry(route);

    if (route.type === ROUTE_TYPE.STATIC) {
      this.rootRegistry.set(route.name, routeMap);
    } else if (route.type === ROUTE_TYPE.DYNAMIC) {
      this.rootRegistry.set(DYNAMIC_ROUTE_KEY, routeMap);
    } else if (route.type === ROUTE_TYPE.WILDCARD) {
      this.rootRegistry.set(WILDCARD_ROUTE_KEY, routeMap);
    }

    return route as Route<TPath, TParams, TQueryParams, TOptions, TData>;
  }

  public find(url: string) {
    const parsedUrl = new URL(url, this.options.baseUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');

    return this.rootRegistry.match(pathname);
  }

  private async buildContext(match: MatchedRoute): Promise<ActiveContext<TRec, TRec, TRec>> {
    const { segments, params } = match;

    const controller = new AbortController();
    const ctx: GuardContext<TRec, TRec> = {
      params,
      query: {},
      signal: controller.signal,
      controller,
    };

    // Execute guards (parent to leaf)
    for (const route of segments) {
      for (const guard of route.guards) {
        const result = await guard(ctx);
        if (!result) throw new Error('Guard failed');
      }
    }

    // Execute providers (parent to leaf)
    const data: TRec = {};
    for (const route of segments) {
      for (const [name, provider] of route.providers) {
        data[name] = await provider(ctx as never);
      }
    }

    return { params, query: ctx.query, data };
  }

  public async activate(url: string): Promise<void> {
    const match = this.find(url);
    if (!match) return;

    // Build context (plain object)
    const context = await this.buildContext(match);

    // Create reactive context
    const reactiveContext = mutable(context);

    // Assign to the LEAF route only
    match.route.context = reactiveContext as never;
    match.route.active = true;

    // Update router state
    this.activeRoute = match.route;
    this.activeContext = reactiveContext;
    this.activeSegments = match.segments;
  }

  public async refresh(): Promise<void> {
    if (!this.activeRoute || !this.activeSegments) return;

    const match = {
      route: this.activeRoute,
      segments: this.activeSegments,
      params: this.activeContext?.params || {},
    };

    // Build new context
    const newContext = await this.buildContext(match as never);

    // Update existing reactive context in-place
    if (this.activeRoute.context) {
      Object.assign(this.activeRoute.context, newContext);
    }
  }
}

export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
