import { $symbol, type AnyType, createContext, isBrowser, setContext, sleep, untrack } from '@airlib/core';
import {
  createRouter as createAppRouter,
  DEFAULT_CONFIG,
  getRenderProps,
  type MatchedRoute,
  Redirect,
  type RouteContext,
  type RouteExceptionRenderer,
  type RouteRegistry,
  type RouteRenderer,
  type RouterOptions,
  type RouteStatus,
  type RouteTarget,
  setExceptionRendererFactory,
  setRedirectHandler,
  setRendererFactory,
  type UnknownRoute,
} from '@airlib/router';
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
    () => {
      const Renderer = route.index?.renderer;
      if (route.exception || !route.authenticated || !route.index?.active || !Renderer) return;

      return <Renderer {...getRenderProps(route.index as never)} />;
    },
    route.path,
    'Index',
    false
  );

  const ChildrenSnippet = snippet(
    () => {
      if (route.exception || !route.authenticated) return;
      return children;
    },
    route.path,
    'Children',
    false
  );

  const ExceptionSnippet = snippet(
    () => {
      const Renderer = route.exceptionRenderer as FC<AnyType>;
      if (!Renderer) return;
      if (route.exception || !route.authenticated) {
        return <Renderer error={route.exception ?? route.state.error} {...getRenderProps(route)} />;
      }
    },
    route.path,
    'RouteException',
    false
  );

  const ShellSnippet = snippet(
    () => {
      const hasIndex = typeof route.index?.renderer !== 'undefined';
      const hasChildren = route.children!.size > 0 || hasIndex;
      const hasException = route.exception || !route.authenticated;
      const layoutProps = getRenderProps(route);
      const Renderer = route.renderer ?? ((props) => props.children);

      if (hasException && !hasChildren) return <ExceptionSnippet />;

      return (
        <Renderer {...layoutProps}>
          <IndexSnippet />
          <ChildrenSnippet />
          <ExceptionSnippet />
        </Renderer>
      );
    },
    route.path,
    'Shell',
    false
  );

  const RouteSnippet = snippet(
    () => {
      if (!route.active) return children;
      if (STACK_REGISTRY.has(route)) {
        return (
          <div className={'route-modal'}>
            <ShellSnippet />
          </div>
        );
      }

      return <ShellSnippet />;
    },
    route.path,
    STACK_REGISTRY.has(route) ? 'Modal' : 'Page',
    false
  );

  if (STACK_REGISTRY.has(route)) {
    untrack(() => stacks.set(route, RouteSnippet));
    return null;
  }

  return <RouteSnippet />;
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
    if (registry.size || route.index?.renderer) {
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

const ROUTER_CTX = $symbol('router-context');
export const uiRouterCtx = createContext<UIRouterProps>(ROUTER_CTX);

/**
 * The root router component that mounts the application route tree to React.
 */
export function UIRouter(props: UIRouterProps) {
  uiRouterCtx.set(props);

  const { router, resetScroll, url, headless = true, children } = props;
  const stacks = createRef(new Map()).current;
  const activate = async (e?: PopStateEvent) => {
    const behavior = typeof resetScroll === 'string' ? resetScroll : 'smooth';

    const { from, to } = e?.state ?? {};
    if (to?.hash && to?.path === from?.path) {
      scrollIntoView(to?.hash, behavior);
      return;
    }
    const match = router.find(url ?? location.href);

    if (isBrowser() && resetScroll !== false && !STACK_REGISTRY.has((match as MatchedRoute)?.route)) {
      window.scrollTo({ top: 0, left: 0, behavior });
    }

    try {
      await router.activate(to?.href ?? location.href);
    } catch (error) {
      if (!(error instanceof Redirect)) {
        console.error(error);
      }
      return;
    }

    if (to?.hash) {
      await sleep(100);
      scrollIntoView(to?.hash, behavior);
    }
  };

  if (!headless) {
    void activate();
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
      {children}
    </>
  );
}

/* istanbul ignore next */
function scrollIntoView(hash: string, behavior: ScrollBehavior = 'smooth') {
  const element = document.getElementById(hash);
  if (element) {
    element.scrollIntoView({ block: 'start', inline: 'start', behavior });
  }
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
  UIRoute.displayName = `Route Factory(${(routeNode as unknown as AnyRoute).path})`;

  (UIRoute as RouteComponent<AnyRoute>).route = routeNode as unknown as AnyRoute;
  (UIRoute as RouteComponent<UnknownRoute>).render = (renderer) => {
    (routeNode as unknown as AnyRoute).render(renderer);
    return UIRoute as RouteComponent<UnknownRoute>;
  };
  (UIRoute as AnyType).renderAsync = (loader: AnyType, fallback: AnyType) => {
    (routeNode as unknown as AnyRoute).renderAsync(loader, fallback);
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

const ROUTE_CTX = $symbol('route-context');
const ROUTE_KEY = 'status' as RouteStatus;
export const routeCtx = createContext<RouteContext<AnyType, AnyType, AnyType>>(ROUTE_CTX);

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

/* istanbul ignore next */
if (isBrowser()) {
  if (location.pathname.endsWith('/')) {
    const url = `${location.pathname.replace(/\/$/, '')}${location.search}`;
    history.replaceState(null, '', url);
  }

  setRedirectHandler((redirect) => {
    navigate(redirect.url ?? (redirect as AnyType).route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    } as never);
  });
}

/**
 * Creates a new Router instance.
 *
 * Convenience function for creating a router with optional options.
 *
 * @param options - Optional router configuration
 * @returns A new Router instance
 */
export function createRouter<V = ReactNode>(options?: RouterOptions) {
  return createAppRouter<V>(options);
}

export function getCurrentUrl() {
  const ctx = uiRouterCtx.get();
  return ctx?.router.context.url ?? (typeof location !== 'undefined' ? location.href : DEFAULT_CONFIG.baseUrl!);
}
