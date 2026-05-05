import { derived } from '@anchorlib/core';
import { createUrl } from '@anchorlib/router';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { navigate } from './navigate.js';
import type { AnyRoute, LinkProps } from './types.js';

type LinkComponent = <T>(props: LinkProps<T>) => JSX.Element;

/**
 * A reactive anchor component for client-side navigation.
 * Automatically handles `active` state and preloads route definitions on hover if configured.
 *
 * @param props Link properties including the target route (`to`), params, and query.
 * @returns A reactive `<a>` element.
 */
export const Link: LinkComponent = ((allProps: LinkProps<AnyRoute>) => {
  const [props, rest] = splitProps(allProps, [
    'to',
    'preload',
    'replace',
    'activeClass',
    'class',
    'children',
    'onClick',
    'onMouseEnter',
  ]);

  const toProps = allProps as LinkProps<AnyRoute> & {
    query: Record<string, unknown>;
    params: Record<string, unknown>;
  };

  const query = derived(() => toProps.query);
  const params = derived(() => toProps.params);
  const href = derived(() => createUrl(allProps.href ?? props.to?.index.path ?? '/', params.value, query.value));
  const isActive = derived(() => {
    const route = props.to?.index;
    if (!route) return false;

    if (route.active) return true;

    // If this route is an Index child route, its native .active state drops when navigating
    // into deep sibling dynamic routes (like /users/1).
    // Visually, the NavLink should still be active if its true parent is active.
    if (route.parent && route.parent.index === route) {
      return !!route.parent.active;
    }

    return false;
  });

  const handleClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (e) => {
    // Let the browser handle standard "open in new tab/window" modifiers and custom targets.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || allProps.target) {
      return;
    }

    e.preventDefault();

    if (!location.href.endsWith(href.value)) {
      navigate(href.value, { query: query.value, params: params.value, replace: props.replace });
    }

    if (typeof props.onClick === 'function') {
      (props.onClick as (e: MouseEvent) => void)(e);
    }
  };

  const handleHover: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (e) => {
    const { to } = props;

    if (to && (props.preload === 'hover' || to.index.options.preloadMode === 'hover')) {
      to.index.router.preload(href.value);
    }

    if (typeof props.onMouseEnter === 'function') {
      (props.onMouseEnter as (e: MouseEvent) => void)(e);
    }
  };

  return (
    <a
      {...rest}
      href={href.value}
      onClick={handleClick}
      onMouseEnter={handleHover}
      aria-current={isActive.value ? 'page' : undefined}
      class={[props.class as string, isActive.value ? props.activeClass : ''].filter(Boolean).join(' ') || undefined}
    >
      {props.children}
    </a>
  );
}) as LinkComponent;
