import { type AnyType, isBrowser } from '@airlib/core';
import {
  createRouter as createAppRouter,
  getRenderProps,
  type MatchedRoute,
  Redirect,
  type RouteExceptionRenderer,
  type RouteRegistry,
  type RouteRenderer,
  type RouterOptions,
  setExceptionRendererFactory,
  setRedirectHandler,
  setRendererFactory,
  type UnknownRoute,
} from '@airlib/router';
import { type Component, For, type JSX, onCleanup, onMount, type ParentComponent } from 'solid-js';
import { setup } from '../hoc.js';
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

    try {
      await props.router.activate(url);
    } catch (error) {
      if (!(error instanceof Redirect)) {
        console.error(error);
      }
      return;
    }
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
 * @param routeNode - The route node to attach the renderer to.
 * @returns A Component for use in navigation <Link>
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
export function route<T extends AnyRoute>(routeNode: T): RouteComponent<T> {
  return page(routeNode);
}

/**
 * Create a modal component.
 * @param routeNode - The route node to attach the renderer to.
 * @returns A Component to be used in navigation <Link>
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

  setRedirectHandler((redirect: AnyType) => {
    navigate(redirect.url ?? redirect.route, {
      query: redirect.query,
      params: redirect.params,
      redirect: location.href,
      replace: true,
    } as AnyType);
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
