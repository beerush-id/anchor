import type { PreloadMode } from '@airlib/router';
import type { HTMLAttributes } from 'react';
import { type AnyType, classx, derived, Link, render, setup, Show, uiRouterCtx, untrack } from '../index.js';
import type { NavItem } from './Sidebar.js';

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  nav: NavItem[];
  preload?: PreloadMode;
  previousText?: string;
  nextText?: string;
}

export type NavigableItem = NavItem & { route: AnyType };

export interface PaginationLinks {
  prev?: NavigableItem;
  next?: NavigableItem;
}

export const Pagination = setup<PaginationProps>((props) => {
  const $restProps = props.$omit(['nav', 'className', 'preload', 'previousText', 'nextText']);
  const ctx = uiRouterCtx.get();
  const flatLinks = derived(() => flatten(props.nav));

  const links = derived.as(() => {
    if (!ctx?.router) return {};

    const items = flatLinks.value;
    const fullPath = ctx.router.context.fullPath;
    return untrack(() => {
      const currentIndex = items.findIndex((item) => {
        return item.route?.active || item.href === fullPath;
      });
      if (currentIndex === -1) return {};

      const prev = items[currentIndex - 1];
      const next = items[currentIndex + 1];

      return { prev, next } as PaginationLinks;
    });
  });

  return render(() => {
    if (!links.prev && !links.next) return null;

    return (
      <nav {...$restProps} className={classx('air-mdx-pagination', props.className)}>
        <div className="air-mdx-pagination-prev">
          <Show when={() => links.prev!}>
            {(p) => (
              <Link
                to={p.route as AnyType}
                href={p.href}
                className="air-mdx-pagination-link"
                aria-label={`${props.previousText ?? 'Previous'}: ${p.text}`}
                rel="prev"
                preload={props.preload}
              >
                <span>{props.previousText ?? 'Previous'}</span>
                <strong>{p.title || p.text}</strong>
              </Link>
            )}
          </Show>
        </div>

        <div className="air-mdx-pagination-next">
          <Show when={() => links.next!}>
            {(n) => (
              <Link
                to={n.route as AnyType}
                href={n.href}
                className="air-mdx-pagination-link"
                aria-label={`${props.nextText ?? 'Next'}: ${n.text}`}
                rel="next"
                preload={props.preload}
              >
                <span>{props.nextText ?? 'Next'}</span>
                <strong>{n.title || n.text}</strong>
              </Link>
            )}
          </Show>
        </div>
      </nav>
    );
  }, 'Pagination');
}, 'Pagination');

function flatten(items: NavItem[] = []): NavigableItem[] {
  return items.flatMap((item) => {
    const children = item.items ? flatten(item.items) : [];
    return item.route || item.href ? [item as NavigableItem, ...children] : children;
  });
}
