import type { PreloadMode } from '@airlib/router';
import type { HTMLAttributes, ReactNode } from 'react';
import { cookiePair } from '../cookie.js';
import { classx, mutable, setup, Show, Slot, Snippet } from '../index.js';
import type { SlottedComponent } from '../types.js';
import { type MdxContext, mdxCtx } from './context.js';
import { Pagination } from './Pagination.js';
import { type NavItem, Sidebar } from './Sidebar.js';
import { TableOfContent } from './TableOfContent.js';

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
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
 * The main layout component for Extended Markdown with responsive mobile navigation support.
 *
 * @return {SlottedComponent<LayoutProps, LayoutSlots>}
 */
export const Layout: SlottedComponent<LayoutProps, LayoutSlots> = setup<LayoutProps, LayoutSlots>((props, snippets) => {
  const $restProps = props.$omit(['nav', 'children', 'className', 'preload']);
  const [store] = cookiePair('mdx-store', { pm: 'bun', framework: 'react', runtime: 'bun' }, { deferred: true });
  const ctx = mdxCtx.set({ store });
  const state = mutable({ drawer: '' as '' | 'sidebar' | 'toc' });

  const close = () => {
    state.drawer = '';
  };

  return (
    <div {...$restProps} className={classx('air-mdx air-mdx-container', props.className)}>
      <div className="air-mdx-mobile-bar">
        <button
          type="button"
          className="air-mdx-mobile-btn"
          aria-label="Toggle navigation menu"
          onClick={() => {
            state.drawer = state.drawer === 'sidebar' ? '' : 'sidebar';
          }}
        >
          <MenuIcon />
          <span>Menu</span>
        </button>

        <button
          type="button"
          className="air-mdx-mobile-btn"
          aria-label="Toggle table of contents"
          onClick={() => {
            state.drawer = state.drawer === 'toc' ? '' : 'toc';
          }}
        >
          <span>On this page</span>
          <TocIcon />
        </button>
      </div>

      <Show when={() => state.drawer}>
        {(drawer) => <div className="air-mdx-backdrop" data-drawer={drawer} onClick={close} />}
      </Show>

      <div className="air-mdx-layout">
        <aside
          className="air-mdx-aside-left"
          aria-label="Documentation navigation"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) close();
          }}
        >
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

          <aside
            className="air-mdx-aside-right"
            aria-label="Table of contents"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a')) close();
            }}
          >
            <Slot for={() => snippets.toc?.(ctx)}>
              <TableOfContent />
            </Slot>
          </aside>
        </div>
      </div>
    </div>
  );
}, 'Layout');

function MenuIcon() {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M160-160v-40h414.62v40H160Zm0-135.38v-40h640v40H160Zm64.62-135.39q-27.62 0-46.12-18.5-18.5-18.5-18.5-46.11v-240q0-27.62 18.5-46.12Q197-800 224.62-800h510.76q27.62 0 46.12 18.5Q800-763 800-735.38v240q0 27.61-18.5 46.11t-46.12 18.5H224.62Zm0-40h510.76q10.77 0 17.7-6.92 6.92-6.93 6.92-17.69v-240q0-10.77-6.92-17.7-6.93-6.92-17.7-6.92H224.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v240q0 10.76 6.92 17.69 6.93 6.92 17.7 6.92Zm-24.62 0V-760v289.23Z" />
    </svg>
  );
}

function TocIcon() {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M160-324.62v-40h493.85v40H160ZM160-460v-40h493.85v40H160Zm0-135.38v-40h493.85v40H160ZM775.38-320q-10.46 0-17.53-6.86-7.08-6.85-7.08-16.99 0-10.78 7.08-18.08 7.07-7.3 17.53-7.3 10.47 0 17.54 7.3 7.08 7.3 7.08 18.08 0 10.14-7.08 16.99-7.07 6.86-17.54 6.86Zm0-134.62q-10.46 0-17.53-6.88-7.08-6.88-7.08-18.5 0-10.13 7.08-16.99 7.07-6.86 17.53-6.86 10.47 0 17.54 6.86Q800-490.13 800-480q0 11.62-7.08 18.5-7.07 6.88-17.54 6.88Zm0-136.15q-10.46 0-17.53-6.86-7.08-6.85-7.08-16.99 0-10.78 7.08-18.08 7.07-7.3 17.53-7.3 10.47 0 17.54 7.3 7.08 7.3 7.08 18.08 0 10.14-7.08 16.99-7.07 6.86-17.54 6.86Z" />
    </svg>
  );
}
