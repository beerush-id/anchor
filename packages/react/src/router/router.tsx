import type { RouteOptions, RoutePath, Router, RouteRegistry, UnknownRoute } from '@anchorlib/router';
import type { FC, ReactNode } from 'react';
import { snippet } from '../hoc.js';
import { createEffect } from '../hooks.js';
import type { AnyRoute, RouteComponent } from './types.js';

export const RouteViewer = snippet<{ route: UnknownRoute; children?: ReactNode }>(
  ({ route, children }) => {
    const Index = route.index?.renderer;
    const Layout = route.renderer;

    if (!route.active) return children;

    if (Layout) {
      if (Index && route.index?.active) {
        return (
          <Layout>
            <Index />
            {children}
          </Layout>
        );
      }

      return <Layout>{children}</Layout>;
    }

    if (Index) {
      return <Index />;
    }

    return children;
  },
  'Route',
  'Renderer',
  false
);

const CRouteRenderer: FC<{ route: UnknownRoute; registry: RouteRegistry }> = ({ route, registry }) => {
  if (route.renderer) {
    if (route.index?.renderer) {
      (route.renderer as FC).displayName = `Layout(${route.path || '/'})`;
    } else {
      (route.renderer as FC).displayName = `Index(${route.path || '/'})`;
    }
  }

  if (route.index?.renderer) {
    (route.index.renderer as FC).displayName = `Index(${route.path || '/'})`;
  }

  const children = Array.from(registry).map(([, child]) => {
    return <RouteRenderer key={child.route.path} route={child.route} registry={child} />;
  });

  return <RouteViewer route={route}>{children}</RouteViewer>;
};

CRouteRenderer.displayName = 'Definition(Route)';
export const RouteRenderer = CRouteRenderer;

const CUIRouter: FC<{ router: Router<ReactNode>; root: RouteComponent<AnyRoute> }> = ({ router }) => {
  const activate = async () => {
    await router.activate(location.href);
    window.scrollTo(0, 0);
  };

  activate();

  createEffect(() => {
    window.addEventListener('popstate', activate);

    return () => {
      window.removeEventListener('popstate', activate);
    };
  });

  return <RouteRenderer key={'/'} route={router.rootRoute} registry={router.rootRegistry} />;
};

CUIRouter.displayName = 'UIRouter';
export const UIRouter = CUIRouter;

export function route<T extends AnyRoute>(route: T): RouteComponent<T> {
  const UIRoute: FC<{ children?: ReactNode }> = ({ children }) => children;
  UIRoute.displayName = `Route Factory(${route.path || '/'})`;

  (UIRoute as RouteComponent<T>).index = route as T;
  (UIRoute as RouteComponent<T>).route = (path: RoutePath, options?: RouteOptions) =>
    route.route(path as never, options);

  return UIRoute as RouteComponent<T>;
}
