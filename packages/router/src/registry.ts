import { DYNAMIC_ROUTE_KEY, FALLBACK_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from './constant.js';
import type { MatchedRoute, TRec, UnknownRoute } from './types.js';

export class RouteRegistry extends Map {
  public get name() {
    return this.route.name;
  }

  constructor(public route: UnknownRoute) {
    super();
    ROUTE_MAP_LINK.set(this.route, this);
  }

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
    const fallbackRoute = this.get(FALLBACK_ROUTE_KEY) as RouteRegistry;

    if (staticRoute) {
      segments.push(staticRoute.route);

      if (recursive) {
        const childRoute = staticRoute.match(urlSegments, segments, params, index + 1);

        if (!childRoute && wildcardRoute) {
          segments.push(wildcardRoute.route);

          return {
            route: wildcardRoute.route,
            segments,
            params,
          };
        }

        return childRoute;
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
        const childRoute = dynamicRoute.match(urlSegments, segments, params, index + 1);

        if (!childRoute && fallbackRoute) {
          segments.push(fallbackRoute.route);

          return {
            route: fallbackRoute.route,
            segments,
            params,
          };
        }

        return childRoute;
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

function cleanPath(path: string) {
  return path
    .replace(/^[\/]+/, '')
    .replace(/[\/]+/g, '/')
    .replace(/[\/]+$/, '');
}
