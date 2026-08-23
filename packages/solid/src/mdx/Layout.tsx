import { classx } from '@airlib/core';
import type { PreloadMode } from '@airlib/router';
import { type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';
import { mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps extends JSX.HTMLAttributes<HTMLElement> {
  nav: NavItem[];
  children?: JSX.Element;
  disableTOC?: boolean;
  disablePagination?: boolean;
  preload?: PreloadMode;
}

export function Layout(allProps: LayoutProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, [
    'nav',
    'children',
    'disableTOC',
    'disablePagination',
    'class',
    'preload',
  ]);
  mdxCtx.set();

  return (
    <main {...restProps} class={classx('air-mdx air-mdx-container', props.class)}>
      <div class="air-mdx-layout">
        <aside class="air-mdx-aside-left" aria-label="Documentation navigation">
          <Show when={props.nav}>
            <Sidebar nav={props.nav} preload={props.preload} collapsible />
          </Show>
        </aside>

        <div class="air-mdx-main">
          <div class="air-mdx-main-inner">
            {props.children}
            <Show when={!props.disablePagination}>
              <Pagination nav={props.nav} preload={props.preload} />
            </Show>
          </div>

          <Show when={!props.disableTOC}>
            <aside class="air-mdx-aside-right" aria-label="Table of contents">
              <TableOfContent />
            </aside>
          </Show>
        </div>
      </div>
    </main>
  );
}
