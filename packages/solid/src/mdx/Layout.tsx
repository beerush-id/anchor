import type { PreloadMode } from '@airlib/router';
import { cookiePair } from '../cookie.js';
import { setup } from '../hoc.js';
import { classx } from '../index.js';
import type { JSX } from '../solid.js';
import { Slot } from '../switch.js';
import type { SlottedComponent } from '../types.js';
import { type MdxContext, mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps extends JSX.HTMLAttributes<HTMLDivElement> {
  nav?: NavItem[];
  children?: JSX.Element;
  preload?: PreloadMode;
}

export type LayoutSlots = {
  toc?: (ctx?: MdxContext) => JSX.Element;
  sidebar?: (ctx?: MdxContext) => JSX.Element;
  pagination?: (ctx?: MdxContext) => JSX.Element;
};

/**
 * The main layout component for Extended Markdown.
 *
 * @return {SlottedComponent<LayoutProps, LayoutSlots>}
 */
export const Layout: SlottedComponent<LayoutProps, LayoutSlots> = setup<LayoutProps, LayoutSlots>((props, snippets) => {
  const $restProps = props.$omit(['nav', 'children', 'class', 'preload']);
  const [store] = cookiePair('mdx-store', { pm: 'bun', framework: 'solid', runtime: 'bun' }, { deferred: true });
  const ctx = mdxCtx.set({ store });

  return (
    <div {...$restProps} class={classx('air-mdx air-mdx-container', props.class)}>
      <div class="air-mdx-layout">
        <aside class="air-mdx-aside-left" aria-label="Documentation navigation">
          <Slot for={snippets.sidebar?.(ctx)}>
            <Sidebar nav={props.nav ?? []} preload={props.preload} />
          </Slot>
        </aside>

        <div class="air-mdx-main">
          <div class="air-mdx-main-inner">
            {props.children}
            <Slot for={snippets.pagination?.(ctx)}>
              <Pagination nav={props.nav ?? []} preload={props.preload} />
            </Slot>
          </div>

          <aside class="air-mdx-aside-right" aria-label="Table of contents">
            <Slot for={snippets.toc?.(ctx)}>
              <TableOfContent />
            </Slot>
          </aside>
        </div>
      </div>
    </div>
  );
}, 'Layout');
