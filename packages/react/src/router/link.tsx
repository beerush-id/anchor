import { classx, derived, untrack } from '@anchorlib/core';
import { Route } from '@anchorlib/router';
import type { MouseEventHandler, ReactNode, RefObject } from 'react';
import { render, setup } from '../hoc.js';
import { onMount } from '../lifecycle.js';
import type { ComponentProps } from '../types.js';
import { getCurrentUrl, uiRouterCtx } from './router.tsx';
import type { AnyRoute, LinkProps, RouteComponent } from './types.js';

type LinkComponent = <T>(props: LinkProps<T>) => ReactNode;

/**
 * A reactive anchor component for client-side navigation.
 * Automatically handles `active` state and preloads route definitions on hover if configured.
 *
 * @param props Link properties including the target route (`to`), params, and query.
 * @returns A reactive `<a>` element.
 */
export const Link = setup<LinkProps<AnyRoute>>((props) => {
  const $props = props as ComponentProps<LinkProps<AnyRoute>> & {
    query: Record<string, unknown>;
    params: Record<string, unknown>;
  };
  const restProps = props.$omit([
    'to',
    'href',
    'params' as never,
    'query' as never,
    'onClick',
    'onMouseEnter',
    'preload',
    'replace',
    'activeClass',
    'className',
    'children',
    'fullMatch',
    'keepVisible',
    'resetScroll',
    'ref',
  ]);

  const ctx = uiRouterCtx.get();
  const router = ctx?.router;
  const state = derived.as(() => {
    const { href, params, query } = $props;

    let route: AnyRoute | undefined;
    let target = href;

    const activeUrl = untrack(() => new URL(getCurrentUrl()));
    if (target?.startsWith('#')) target = `${activeUrl.pathname}${target}`;

    if (props.to) {
      route = props.to instanceof Route ? props.to : (props.to as RouteComponent<AnyRoute>).route;
      target = untrack(() => route!.url(params, query));
    } else if (router && target) {
      route = untrack(() => router.find(target!, true)?.route);
    }

    const url = new URL(target ?? '/', activeUrl.origin);
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/$/, '');
    }

    return {
      url,
      route,
      query,
      params,
      href: url.href,
      hash: url.hash.substring(1),
      search: url.search,
      pathname: url.pathname,
      fullPath: url.pathname + url.search,
    };
  });

  const dispatchUrl = () => {
    const data = {
      from: { path: location.pathname, hash: location.hash, href: location.href, query: location.search },
      to: { path: state.pathname, hash: state.hash, href: state.href, query: state.search },
    };
    if (props.replace) {
      history.replaceState(data, '', state.href);
    } else {
      history.pushState(data, '', state.href);
    }
    window.dispatchEvent(new PopStateEvent('popstate', { state: data }));
  };

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    // Let the browser handle standard "open in new tab/window" modifiers and custom targets.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || $props.target) {
      return;
    }

    e.preventDefault();

    if (state.href !== location.href) {
      dispatchUrl();
      const behavior = typeof props.resetScroll === 'string' ? props.resetScroll : 'auto';

      if (!ctx?.resetScroll && props.resetScroll) {
        document.body.scrollTo({ left: 0, top: 0, behavior });
      }
    }

    $props.onClick?.(e);
  };

  const handleHover: MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (state.route && (props.preload === 'hover' || state.route.options.preloadMode === 'hover')) {
      void state.route.router.preload(state.fullPath);
    }

    $props.onMouseEnter?.(e);
  };

  const ref = { current: null } as RefObject<HTMLAnchorElement | null>;
  const assignRef = (el: HTMLAnchorElement | null) => {
    ref.current = el;

    let cleanup: (() => void) | undefined;

    if ('ref' in props) {
      if (typeof props.ref === 'function') {
        cleanup = props.ref(el) as never;
      } else {
        (props.ref as RefObject<HTMLAnchorElement | null>).current = el;
      }
    }

    return cleanup;
  };

  onMount(() => {
    if (ref.current && props.keepVisible && state.route?.active) {
      ref.current?.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: typeof props.keepVisible === 'string' ? props.keepVisible : 'smooth',
      });
    }
  });

  return render(
    () => (
      <a
        {...restProps}
        ref={assignRef}
        href={state.fullPath}
        onClick={handleClick}
        onMouseEnter={handleHover}
        aria-current={state.route?.active ? 'page' : undefined}
        className={classx(props.className, state.route?.active ? props.activeClass : null)}
      >
        {props.children}
      </a>
    ),
    'Link'
  );
}, 'Link') as LinkComponent;
