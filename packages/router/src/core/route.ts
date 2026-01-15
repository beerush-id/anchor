import { DEFAULT_CONFIG } from './constant.js';
import type { Route, RouteBuilder, RouteOptions, RouteSegment, TRec, TrailingSlashMode } from './types.js';
import { buildUrl } from './url.js';

export function createRouteModule(): RouteBuilder {
  const routeMap = new Map<string, Route<string, TRec, TRec, TRec, TRec>>();
  const childMap = new Map<Route<string, TRec, TRec, TRec, TRec>, Map<string, Route<string, TRec, TRec, TRec, TRec>>>();

  // WeakMaps to store internal state
  const metaBuilders = new WeakMap<object, (data: unknown, params: TRec, query: TRec) => TRec>();
  const guards = new WeakMap<object, (ctx: TRec) => boolean | TRec | Promise<boolean | TRec>>();
  const resolvers = new WeakMap<object, { resolver: (ctx: TRec) => unknown; options?: TRec }>();

  const routeFn = <TPath extends string, TParams, TQueryParams>(
    path: TPath,
    options: RouteOptions<TParams, TQueryParams>,
    parent?: Route<string, TRec, TRec, RouteOptions<TRec, TRec>, TRec>
  ) => {
    if (path !== '/') {
      const trailingSlashOption = (options?.trailingSlash ?? 'strip') as TrailingSlashMode;

      if (trailingSlashOption === 'strip' && path.endsWith('/')) {
        path = path.replace(/\/+$/, '') as TPath;
      } else if (trailingSlashOption === 'require' && !path.endsWith('/')) {
        path = `${path}/` as TPath;
      }
    }

    const pathType = path.startsWith(':') ? 'param' : path.startsWith('**') ? 'wildcard' : 'static';
    const baseName = path.replace(/^\/+|\/+$/g, '');
    const pathName = baseName.startsWith(':') ? baseName.slice(1) : baseName;

    const segment: RouteSegment = { path: baseName, type: pathType, name: pathName };
    const segments = [...(parent?.segments ?? []), segment];

    const baseUrl = options?.baseUrl ?? parent?.options?.baseUrl ?? DEFAULT_CONFIG.baseUrl;
    const urlBuilder = ((params, query): URL => {
      return buildUrl(baseUrl, segments, params, query);
    }) as Route<TPath, TRec, TRec, TRec, TRec>;

    const childRoutes = new Map();

    routeMap.set(urlBuilder.path, urlBuilder as never);
    childMap.set(urlBuilder as never, childRoutes);

    const childBuilder = (childPath: string, childOptions: RouteOptions<TRec, TRec>) => {
      const instance = routeFn(childPath, childOptions, urlBuilder as never);
      childRoutes.set(instance.path, instance);
      return instance;
    };

    const metaFn = (builder: (data: unknown, params: TRec, query: TRec) => TRec) => {
      metaBuilders.set(urlBuilder, builder);
      return urlBuilder;
    };

    const guardFn = (guard: (ctx: TRec) => boolean | TRec | Promise<boolean | TRec>) => {
      guards.set(urlBuilder, guard);
      return urlBuilder;
    };

    const resolveFn = (resolver: (ctx: TRec) => unknown, resolveOptions?: TRec) => {
      resolvers.set(urlBuilder, { resolver, options: resolveOptions });
      return urlBuilder;
    };

    Object.defineProperties(urlBuilder, {
      type: { value: pathType, writable: false, enumerable: true },
      name: { value: pathName, writable: false, enumerable: true },
      path: { value: path, writable: false, enumerable: true },
      options: { value: options, writable: false, enumerable: true },

      segments: { value: segments, writable: false, enumerable: true },
      children: { value: childRoutes, writable: false, enumerable: true },

      route: { value: childBuilder, writable: false, enumerable: true },
      meta: { value: metaFn, writable: false, enumerable: true },
      guard: { value: guardFn, writable: false, enumerable: true },
      resolve: { value: resolveFn, writable: false, enumerable: true },
    });

    return urlBuilder;
  };

  return routeFn as RouteBuilder;
}

export const route = createRouteModule();
