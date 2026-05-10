import { DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import { ROUTE_TYPE } from './enum.js';
import { parseQuery } from './query.js';
import { createState, getStore, safeAssign } from './store.js';
import type { MatchedRoute, MatchRouteSegment, ProviderContext, TRec, UnknownRoute } from './types.js';

export class ContextStore extends Map {
  public get(key: string | symbol) {
    if (!this.has(key)) {
      this.set(key, createState({ params: {}, query: {}, data: {} }));
    }

    return super.get(key) as ProviderContext<TRec, TRec, TRec>;
  }
}

/**
 * A registry for organizing and matching routes.
 *
 * Extends Map to store child routes keyed by their segment names.
 * Supports static, dynamic (`:param`), and wildcard (`*`) route matching.
 *
 * @example
 * ```ts
 * const registry = new RouteRegistry(route);
 * const match = registry.match('/users/123');
 * ```
 */
export class RouteRegistry extends Map<string | symbol, RouteRegistry> {
  private get store(): ContextStore {
    const rootStore = getStore();
    if (!rootStore.has(this)) {
      rootStore.set(this, new ContextStore());
    }
    return rootStore.get(this) as ContextStore;
  }

  /**
   * Gets the name of the route this registry is associated with.
   *
   * @returns The route name
   */
  public get name() {
    return this.route.name;
  }

  /**
   * Creates a new RouteRegistry instance.
   *
   * @param route - The route this registry is associated with
   * @param slave
   */
  constructor(
    public route: UnknownRoute,
    public slave = false
  ) {
    super();
    ROUTE_MAP_LINK.set(this.route, this);
  }

  /**
   * Matches a URL path against the registered routes.
   *
   * Recursively traverses the route tree to find the best match.
   * Supports static segments, dynamic parameters, and wildcards.
   *
   * @param url
   * @param urlSegments - The URL path to match, as a string or array of segments
   * @param segments - Accumulator for matched route segments (internal use)
   * @param params - Accumulator for extracted parameters (internal use)
   * @param query
   * @param index - Current segment index (internal use)
   * @returns A matched route with segments and params, or undefined if no match
   *
   * @example
   * ```ts
   * const match = registry.match('/users/123');
   * if (match) {
   *   console.log(match.route); // The matched route
   *   console.log(match.params); // { id: '123' }
   *   console.log(match.segments); // Array of matched routes
   * }
   * ```
   */
  public match(
    url: URL,
    urlSegments?: string | string[],
    segments: MatchRouteSegment[] = [],
    params: TRec = {},
    query?: TRec,
    index = 0
  ): MatchedRoute | void {
    if (!url || !url.pathname) return;

    if (!urlSegments) {
      urlSegments = cleanPath(url.pathname, this.slave ? '' : '/').split('/');
    }

    if (!query) {
      query = parseQuery(url.search);
    }

    const storage = this.store;
    const segment = urlSegments[index];
    const recursive = urlSegments.length > index + 1;

    const staticRoute = segment === this.route.name ? this : (this.get(segment) as RouteRegistry);
    const dynamicRoute = this.get(DYNAMIC_ROUTE_KEY) as RouteRegistry;
    const wildcardRoute = this.get(WILDCARD_ROUTE_KEY) as RouteRegistry;

    if (staticRoute) {
      const store = storage.get(segment);
      segments.push({ route: staticRoute.route, store });

      if (recursive) {
        return staticRoute.match(url, urlSegments, segments, params, query, index + 1);
      } else {
        safeAssign(store.query, query);

        if (staticRoute.route.index) {
          const $store = storage.get(`${segment}:index`);
          safeAssign($store.query, store.query);

          segments.push({ route: staticRoute.route.index as never, store: $store });
        }

        return {
          route: staticRoute.route,
          query,
          segments,
          params,
        };
      }
    } else if (dynamicRoute) {
      const store = storage.get(ROUTE_TYPE.DYNAMIC);
      const name = dynamicRoute.name.replace(/^:/, '');

      store.params[name] = params[name] = segment;
      segments.push({ route: dynamicRoute.route, store });

      if (recursive) {
        return dynamicRoute.match(url, urlSegments, segments, params, query, index + 1);
      } else {
        safeAssign(store.query, query);

        if (dynamicRoute.route.index) {
          const $store = storage.get(`${ROUTE_TYPE.DYNAMIC}:index`);

          safeAssign($store.query, store.query);
          safeAssign($store.params, store.params);

          segments.push({ route: dynamicRoute.route.index as never, store: $store });
        }

        return {
          query,
          route: dynamicRoute.route,
          segments,
          params,
        };
      }
    } else if (wildcardRoute) {
      const store = storage.get(ROUTE_TYPE.WILDCARD);

      store.params['*'] = params['*'] = urlSegments.slice(index);
      safeAssign(store.query, query);

      segments.push({ route: wildcardRoute.route, store });

      if (wildcardRoute.route.index) {
        const $store = storage.get(`${ROUTE_TYPE.WILDCARD}:index`);

        safeAssign($store.query, store.query);
        safeAssign($store.params, store.params);

        segments.push({ route: wildcardRoute.route.index as never, store: $store });
      }

      return {
        query,
        route: wildcardRoute.route,
        segments,
        params,
      };
    } else {
      const exception = new Error('Not found.');
      const lastSegment = segments[segments.length - 1];

      return { query, route: lastSegment?.route, segments, params, exception };
    }
  }
}

/**
 * Cleans a path string by normalizing slashes.
 *
 * Removes leading, trailing, and duplicate slashes.
 *
 * @param path - The path string to clean
 * @param leading - The leading slash to use (default: '/')
 * @returns The cleaned path string
 *
 * @internal
 */
function cleanPath(path: string, leading = '/') {
  return path
    .replace(/^[\/]+/, leading)
    .replace(/[\/]+/g, '/')
    .replace(/[\/]+$/, '');
}
