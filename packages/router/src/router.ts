import { enforceCacheLimit, isCacheExpired } from './cache.js';
import { DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { parseQuery } from './query.js';
import { Redirect, redirectUrl } from './redirect.js';
import { RouteRegistry } from './registry.js';
import { Route } from './route.js';
import type {
  ActiveContext,
  CachedMatch,
  ExtractParams,
  ExtractQueryParams,
  GuardContext,
  MatchedState,
  None,
  ProviderContext,
  RouteOptions,
  RoutePath,
  RouterOptions,
  TRec,
  UnknownRoute,
} from './types.js';

export class Router {
  private readonly rootRoute: UnknownRoute;
  private readonly rootRegistry: RouteRegistry;
  private readonly cache = new Map<string, CachedMatch>();
  private abortController?: AbortController;

  public readonly options: RouterOptions;

  public activeRoute: UnknownRoute | undefined;
  public activeContext: ActiveContext<TRec, TRec, TRec> | undefined;
  public activeSegments: UnknownRoute[] | undefined;

  constructor(options?: RouterOptions) {
    this.options = {
      baseUrl: DEFAULT_CONFIG.baseUrl,
      maxRetries: DEFAULT_CONFIG.maxRetries,
      retryDelay: DEFAULT_CONFIG.retryDelay,
      retryMode: DEFAULT_CONFIG.retryMode,
      keepAlive: DEFAULT_CONFIG.keepAlive,
      ...options,
    };

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
    const route = new Route(path, options);

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

  public find(url: string): MatchedState | void {
    const parsedUrl = new URL(url, this.options.baseUrl);
    const pathname = parsedUrl.pathname.replace(/\/+$/, ''); // Strip trailing slash
    const query = parseQuery(parsedUrl.search);

    const match = this.rootRegistry.match(pathname) as MatchedState;

    if (match) {
      match.query = query;
    }

    return match;
  }

  public async activate(url: string, redirectDepth = 0): Promise<void> {
    // Prevent redirect loops
    if (redirectDepth > 10) {
      throw new Error('Redirect loop detected');
    }

    // Cancel any ongoing activation
    this.cancel();

    const match = this.find(url);
    if (!match) return;

    const currentSegments = this.activeSegments || [];
    const targetSegments = match.segments;

    // Create abort controller for this activation
    const controller = new AbortController();
    this.abortController = controller;

    try {
      // Build guard context (params + query only)
      const guardContext: GuardContext<TRec, TRec> = {
        params: match.params,
        query: match.query,
        signal: controller.signal,
      };

      // Phase 1: Check all guards for target segments
      for (const route of targetSegments) {
        const result = await route.check(guardContext as GuardContext<None, None>);

        if (result === false) {
          // Guard blocked - set error state on leaf route
          const leafRoute = targetSegments[targetSegments.length - 1];
          leafRoute.error = {
            type: 'guard',
            message: 'Navigation blocked by guard',
            route: leafRoute,
          };
          return;
        }

        if (result instanceof Redirect) {
          return this.activate(redirectUrl(result), redirectDepth + 1);
        }
      }

      // Phase 2: Deactivate segments not in target (leaf to root)
      const toDeactivate = currentSegments.filter((r) => !targetSegments.includes(r));
      for (const route of toDeactivate.reverse()) {
        route.deactivate();
      }

      // Phase 3: Check cache and build provider context
      const cached = this.cache.get(url);
      const providerContext: ProviderContext<TRec, TRec, TRec> = {
        ...guardContext,
        data: {},
      };

      // Phase 4: Preload and activate new segments
      const toActivate = targetSegments.filter((r) => !currentSegments.includes(r));

      for (const route of toActivate) {
        if (cached && !isCacheExpired(cached, this.options.maxAge)) {
          // Reuse cached context data
          Object.assign(providerContext.data, cached.context.data);
          route.activate(providerContext as ProviderContext<None, None, TRec>);
        } else {
          // Fresh preload
          try {
            await route.preload(providerContext as ProviderContext<None, None, TRec>);
            route.activate(providerContext as ProviderContext<None, None, TRec>);
          } catch (error) {
            // Set error state on the route that failed
            route.error = {
              type: 'provider',
              message: error instanceof Error ? error.message : 'Provider failed',
              route,
              cause: error instanceof Error ? error : undefined,
            };
            // Still activate the route so UI can show error state
            route.activate(providerContext as ProviderContext<None, None, TRec>);
          }
        }
      }

      // Phase 5: Update context for existing segments (params/query may have changed)
      const toUpdate = targetSegments.filter((r) => currentSegments.includes(r));
      for (const route of toUpdate) {
        // Update context in place (reactive)
        if (route.context) {
          Object.assign(route.context, providerContext);
        }
      }

      // Update router state
      this.activeRoute = match.route;
      this.activeSegments = targetSegments;

      // Cache the result
      this.cache.set(url, {
        segments: targetSegments,
        context: providerContext,
        timestamp: Date.now(),
      });

      // Enforce cache limit if set
      if (this.options.cacheLimit) {
        enforceCacheLimit(this.cache, this.options.cacheLimit);
      }
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

  public clearCache(): void {
    this.cache.clear();
  }

  public async preload(url: string): Promise<void> {
    const match = this.find(url);
    if (!match) return;

    const controller = new AbortController();
    const guardContext: GuardContext<TRec, TRec> = {
      params: match.params,
      query: match.query,
      signal: controller.signal,
    };

    // Check guards
    for (const route of match.segments) {
      const result = await route.check(guardContext as GuardContext<None, None>);
      if (result === false || result instanceof Redirect) return;
    }

    // Preload providers
    const providerContext: ProviderContext<TRec, TRec, TRec> = {
      ...guardContext,
      data: {},
    };

    for (const route of match.segments) {
      await route.preload(providerContext as ProviderContext<None, None, TRec>);
    }

    // Cache the result
    this.cache.set(url, {
      segments: match.segments,
      context: providerContext,
      timestamp: Date.now(),
    });

    if (this.options.cacheLimit) {
      enforceCacheLimit(this.cache, this.options.cacheLimit);
    }
  }
}

export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
