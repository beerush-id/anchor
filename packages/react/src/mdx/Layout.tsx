import type { RouterContext, TRec } from '@anchorlib/router';
import type { ReactNode } from 'react';
import { setup, Show, Snippet } from '../index.js';
import { mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps {
  nav: NavItem[];
  context?: RouterContext<TRec, TRec, TRec>;
  children?: ReactNode;
  disableTOC?: boolean;
  disablePagination?: boolean;
}

export const Layout = setup<LayoutProps>((props) => {
  mdxCtx.set();

  return (
    <main className="air-mdx">
      <div className="air-mdx-layout">
        <aside className="air-mdx-aside-left">
          <Show when={() => props.nav}>{(nav) => <Sidebar nav={nav} />}</Show>
        </aside>

        <div className="air-mdx-main">
          <div className="air-mdx-main-inner">
            <Snippet>{() => props.children}</Snippet>
            <Show when={() => !props.disablePagination}>{() => <Pagination nav={props.nav} />}</Show>
          </div>

          <aside className="air-mdx-aside-right">
            <TableOfContent />
          </aside>
        </div>
      </div>
    </main>
  );
}, 'Layout');
