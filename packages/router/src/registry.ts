import { DYNAMIC_ROUTE_KEY, FALLBACK_ROUTE_KEY, INDEX_ROUTE_KEY, WILDCARD_ROUTE_KEY } from './constant.js';
import type { UnknownRoute } from './router.js';
import type { TRec } from './types.js';

export type RouteMatch = {
  route: UnknownRoute;
  params: TRec;
  segments: UnknownRoute[];
};

const ROUTE_MAP_LINK = new WeakMap();

export class RouteMap extends Map {
  public get name() {
    return this.route.name;
  }

  public get index() {
    return this.get(INDEX_ROUTE_KEY) ?? this.route;
  }

  public get fallback(): UnknownRoute | undefined {
    return this.get(FALLBACK_ROUTE_KEY);
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
  ): RouteMatch | void {
    if (!urlSegments || !urlSegments.length) return;

    if (typeof urlSegments === 'string') {
      urlSegments = cleanPath(urlSegments).split('/');
    }

    const segment = urlSegments[index];
    const recursive = urlSegments.length > index + 1;

    if (!segment) {
      segments.push(this.index);

      return {
        route: this.index,
        segments,
        params,
      };
    }

    const staticRoute = this.get(segment) as RouteMap;
    const dynamicRoute = this.get(DYNAMIC_ROUTE_KEY) as RouteMap;
    const wildcardRoute = this.get(WILDCARD_ROUTE_KEY) as RouteMap;
    const fallbackRoute = this.get(FALLBACK_ROUTE_KEY) as RouteMap;

    if (staticRoute) {
      segments.push(staticRoute.index);

      if (recursive) {
        const childRoute = staticRoute.match(urlSegments, segments, params, index + 1);

        if (!childRoute && wildcardRoute) {
          segments.push(wildcardRoute.index);

          return {
            route: wildcardRoute.index,
            segments,
            params,
          };
        }

        return childRoute;
      } else {
        return {
          route: staticRoute.index,
          segments,
          params,
        };
      }
    } else if (dynamicRoute) {
      params[dynamicRoute.name] = segment;
      segments.push(dynamicRoute.index);

      if (recursive) {
        const childRoute = dynamicRoute.match(urlSegments, segments, params, index + 1);

        if (!childRoute && fallbackRoute) {
          segments.push(fallbackRoute.index);

          return {
            route: fallbackRoute.index,
            segments,
            params,
          };
        }

        return childRoute;
      } else {
        return {
          route: dynamicRoute.index,
          segments,
          params,
        };
      }
    } else if (wildcardRoute) {
      params['*'] = urlSegments.slice(index);
      segments.push(wildcardRoute.index);

      return {
        route: wildcardRoute.index,
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
