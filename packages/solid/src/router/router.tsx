import { derived, isBrowser, untrack } from '@anchorlib/core';
import {
  type MatchedRoute,
  type RouteOptions,
  type RoutePath,
  type RouteRegistry,
  setRedirectHandler,
  type UnknownRoute,
} from '@anchorlib/router';
import type { JSX, ParentComponent } from 'solid-js';
import { For, onCleanup, onMount } from 'solid-js';
import { navigate } from './navigate.js';
import type { AnyRoute, RouteComponent, RouteStacks, UIRouterProps } from './types.js';

const STACK_REGISTRY = new WeakSet<UnknownRoute>();

/**
 * A reactive component that renders the view for a given route and its children.
 */
export function RouteViewer(props: { route: UnknownRoute; stacks: RouteStacks; children?: JSX.Element }) {
  const { route, stacks } = props;

  const index = derived(() => route.index?.active && route.index.renderer?.({}));
  const exception = derived(() => route.exception && route.exceptionRenderer?.({}));
  const content = (
    <>
      {index.value}
      {props.children}
      {exception.value}
    </>
  );
  const shell = derived(() => {
    if (!route.active) return props.children;

    const rendered = route.renderer?.({ children: content }) ?? content;

    if (STACK_REGISTRY.has(route)) {
      return <div class={'route-modal'}>{rendered}</div>;
    }

    return rendered;
  });

  if (STACK_REGISTRY.has(route)) {
    untrack(() => stacks.set(route, () => <>{shell.value}</>));
    return null as unknown as JSX.Element;
  }

  return <>{shell.value}</> as JSX.Element;
}

/**
 * Renders a specific route and recursively processes its child routes.
 */
export function RouteRenderer(props: { route: UnknownRoute; registry: RouteRegistry; stacks: RouteStacks }) {
  const children = Array.from(props.registry).map(([, child]) => (
    /* v8 ignore next */
    <RouteRenderer route={child.route} registry={child} stacks={props.stacks} />
  ));

  return (
    <RouteViewer route={props.route} stacks={props.stacks}>
      {children}
    </RouteViewer>
  );
}

/**
 * The root router component that mounts the application route tree to Solid.
 */
export function UIRouter(props: UIRouterProps) {
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

  onMount(() => {
    window.addEventListener('popstate', activate);
  });

  onCleanup(() => {
    window.removeEventListener('popstate', activate);
  });

  const routes = Array.from(props.router.routes).map((registry) => (
    <RouteRenderer route={registry.route} registry={registry} stacks={stacks} />
  ));

  return (
    <>
      {routes}
      <StackRenderer stacks={stacks} />
    </>
  );
}

/**
 * Renders stacked (modal) routes.
 */
function StackRenderer(props: { stacks: RouteStacks }) {
  return (
    <For each={Array.from(props.stacks.entries())}>
      {([, Stack]) => <Stack />}
    </For>
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
    });
  });
}
