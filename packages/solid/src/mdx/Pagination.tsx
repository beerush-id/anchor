import { type AnyType, classx, derived, untrack } from '@airlib/core';
import type { PreloadMode } from '@airlib/router';
import { Link, uiRouterCtx } from '../router/index.js';
import { type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';
import type { NavItem } from './Sidebar.js';

export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
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

export function Pagination(allProps: PaginationProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['nav', 'class', 'preload', 'previousText', 'nextText']);
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

  return (
    <Show when={links.prev || links.next}>
      <nav {...restProps} class={classx('air-mdx-pagination', props.class)}>
        <div class="air-mdx-pagination-prev">
          <Show when={links.prev}>
            <Link
              to={links.prev?.route as AnyType}
              href={links.prev?.href}
              class="air-mdx-pagination-link"
              aria-label={`${props.previousText ?? 'Previous'}: ${links.prev?.text}`}
              rel="prev"
              preload={props.preload}
            >
              <span>{props.previousText ?? 'Previous'}</span>
              <strong>{links.prev?.title || links.prev?.text}</strong>
            </Link>
          </Show>
        </div>

        <div class="air-mdx-pagination-next">
          <Show when={links.next}>
            <Link
              to={links.next?.route as AnyType}
              href={links.next?.href}
              class="air-mdx-pagination-link"
              aria-label={`${props.nextText ?? 'Next'}: ${links.next?.text}`}
              rel="next"
              preload={props.preload}
            >
              <span>{props.nextText ?? 'Next'}</span>
              <strong>{links.next?.title || links.next?.text}</strong>
            </Link>
          </Show>
        </div>
      </nav>
    </Show>
  );
}

function flatten(items: NavItem[] = []): NavigableItem[] {
  return items.flatMap((item) => {
    const children = item.items ? flatten(item.items) : [];
    return item.route || item.href ? [item as NavigableItem, ...children] : children;
  });
}
