import { type AnyType, derived } from '@anchorlib/core';
import { createUrl, Route } from '@anchorlib/router';
import type { MouseEventHandler, ReactNode, RefObject } from 'react';
import { onMount } from 'src/lifecycle.ts';
import { render, setup } from '../hoc.js';
import type { ComponentProps } from '../types.js';
import { navigate } from './navigate.js';
import { uiRouterCtx } from './router.tsx';
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

  const ctx = uiRouterCtx.get();
  const query = derived(() => $props.query);
  const params = derived(() => $props.params);
  const target = derived(() => {
    const to = $props.to;
    if (!to) return undefined;
    return to instanceof Route ? to : (to as RouteComponent<AnyRoute>).route;
  });
  const href = derived(() => createUrl(props.href ?? target.value?.path ?? '/', params.value, query.value));
  const fullMatch = derived(() => $props.fullMatch ?? target.value?.isIndex);
  const isActive = derived(() => {
    const route = target.value;
    if (!route) return false;

    if (route.active) return true;

    // If this route is an Index child route, its native .active state drops when navigating
    // into deep sibling dynamic routes (like /users/1).
    // Visually, the NavLink should still be active if its true parent is active.
    if (route.parent && (route.parent as AnyType).index === route && !fullMatch.value) {
      return (route.parent as AnyRoute).active;
    }

    return false;
  });

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    // Let the browser handle standard "open in new tab/window" modifiers and custom targets.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || $props.target) {
      return;
    }

    e.preventDefault();

    const current = `${location.pathname}${location.search}`;
    if (current !== href.value) {
      navigate(target.value?.path ?? href.value, {
        query: query.value,
        params: params.value,
        replace: props.replace,
      } as never);
    }

    if (!ctx?.resetScroll && props.resetScroll) {
      const behavior = typeof props.resetScroll === 'string' ? props.resetScroll : 'instant';
      document.body.scrollTo({ left: 0, top: 0, behavior });
    }

    $props.onClick?.(e);
  };

  const handleHover: MouseEventHandler<HTMLAnchorElement> = (e) => {
    const route = target.value;

    if (route && (props.preload === 'hover' || route.options.preloadMode === 'hover')) {
      route.router.preload(href.value);
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
    if (props.keepVisible && isActive.value) {
      const behavior = typeof props.keepVisible === 'string' ? props.keepVisible : 'instant';
      ref.current?.scrollIntoView({ block: 'center', inline: 'center', behavior });
    }
  });

  return render(
    () => (
      <a
        ref={assignRef}
        href={href.value}
        onClick={handleClick}
        onMouseEnter={handleHover}
        aria-current={isActive.value ? 'page' : undefined}
        className={[props.className, isActive.value ? props.activeClass : ''].filter(Boolean).join(' ') || undefined}
        {...$props.$omit([
          'to',
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
        ])}
      >
        {props.children}
      </a>
    ),
    'Link'
  );
}, 'Link') as LinkComponent;
