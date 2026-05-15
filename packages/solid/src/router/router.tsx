import { isBrowser } from '@anchorlib/core';
import {
  getRenderProps,
  type MatchedRoute,
  type RouteExceptionRenderer,
  type RouteRegistry,
  type RouteRenderer,
  setExceptionRendererFactory,
  setRedirectHandler,
  setRendererFactory,
  type UnknownRoute,
} from '@anchorlib/router';
import { For, type JSX, onCleanup, onMount, type ParentComponent, Show } from 'solid-js';
import { setup } from '../hoc.js';
import { navigate } from './navigate.js';
import type { AnyRoute, RouteComponent, RouteStacks, UIRouterProps } from './types.js';

const STACK_REGISTRY = new WeakSet<UnknownRoute>();

/**
 * A reactive component that renders the view for a given route and its children.
 */
export function RouteViewer(props: { route: UnknownRoute; stacks: RouteStacks; children?: JSX.Element }): JSX.Element {
  const { route, stacks } = props;

  const Index = () => {
    const Renderer = route.index?.renderer ?? (() => null);

    return (
      <Show when={route.index?.active}>
        <Renderer {...getRenderProps(route.index as never)} />
      </Show>
    );
  };
  const Layout = route.renderer ?? (({ children }) => children);
  const layoutProps = getRenderProps(route);
  const Exception = () => {
    const Renderer = route.exceptionRenderer ?? (() => null);
    return (
      <Show when={route.exception}>{(() => <Renderer error={route.exception!} {...layoutProps} />) as never}</Show>
    );
  };
  const Content = () => (
    <>
      <Index />
      {props.children}
      <Exception />
    </>
  );
  const Shell = () => {
    if (STACK_REGISTRY.has(route)) {
      const Renderer = () => (
        <div class={'route-modal'}>
          <Layout {...layoutProps}>
            <Content />
          </Layout>
        </div>
      );

      return (
        <Show when={route.active} fallback={props.children}>
          <Renderer />
        </Show>
      );
    }

    const Renderer = () => (
      <Layout {...layoutProps}>
        <Content />
      </Layout>
    );

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

/**
 * Renders stacked (modal) routes.
 */
function StackRenderer(props: { stacks: RouteStacks }): JSX.Element {
  return <For each={Array.from(props.stacks.values())}>{(Stack) => <Stack />}</For>;
}

/**
 * The root router component that mounts the application route tree to Solid.
 */
export function UIRouter(props: UIRouterProps): JSX.Element {
  const stacks: RouteStacks = new Map();

  const activate = async () => {
    const url = props.url ?? location.href;
    const match = props.router.find(url);

    if (props.resetScroll && !STACK_REGISTRY.has((match as MatchedRoute)?.route)) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: typeof props.resetScroll === 'string' ? props.resetScroll : 'smooth',
      });
    }

    await props.router.activate(url);
  };

  if (!props.headless) {
    activate();
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
      <For each={Array.from(props.router.routes)}>
        {(registry) => {
          return <RouteRendererComponent route={registry.route} registry={registry} stacks={stacks} />;
        }}
      </For>
      <StackRenderer stacks={stacks} />
    </>
  );
}

/**
 * Create a page component.
 * @param {T} routeNode
 * @returns {RouteComponent<T>}
 */
export function page<T>(routeNode: T): RouteComponent<T> {
  const UIRoute: ParentComponent = function UIRoute(props) {
    return props.children;
  };

  (UIRoute as RouteComponent<AnyRoute>).route = routeNode as AnyRoute;
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
  STACK_REGISTRY.add(routeNode as never);
  return page(routeNode);
}

if (isBrowser()) {
  if (location.pathname.endsWith('/')) {
    const url = `${location.pathname.replace(/\/$/, '')}${location.search}`;
    history.replaceState(null, '', url);
  }

  setRedirectHandler((redirect) => {
    // biome-ignore lint/suspicious/noExplicitAny: expect any
    navigate((redirect as any).route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    } as never);
  });
}

const createRenderer = <TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteRenderer<TPath, TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup(renderer as never, `Route(${route.path})`) as RouteRenderer<
    TPath,
    TParams,
    TQueryParams,
    TData,
    PParams,
    PQuery,
    PData,
    TOutput
  >;
};

const createExceptionRenderer = <TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>(
  route: UnknownRoute,
  renderer: RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput>
): RouteExceptionRenderer<TParams, TQueryParams, TData, PParams, PQuery, PData, TOutput> => {
  return setup(renderer as never, `Exception(${route.path})`) as RouteExceptionRenderer<
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
