import { untrack } from '@anchorlib/core';
import type { MatchedRoute, RouteOptions, RoutePath, Router, RouteRegistry, UnknownRoute } from '@anchorlib/router';
import type { FC, ReactNode } from 'react';
import { render, setup, snippet, template } from '../hoc.js';
import { createEffect, createRef } from '../hooks.js';
import type { AnyRoute, RouteComponent } from './types.js';

const STACK_REGISTRY = new WeakSet<UnknownRoute>();

type RouteStacks = Map<UnknownRoute, FC>;

export const RouteViewer = snippet<{ route: UnknownRoute; stacks: RouteStacks; children?: ReactNode }>(
  ({ route, stacks, children }) => {
    const Index = route.index?.renderer;
    const Layout = route.renderer;

    if (STACK_REGISTRY.has(route)) {
      const Stack = setup(() => {
        return render(() => {
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
        });
      });

      untrack(() => stacks.set(route, Stack));

      return null;
    }

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

const CRouteRenderer: FC<{ route: UnknownRoute; registry: RouteRegistry; stacks: RouteStacks }> = ({
  route,
  registry,
  stacks,
}) => {
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
    return <RouteRenderer key={child.route.path} route={child.route} registry={child} stacks={stacks} />;
  });

  return (
    <RouteViewer route={route} stacks={stacks}>
      {children}
    </RouteViewer>
  );
};

CRouteRenderer.displayName = 'Definition(Route)';
export const RouteRenderer = CRouteRenderer;

export type UIRouterProps = {
  router: Router<ReactNode>;
  root: RouteComponent<AnyRoute>;
  url?: string;
  headless?: boolean;
  resetScroll?: boolean;
};

const CUIRouter: FC<UIRouterProps> = ({ router, resetScroll, url, headless }) => {
  const stacks = createRef(new Map()).current;
  const activate = async () => {
    const match = router.find(url ?? location.href);
    await router.activate(url ?? location.href);

    if (headless || !resetScroll || STACK_REGISTRY.has((match as MatchedRoute)?.route)) return;
    window.scrollTo(0, 0);
  };

  activate();

  createEffect(() => {
    window.addEventListener('popstate', activate);

    return () => {
      window.removeEventListener('popstate', activate);
    };
  });

  return (
    <>
      <RouteRenderer key={'/'} route={router.rootRoute} registry={router.rootRegistry} stacks={stacks} />
      <StackRenderer stacks={stacks} />
    </>
  );
};

const StackRenderer = template<{ stacks: RouteStacks }>(({ stacks }) => {
  return Array.from(stacks.entries()).map(([route, Stack]) => <Stack key={route.path} />);
});

CUIRouter.displayName = 'UIRouter';
export const UIRouter = CUIRouter;

/**
 * Create a page component.
 * @param {T} routeNode
 * @returns {RouteComponent<T>}
 */
export function page<T extends AnyRoute>(routeNode: T): RouteComponent<T> {
  const UIRoute: FC<{ children?: ReactNode }> = ({ children }) => children;
  UIRoute.displayName = `Route Factory(${routeNode.path || '/'})`;

  (UIRoute as RouteComponent<T>).index = routeNode as T;
  (UIRoute as RouteComponent<T>).route = (path: RoutePath, options?: RouteOptions) =>
    routeNode.route(path as never, options);

  return UIRoute as RouteComponent<T>;
}

/**
 * @deprecated Use `page()` instead.
 * @type {<T extends AnyRoute>(routeNode: T) => RouteComponent<T>}
 */
export function route<T extends AnyRoute>(routeNode: T): RouteComponent<T> {
  return page(routeNode);
}

/**
 * Create a modal component.
 * @param {T} routeNode
 * @returns {RouteComponent<T>}
 */
export function modal<T extends AnyRoute>(routeNode: T): RouteComponent<T> {
  STACK_REGISTRY.add(routeNode);
  return page(routeNode);
}
