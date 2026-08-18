import type { RouterContext, TRec } from '@anchorlib/router';
import type { HTMLAttributes, ReactNode } from 'react';
import { classx, render, Show, Snippet, setup } from '../index.js';
import { mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps extends HTMLAttributes<HTMLElement> {
  nav: NavItem[];
  context?: RouterContext<TRec, TRec, TRec>;
  children?: ReactNode;
  disableTOC?: boolean;
  disablePagination?: boolean;
}

export const Layout = setup<LayoutProps>((props) => {
  const $restProps = props.$omit(['nav', 'context', 'children', 'disableTOC', 'disablePagination', 'className']);
  mdxCtx.set();

  return render(
    () => (
      <main {...$restProps} className={classx('air-mdx air-mdx-container', props.className)}>
        <div className="air-mdx-layout">
          <aside className="air-mdx-aside-left" aria-label="Documentation navigation">
            <Show when={() => props.nav}>{(nav) => <Sidebar nav={nav} />}</Show>
          </aside>

          <div className="air-mdx-main">
            <div className="air-mdx-main-inner">
              <Snippet>{() => props.children}</Snippet>
              <Show when={() => !props.disablePagination}>{() => <Pagination nav={props.nav} />}</Show>
            </div>

            <Show when={() => !props.disableTOC}>
              {() => (
                <aside className="air-mdx-aside-right" aria-label="Table of contents">
                  <TableOfContent />
                </aside>
              )}
            </Show>
          </div>
        </div>
      </main>
    ),
    'Layout'
  );
}, 'Layout');
