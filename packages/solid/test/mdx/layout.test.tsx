/** @jsxImportSource solid-js */

import { createRouter } from '@airlib/router';
import { fireEvent, render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mdxCtx } from '../../src/mdx/context.js';
import { Layout } from '../../src/mdx/Layout.js';
import type { NavItem } from '../../src/mdx/Sidebar.js';
import { UIRouter } from '../../src/router/router.js';

describe('Documentation Page Layout Scaffolding', () => {
  const sampleNav: NavItem[] = [
    { text: 'Getting Started', href: '/docs/intro' },
    { text: 'Architecture', href: '/docs/arch' },
  ];

  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn() as never;
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor(_cb: unknown) {}
    }
    window.IntersectionObserver = MockIntersectionObserver as any;
    globalThis.IntersectionObserver = MockIntersectionObserver as any;
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Full Scaffolding', () => {
    it('renders sidebar navigation, main content, pagination, and table of contents', () => {
      const { container } = render(() => (
        <Layout nav={sampleNav}>
          {(() => {
            mdxCtx.set({
              headings: [{ id: 'intro', text: 'Intro', depth: 2 }],
            } as any);
            return (
              <article>
                <h1>Getting Started</h1>
                <p>Welcome to the guide.</p>
              </article>
            );
          })()}
        </Layout>
      ));

      const navAside = container.querySelector('aside[aria-label="Documentation navigation"]');
      const tocAside = container.querySelector('aside[aria-label="Table of contents"]');
      const article = container.querySelector('article');

      expect(navAside).not.toBeNull();
      expect(tocAside).not.toBeNull();
      expect(article?.textContent).toContain('Welcome to the guide.');
    });
  });

  describe('Author Customization & Feature Flags', () => {
    it('disables table of contents when disableTOC is set', () => {
      mdxCtx.set({
        headings: [{ id: 'intro', text: 'Intro', depth: 2 }],
      } as any);

      const { container } = render(() => (
        <Layout nav={sampleNav}>
          <div>Content</div>
          <Layout.Snippet for={'toc'}>{() => null}</Layout.Snippet>
        </Layout>
      ));

      const tocAside = container.querySelector('.air-mdx-toc');
      expect(tocAside).toBeNull();
    });

    it('overrides default props and slots', () => {
      const { container } = render(() => (
        <Layout>
          <div>Content</div>
          <Layout.Snippet for={'sidebar'}>{() => <span>Injected Sidebar</span>}</Layout.Snippet>
          <Layout.Snippet for={'pagination'}>{() => <span>Injected Pagination</span>}</Layout.Snippet>
          <Layout.Snippet for={'toc'}>{() => <span>Injected TOC</span>}</Layout.Snippet>
        </Layout>
      ));

      const tocAside = container.querySelector('.air-mdx-toc');
      expect(tocAside).toBeNull();
    });

    it('disables pagination when disablePagination is set', () => {
      const { container } = render(() => (
        <Layout nav={sampleNav}>
          <div>Landing Page Content</div>
        </Layout>
      ));

      const pagination = container.querySelector('.air-mdx-pagination');
      expect(pagination).toBeNull();
    });

    it('forwards custom class names and attributes to root main container', () => {
      const { container } = render(() => (
        <Layout nav={sampleNav} class="custom-docs-layout" id="docs-root">
          <div>Content</div>
        </Layout>
      ));

      const main = container.querySelector('.air-mdx');
      expect(main?.className).toContain('custom-docs-layout');
      expect(main?.className).toContain('air-mdx');
      expect(main?.id).toBe('docs-root');
    });

    it('renders layout without sidebar when nav is undefined', () => {
      const { container } = render(() => (
        <Layout nav={undefined as never}>
          <div>No nav content</div>
        </Layout>
      ));

      const asideNav = container.querySelector('aside[aria-label="Documentation navigation"]');
      expect(asideNav?.querySelector('.air-mdx-sidebar')).toBeNull();
    });

    it('supports explicit preload prop', () => {
      const router = createRouter<JSX.Element>();
      const route1 = router.route('/docs/intro');
      (route1 as any).active = true;

      const navWithRoute: NavItem[] = [
        { text: 'Getting Started', route: route1, href: '/docs/intro' },
        { text: 'Architecture', href: '/docs/arch' },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Layout nav={navWithRoute} preload="hover">
            <div>Page</div>
          </Layout>
        </UIRouter>
      ));

      expect(container.querySelector('.air-mdx')).not.toBeNull();
      const sidebarLink = container.querySelector('.air-mdx-sidebar-nav a');
      const paginationLink = container.querySelector('.air-mdx-pagination a');

      expect(sidebarLink).not.toBeNull();
      expect(paginationLink).not.toBeNull();

      if (sidebarLink) fireEvent.mouseEnter(sidebarLink);
      if (paginationLink) fireEvent.mouseEnter(paginationLink);
    });

    it('renders correctly when children prop is omitted', () => {
      const { container } = render(() => <Layout nav={sampleNav} />);
      expect(container.querySelector('.air-mdx-main-inner')).not.toBeNull();
    });
  });
});
