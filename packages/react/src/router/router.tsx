import { untrack } from '@anchorlib/core';
import {
  type MatchedRoute,
  type RouteOptions,
  type RoutePath,
  type RouteRegistry,
  setRedirectHandler,
  type UnknownRoute,
} from '@anchorlib/router';
import type { FC, ReactNode } from 'react';
import { snippet } from '../hoc.js';
import { createEffect, createRef } from '../hooks.js';
import { navigate } from './navigate.js';
import type { AnyRoute, RouteComponent, RouteStacks, UIRouterProps } from './types.js';

const STACK_REGISTRY = new WeakSet<UnknownRoute>();

/**
 * A reactive snippet that renders the view for a given route and its children.
 */
export function RouteViewer({
  route,
  stacks,
  children,
}: {
  route: UnknownRoute;
  stacks: RouteStacks;
  children?: ReactNode;
}) {
  const Snippet = snippet(
    function RouteSnippet() {
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
    route.path,
    STACK_REGISTRY.has(route) ? 'Modal' : 'Page',
    false
  );

  if (STACK_REGISTRY.has(route)) {
    untrack(() => stacks.set(route, Snippet));
    return null;
  }

  return <Snippet />;
}
RouteViewer.displayName = 'Renderer(Route)';

/**
 * Renders a specific route and recursively processes its child routes.
 */
export function RouteRenderer({
  route,
  registry,
  stacks,
}: {
  route: UnknownRoute;
  registry: RouteRegistry;
  stacks: RouteStacks;
}) {
  if (route.renderer) {
    if (route.index?.renderer) {
      (route.renderer as FC).displayName = `Layout(${route.path})`;
    } else {
      (route.renderer as FC).displayName = `Index(${route.path})`;
    }
  }

  if (route.index?.renderer) {
    (route.index.renderer as FC).displayName = `Index(${route.path})`;
  }

  const children = Array.from(registry).map(([, child]) => {
    return <RouteRenderer key={child.route.path} route={child.route} registry={child} stacks={stacks} />;
  });

  return (
    <RouteViewer route={route} stacks={stacks}>
      {children}
    </RouteViewer>
  );
}

RouteRenderer.displayName = 'Definition(Route)';

/**
 * The root router component that mounts the application route tree to React.
 */
export function UIRouter({ router, resetScroll, url, headless }: UIRouterProps) {
  const stacks = createRef(new Map()).current;
  const activate = async () => {
    const match = router.find(url ?? location.href);

    if (resetScroll && !STACK_REGISTRY.has((match as MatchedRoute)?.route)) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: typeof resetScroll === 'string' ? resetScroll : 'smooth',
      });
    }

    await router.activate(url ?? location.href);
  };

  if (!headless) {
    activate();
  }

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
}

const StackRenderer = snippet<{ stacks: RouteStacks }>(
  function StackRenderer({ stacks }) {
    return Array.from(stacks.entries()).map(([route, Stack]) => <Stack key={route.path} />);
  },
  'Modal',
  'Renderer',
  false
);

UIRouter.displayName = 'UIRouter';

/**
 * Create a page component.
 * @param {T} routeNode
 * @returns {RouteComponent<T>}
 */
export function page<T>(routeNode: T): RouteComponent<T> {
  const UIRoute: FC<{ children?: ReactNode }> = function UIRoute({ children }) {
    return children;
  };
  UIRoute.displayName = `Route Factory(${(routeNode as AnyRoute).path})`;

  (UIRoute as RouteComponent<AnyRoute>).index = routeNode as AnyRoute;
  (UIRoute as RouteComponent<AnyRoute>).route = (path: RoutePath, options?: RouteOptions) => {
    return (routeNode as AnyRoute).route(path as never, options);
  };
  (UIRoute as RouteComponent<AnyRoute>).render = (renderer) => {
    (routeNode as AnyRoute).render(renderer);

    return UIRoute as RouteComponent<AnyRoute>;
  };

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

if (typeof window !== 'undefined') {
  if (location.pathname.endsWith('/')) {
    const url = `${location.pathname.replace(/\/$/, '')}${location.search}`;
    history.replaceState(null, '', url);
  }

  setRedirectHandler((redirect) => {
    navigate(redirect.route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    });
  });
}
