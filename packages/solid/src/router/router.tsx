import { $symbol, type AnyType, createContext, isBrowser, setContext, sleep } from '@airlib/core';
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
  type RouteTarget,
  setExceptionRendererFactory,
  setRedirectHandler,
  setRendererFactory,
  type UnknownRoute,
} from '@airlib/router';
import { setup } from '../hoc.js';
import type { Component, JSX, ParentComponent } from '../solid.js';
import { For, onCleanup, onMount } from '../solid.js';
import { Show } from '../switch.js';
import { navigate } from './navigate.js';
import type { AnyRoute, RouteComponent, RouteStacks, UIRouterProps } from './types.js';

const STACK_REGISTRY = new WeakSet<UnknownRoute>();

/**
 * A reactive component that renders the view for a given route and its children.
 */
export function RouteViewer(props: { route: UnknownRoute; stacks: RouteStacks; children?: JSX.Element }): JSX.Element {
  const { route, stacks } = props;

  const Index = () => {
    return (
      <Show when={!route.exception && route.authenticated && route.index?.active && route.index?.renderer}>
        {((Renderer: Component<AnyType>) => <Renderer {...getRenderProps(route.index as never)} />) as never}
      </Show>
    );
  };
  const Layout = ({ children }: AnyType) => (
    <Show when={route.renderer as Component<AnyType>} fallback={children}>
      {(Wrapper: Component<AnyType>) => <Wrapper {...getRenderProps(route)}>{children}</Wrapper>}
    </Show>
  );
  const Exception = () => {
    return (
      <Show when={(route.exception || !route.authenticated) && route.exceptionRenderer}>
        {
          ((Renderer: Component<AnyType>) => (
            <Renderer error={(route.exception ?? route.state.error) as AnyType} {...getRenderProps(route)} />
          )) as never
        }
      </Show>
    );
  };
  const Shell = () => {
    const Renderer = () => (
      <Show
        when={
          (route.exception || !route.authenticated) &&
          route.children!.size === 0 &&
          typeof route.index?.renderer === 'undefined'
        }
        fallback={
          <Layout>
            <Index />
            <Show when={!route.exception && route.authenticated}>{props.children}</Show>
            <Exception />
          </Layout>
        }
      >
        <Exception />
      </Show>
    );

    if (STACK_REGISTRY.has(route)) {
      return (
        <Show when={route.active} fallback={props.children}>
          <div class={'route-modal'}>
            <Renderer />
          </div>
        </Show>
      );
    }

    return (
      <Show when={route.active} fallback={props.children}>
        <Renderer />
      </Show>
    );
  };

  if (STACK_REGISTRY.has(route)) {
    stacks.set(route, Shell);
    return null;
  }

  return <Shell />;
}

/**
 * Renders a specific route and recursively processes its child routes.
 */
export function RouteRendererComponent(props: {
  route: UnknownRoute;
  registry: RouteRegistry;
  stacks: RouteStacks;
}): JSX.Element {
  return (
    <RouteViewer route={props.route} stacks={props.stacks}>
      <For each={Array.from(props.registry.values())}>
        {(child) => <RouteRendererComponent route={child.route} registry={child} stacks={props.stacks} />}
      </For>
    </RouteViewer>
  );
}

const ROUTER_CTX = $symbol('router-context');
export const uiRouterCtx = createContext<UIRouterProps>(ROUTER_CTX);

/**
 * The root router component that mounts the application route tree to Solid.
 */
export function UIRouter(props: UIRouterProps): JSX.Element {
  uiRouterCtx.set(props);

  const { router, resetScroll, url, headless = true, children } = props;
  const stacks: RouteStacks = new Map();

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

  if (isBrowser()) {
    onMount(() => {
      window.addEventListener('popstate', activate);
    });

    onCleanup(() => {
      window.removeEventListener('popstate', activate);
    });
  }

  return (
    <>
      <For each={Array.from(router.routes)}>
        {(registry) => {
          return <RouteRendererComponent route={registry.route} registry={registry} stacks={stacks} />;
        }}
      </For>
      <StackRenderer stacks={stacks} />
      {children}
    </>
  );
}

/**
 * Renders stacked (modal) routes.
 */
function StackRenderer(props: { stacks: RouteStacks }): JSX.Element {
  return <For each={Array.from(props.stacks.values())}>{(Stack) => <Stack />}</For>;
}

/* istanbul ignore next */
function scrollIntoView(hash: string, behavior: ScrollBehavior = 'smooth') {
  const element = document.getElementById(hash);
  if (element) {
    element.scrollIntoView({ block: 'start', inline: 'start', behavior });
  }
}

/**
 * Create a page component.
 * @param routeNode - The route node to attach the renderer to.
 * @returns A Component for use in navigation <Link>
 */
export function page<T>(routeNode: RouteTarget<T>): RouteComponent<T> {
  const UIRoute: ParentComponent = function UIRoute(props) {
    return props.children;
  };

  (UIRoute as AnyType).route = routeNode as AnyType;
  (UIRoute as AnyType).render = (renderer: AnyType) => {
    (routeNode as AnyType).render(renderer);

    return UIRoute as AnyType;
  };
  (UIRoute as AnyType).renderAsync = (loader: AnyType, fallback: AnyType) => {
    (routeNode as AnyType).renderAsync(loader, fallback);

    return UIRoute as AnyType;
  };

  return UIRoute as RouteComponent<T>;
}

/**
 * @deprecated Use `page()` instead.
 * @type {<T extends AnyRoute>(routeNode: T) => RouteComponent<T>}
 */
export function route<T extends AnyRoute>(routeNode: T): RouteComponent<T> {
  return page(routeNode as never);
}

/**
 * Create a modal component.
 * @param routeNode - The route node to attach the renderer to.
 * @returns A Component to be used in navigation <Link>
 */
export function modal<T>(routeNode: RouteTarget<T>): RouteComponent<T> {
  STACK_REGISTRY.add(routeNode as never);
  return page(routeNode);
}

const ROUTE_CTX = $symbol('route-context');
export const routeCtx = createContext<RouteContext<AnyType, AnyType, AnyType>>(ROUTE_CTX);

/**
 * Creates a new Router instance.
 *
 * Convenience function for creating a router with optional options.
 *
 * @param options - Optional router configuration
 * @returns A new Router instance
 */
export function createRouter<V = JSX.Element>(options?: RouterOptions) {
  return createAppRouter<V>(options);
}

export function getCurrentUrl() {
  const ctx = uiRouterCtx.get();
  return ctx?.router.context.url ?? (typeof location !== 'undefined' ? location.href : DEFAULT_CONFIG.baseUrl!);
}

const createRenderer = <TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup((props) => {
    setContext(ROUTE_CTX, route.state);
    return renderer(props as never) as never;
  }, `Route(${route.path})`) as RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>;
};

const createExceptionRenderer = <TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup((props) => {
    setContext(ROUTE_CTX, route.state);
    return renderer(props as never) as never;
  }, `Exception(${route.path})`) as RouteExceptionRenderer<
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

/* istanbul ignore start */
if (isBrowser()) {
  if (location.pathname.endsWith('/')) {
    const url = `${location.pathname.replace(/\/$/, '')}${location.search}`;
    history.replaceState(null, '', url);
  }

  setRedirectHandler((redirect: AnyType) => {
    navigate(redirect.url ?? redirect.route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    } as AnyType);
  });
}
/* istanbul ignore end */
