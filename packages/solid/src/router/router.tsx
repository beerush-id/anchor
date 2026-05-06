import { isBrowser } from '@anchorlib/core';
import {
  type MatchedRoute,
  type RouteOptions,
  type RoutePath,
  type RouteRegistry,
  setRedirectHandler,
  type UnknownRoute,
} from '@anchorlib/router';
import { For, type JSX, onCleanup, onMount, type ParentComponent, Show } from 'solid-js';
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
    return <Show when={route.index?.active}>{(() => <Renderer />) as never}</Show>;
  };
  const Layout = route.renderer ?? (({ children }) => children);
  const Exception = () => {
    const Renderer = route.exceptionRenderer ?? (() => null);
    return <Show when={route.exception}>{(() => <Renderer />) as never}</Show>;
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
      return (
        <Show when={route.active} fallback={props.children}>
          {
            (() => (
              <div class={'route-modal'}>
                <Layout>
                  <Content />
                </Layout>
              </div>
            )) as never
          }
        </Show>
      );
    }

    return (
      <Show when={route.active} fallback={props.children}>
        {
          (() => (
            <Layout>
              <Content />
            </Layout>
          )) as never
        }
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
export function RouteRenderer(props: {
  route: UnknownRoute;
  registry: RouteRegistry;
  stacks: RouteStacks;
}): JSX.Element {
  return (
    <RouteViewer route={props.route} stacks={props.stacks}>
      <For each={Array.from(props.registry.values())}>
        {(child) => <RouteRenderer route={child.route} registry={child} stacks={props.stacks} />}
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
          return <RouteRenderer route={registry.route} registry={registry} stacks={stacks} />;
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

if (isBrowser()) {
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
    } as never);
  });
}
