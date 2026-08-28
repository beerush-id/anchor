import type { PreloadMode } from '@airlib/router';
import type { HTMLAttributes, ReactNode } from 'react';
import { classx, render, setup, Slot, Snippet } from '../index.js';
import { cookiePair } from '../cookie.js';
import type { SlottedComponent } from '../types.js';
import { type MdxContext, mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps extends HTMLAttributes<HTMLElement> {
  nav?: NavItem[];
  children?: ReactNode;
  preload?: PreloadMode;
}

export type LayoutSlots = {
  toc?: (ctx?: MdxContext) => ReactNode;
  sidebar?: (ctx?: MdxContext) => ReactNode;
  pagination?: (ctx?: MdxContext) => ReactNode;
};

/**
 * The main layout component for Extended Markdown.
 *
 * @return {SlottedComponent<LayoutProps, LayoutSlots>}
 */
export const Layout: SlottedComponent<LayoutProps, LayoutSlots> = setup<LayoutProps, LayoutSlots>((props, snippets) => {
  const $restProps = props.$omit(['nav', 'children', 'className', 'preload']);
  const [store] = cookiePair('mdx-store', { pm: 'bun', framework: 'react', runtime: 'bun' }, { deferred: true });
  const ctx = mdxCtx.set({ store });

  return render(
    () => (
      <main {...$restProps} className={classx('air-mdx air-mdx-container', props.className)}>
        <div className="air-mdx-layout">
          <aside className="air-mdx-aside-left" aria-label="Documentation navigation">
            <Slot for={() => snippets.sidebar?.(ctx)}>
              <Sidebar nav={props.nav ?? []} preload={props.preload} />
            </Slot>
          </aside>

          <div className="air-mdx-main">
            <div className="air-mdx-main-inner">
              <Snippet>{() => props.children}</Snippet>
              <Slot for={() => snippets.pagination?.(ctx)}>
                <Pagination nav={props.nav ?? []} preload={props.preload} />
              </Slot>
            </div>

            <aside className="air-mdx-aside-right" aria-label="Table of contents">
              <Slot for={() => snippets.toc?.(ctx)}>
                <TableOfContent />
              </Slot>
            </aside>
          </div>
        </div>
      </main>
    ),
    'Layout'
  );
}, 'Layout');
