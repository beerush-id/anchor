import { DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import type { MatchedRoute, TRec, UnknownRoute } from './types.js';

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
export class RouteRegistry extends Map {
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
   */
  constructor(public route: UnknownRoute) {
    super();
    ROUTE_MAP_LINK.set(this.route, this);
  }

  /**
   * Matches a URL path against the registered routes.
   *
   * Recursively traverses the route tree to find the best match.
   * Supports static segments, dynamic parameters, and wildcards.
   *
   * @param urlSegments - The URL path to match, as a string or array of segments
   * @param segments - Accumulator for matched route segments (internal use)
   * @param params - Accumulator for extracted parameters (internal use)
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
    urlSegments: string | string[],
    segments: UnknownRoute[] = [],
    params: TRec = {},
    index = 0
  ): MatchedRoute | void {
    if (!urlSegments || !urlSegments.length) return;

    if (typeof urlSegments === 'string') {
      urlSegments = cleanPath(urlSegments).split('/');
    }

    const segment = urlSegments[index];
    const recursive = urlSegments.length > index + 1;

    if (!segment) {
      segments.push(this.route);

      return {
        route: this.route,
        segments,
        params,
      };
    }

    const staticRoute = this.get(segment) as RouteRegistry;
    const dynamicRoute = this.get(DYNAMIC_ROUTE_KEY) as RouteRegistry;
    const wildcardRoute = this.get(WILDCARD_ROUTE_KEY) as RouteRegistry;

    if (staticRoute) {
      segments.push(staticRoute.route);

      if (recursive) {
        return staticRoute.match(urlSegments, segments, params, index + 1);
      } else {
        return {
          route: staticRoute.route,
          segments,
          params,
        };
      }
    } else if (dynamicRoute) {
      params[dynamicRoute.name] = segment;
      segments.push(dynamicRoute.route);

      if (recursive) {
        return dynamicRoute.match(urlSegments, segments, params, index + 1);
      } else {
        return {
          route: dynamicRoute.route,
          segments,
          params,
        };
      }
    } else if (wildcardRoute) {
      params['*'] = urlSegments.slice(index);
      segments.push(wildcardRoute.route);

      return {
        route: wildcardRoute.route,
        segments,
        params,
      };
    }
  }
}

/**
 * Cleans a path string by normalizing slashes.
 *
 * Removes leading, trailing, and duplicate slashes.
 *
 * @param path - The path string to clean
 * @returns The cleaned path string
 *
 * @internal
 */
function cleanPath(path: string) {
  return path
    .replace(/^[\/]+/, '')
    .replace(/[\/]+/g, '/')
    .replace(/[\/]+$/, '');
}
