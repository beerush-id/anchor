import { isBrowser, setContext, untrack } from '@anchorlib/core';
import {
  getRenderProps,
  type MatchedRoute,
  type RouteExceptionRenderer,
  type RouteRegistry,
  type RouteRenderer,
  type RouteStatus,
  type RouteTarget,
  setExceptionRendererFactory,
  setRedirectHandler,
  setRendererFactory,
  type UnknownRoute,
} from '@anchorlib/router';
import type { FC, ReactNode } from 'react';
import { setup, snippet } from '../hoc.js';
import { createEffect, createRef } from '../hooks.js';
import { createSlot } from '../switch.js';
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
  const IndexSnippet = snippet<Record<string, unknown>>(
    function IndexSnippet() {
      if (!route.index?.active) return;
      const Index = route.index?.renderer;
      return Index ? <Index {...getRenderProps(route.index as never)} /> : null;
    },
    route.path,
    'Index',
    false
  );

  const LayoutSnippet = snippet(
    function RouteSnippet() {
      if (!route.active) return children;

      const Layout = route.renderer;
      const layoutProps = getRenderProps(route);
      const Exception = route.exceptionRenderer;
      if (Exception) {
        (Exception as FC).displayName = `Exception(${route.path})`;
      }
      const exception = route.exception && Exception ? <Exception error={route.exception} {...layoutProps} /> : null;
      const content = (
        <>
          <IndexSnippet />
          {children}
          {exception}
        </>
      );

      if (STACK_REGISTRY.has(route)) {
        if (!Layout) {
          return <div className={'route-modal'}>{content}</div>;
        }

        return (
          <div className={'route-modal'}>
            <Layout {...layoutProps}>{content}</Layout>
          </div>
        );
      }

      return Layout ? <Layout {...layoutProps}>{content}</Layout> : content;
    },
    route.path,
    STACK_REGISTRY.has(route) ? 'Modal' : 'Page',
    false
  );

  if (STACK_REGISTRY.has(route)) {
    untrack(() => stacks.set(route, LayoutSnippet));
    return null;
  }

  return <LayoutSnippet />;
}
RouteViewer.displayName = 'Renderer(Route)';

/**
 * Renders a specific route and recursively processes its child routes.
 */
export function RouteRendererComponent({
  route,
  registry,
  stacks,
}: {
  route: UnknownRoute;
  registry: RouteRegistry;
  stacks: RouteStacks;
}) {
  if (route.renderer) {
    if (registry.size) {
      (route.renderer as FC).displayName = `Layout(${route.path})`;
    } else {
      (route.renderer as FC).displayName = `Content(${route.path})`;
    }
  }

  if (route.index?.renderer) {
    (route.index.renderer as FC).displayName = `Content(${route.path})`;
  }

  const children = Array.from(registry).map(([, child]) => {
    return <RouteRendererComponent key={child.route.path} route={child.route} registry={child} stacks={stacks} />;
  });

  return (
    <RouteViewer key={route.path} route={route} stacks={stacks}>
      {children}
    </RouteViewer>
  );
}

RouteRendererComponent.displayName = 'Definition(Route)';

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

  const routes = Array.from(router.routes).map((registry) => (
    <RouteRendererComponent key={registry.route.path} route={registry.route} registry={registry} stacks={stacks} />
  ));

  return (
    <>
      {routes}
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
 * @param routeNode - The route node to create a component for.
 * @returns A route component.
 */
export function page<T>(routeNode: RouteTarget<T>): RouteComponent<T> {
  const UIRoute: FC<{ children?: ReactNode }> = function UIRoute({ children }) {
    return children;
  };
  UIRoute.displayName = `Route Factory(${(routeNode as AnyRoute).path})`;

  (UIRoute as RouteComponent<AnyRoute>).route = routeNode as AnyRoute;
  (UIRoute as RouteComponent<AnyRoute>).render = (renderer) => {
    (routeNode as AnyRoute).render(renderer);
    return UIRoute as RouteComponent<AnyRoute>;
  };
  (UIRoute as RouteComponent<AnyRoute>).renderAsync = (loader, fallback) => {
    (routeNode as AnyRoute).renderAsync(loader, fallback);
    return UIRoute as RouteComponent<AnyRoute>;
  };

  return UIRoute as RouteComponent<T>;
}

/**
 * @deprecated Use `page()` instead.
 * @type {<T extends AnyRoute>(routeNode: T) => RouteComponent<T>}
 */
export function route<T>(routeNode: T): RouteComponent<T> {
  return page(routeNode as never);
}

/**
 * Create a modal component.
 * @param routeNode - The route node to create a component for.
 * @returns A route component.
 */
export function modal<T>(routeNode: RouteTarget<T>): RouteComponent<T> {
  STACK_REGISTRY.add(routeNode as never);
  return page(routeNode);
}

const ROUTE_CTX = Symbol('route-context');
const ROUTE_KEY = 'status' as RouteStatus;

const createRenderer = <TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup((props) => {
    setContext(ROUTE_CTX, route.state);
    return renderer(props as never) as never;
  }, route.path) as RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>;
};

/**
 * A slot component for the {@link Route} component.
 * @property for - The status value to match against.
 * @property children - The children to render if the status matches.
 */
export const RouteSlot = createSlot<RouteStatus>(ROUTE_CTX, ROUTE_KEY, 'RouteSwitch');

const createExceptionRenderer = <TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup(renderer as never, route.path) as RouteExceptionRenderer<
    TParams,
    TQueryParams,
    TData,
    PParams,
    PQuery,
    PData,
    TOutput
  >;
};

setRendererFactory(createRenderer);
setExceptionRendererFactory(createExceptionRenderer);

if (isBrowser()) {
  if (location.pathname.endsWith('/')) {
    const url = `${location.pathname.replace(/\/$/, '')}${location.search}`;
    history.replaceState(null, '', url);
  }

  setRedirectHandler((redirect) => {
    navigate((redirect as any).route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    } as never);
  });
}
