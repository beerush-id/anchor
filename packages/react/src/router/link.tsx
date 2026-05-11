import { derived } from '@anchorlib/core';
import { createUrl } from '@anchorlib/router';
import type { MouseEventHandler, ReactNode } from 'react';
import { render, setup } from '../hoc.js';
import type { ComponentProps } from '../types.js';
import { navigate } from './navigate.js';
import type { AnyRoute, LinkProps } from './types.js';

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

  const query = derived(() => $props.query);
  const params = derived(() => $props.params);
  const href = derived(() => createUrl(props.href ?? $props.to?.route.path ?? '/', params.value, query.value));
  const isActive = derived(() => {
    const route = $props.to?.route;
    if (!route) return false;

    if (route.active) return true;

    // If this route is an Index child route, its native .active state drops when navigating
    // into deep sibling dynamic routes (like /users/1).
    // Visually, the NavLink should still be active if its true parent is active.
    // biome-ignore lint/suspicious/noExplicitAny: Expect any.
    if (route.parent && (route.parent as any).index === route) {
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

    if (!location.href.endsWith(href.value)) {
      navigate(href.value as never, { query: query.value, params: params.value, replace: props.replace } as never);
    }

    $props.onClick?.(e);
  };

  const handleHover: MouseEventHandler<HTMLAnchorElement> = (e) => {
    const { to } = $props;

    if (to && (props.preload === 'hover' || to.route.options.preloadMode === 'hover')) {
      to.route.router.preload(href.value);
    }

    $props.onMouseEnter?.(e);
  };

  return render(
    () => (
      <a
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
        ])}
      >
        {props.children}
      </a>
    ),
    'Link'
  );
}, 'Link') as LinkComponent;
