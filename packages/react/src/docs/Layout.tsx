import type { RouterContext, TRec } from '@anchorlib/router';
import type { ReactNode } from 'react';
import { setContext, setup, Show, Snippet } from '../index.js';
import { docsCtx } from './context.js';
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
  docsCtx.set(props.context);
  setContext('air-headings', {});

  return (
    <main className="air-docs">
      <div className="air-docs-layout">
        <aside className="air-docs-aside-left">
          <Show when={() => props.nav}>{(nav) => <Sidebar nav={nav} />}</Show>
        </aside>

        <div className="air-docs-main">
          <div className="air-docs-main-inner">
            <Snippet>{() => props.children}</Snippet>
            <Show when={() => !props.disablePagination}>{() => <Pagination nav={props.nav} />}</Show>
          </div>

          <aside className="air-docs-aside-right">
            <TableOfContent />
          </aside>
        </div>
      </div>
    </main>
  );
}, 'Layout');
