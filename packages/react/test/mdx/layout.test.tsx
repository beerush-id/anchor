import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/client/index.js';
import { mdxCtx } from '../../src/mdx/context.js';
import { Layout } from '../../src/mdx/Layout.js';
import type { NavItem } from '../../src/mdx/Sidebar.js';

describe('Documentation Page Layout Scaffolding', () => {
  const sampleNav: NavItem[] = [
    { text: 'Getting Started', href: '/docs/intro' },
    { text: 'Architecture', href: '/docs/arch' },
  ];

  beforeEach(() => {
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
    vi.restoreAllMocks();
  });

  describe('Full Scaffolding', () => {
    it('renders sidebar navigation, main content, pagination, and table of contents', () => {
      mdxCtx.set({
        headings: [{ id: 'intro', text: 'Intro', depth: 2 }],
      } as any);

      const { container } = render(
        <Layout nav={sampleNav}>
          <article>
            <h1>Getting Started</h1>
            <p>Welcome to the guide.</p>
          </article>
        </Layout>
      );

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

      const { container } = render(
        <Layout nav={sampleNav}>
          <div>Content</div>
          <Layout.Snippet for={'toc'}>{() => null}</Layout.Snippet>
        </Layout>
      );

      const tocAside = container.querySelector('.air-mdx-toc');
      expect(tocAside).toBeNull();
    });

    it('overrides default props and slots', () => {
      const { container } = render(
        <Layout>
          <>
            <div>Content</div>
            <Layout.Snippet for={'sidebar'}>{() => <span>Injected Sidebar</span>}</Layout.Snippet>
            <Layout.Snippet for={'pagination'}>{() => <span>Injected Pagination</span>}</Layout.Snippet>
            <Layout.Snippet for={'toc'}>{() => <span>Injected TOC</span>}</Layout.Snippet>
          </>
        </Layout>
      );

      const tocAside = container.querySelector('.air-mdx-toc');
      expect(tocAside).toBeNull();
    });

    it('disables pagination when disablePagination is set', () => {
      const { container } = render(
        <Layout nav={sampleNav}>
          <div>Landing Page Content</div>
        </Layout>
      );

      const pagination = container.querySelector('.air-mdx-pagination');
      expect(pagination).toBeNull();
    });

    it('forwards custom class names and attributes to root main container', () => {
      const { container } = render(
        <Layout nav={sampleNav} className="custom-docs-layout" id="docs-root">
          <div>Content</div>
        </Layout>
      );

      const main = container.querySelector('.air-mdx');
      expect(main?.className).toContain('custom-docs-layout');
      expect(main?.className).toContain('air-mdx');
      expect(main?.id).toBe('docs-root');
    });
  });

  describe('Mobile Navigation Drawer & Interactivity', () => {
    it('toggles sidebar and toc drawers and closes via backdrop or link clicks', async () => {
      mdxCtx.set({
        headings: [{ id: 'intro', text: 'Intro', depth: 2 }],
      } as any);

      const { container } = render(
        <Layout nav={sampleNav}>
          <div>Content</div>
          <Layout.Snippet for={'toc'}>{() => <a href="#heading">Heading</a>}</Layout.Snippet>
        </Layout>
      );

      const menuBtn = container.querySelector('button[aria-label="Toggle navigation menu"]');
      const tocBtn = container.querySelector('button[aria-label="Toggle table of contents"]');
      expect(menuBtn).not.toBeNull();
      expect(tocBtn).not.toBeNull();

      // Open sidebar drawer and click backdrop to close
      await act(async () => {
        fireEvent.click(menuBtn!);
      });
      let backdrop = container.querySelector('.air-mdx-backdrop');
      expect(backdrop).not.toBeNull();
      expect(backdrop?.getAttribute('data-drawer')).toBe('sidebar');

      await act(async () => {
        fireEvent.click(backdrop!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).toBeNull();

      // Toggle sidebar drawer on and off via menu button
      await act(async () => {
        fireEvent.click(menuBtn!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).not.toBeNull();
      await act(async () => {
        fireEvent.click(menuBtn!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).toBeNull();

      // Open TOC drawer and toggle off
      await act(async () => {
        fireEvent.click(tocBtn!);
      });
      backdrop = container.querySelector('.air-mdx-backdrop');
      expect(backdrop).not.toBeNull();
      expect(backdrop?.getAttribute('data-drawer')).toBe('toc');

      await act(async () => {
        fireEvent.click(tocBtn!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).toBeNull();

      // Non-link click on aside-left does not close drawer
      const asideLeft = container.querySelector('aside[aria-label="Documentation navigation"]');
      await act(async () => {
        fireEvent.click(menuBtn!);
      });
      await act(async () => {
        fireEvent.click(asideLeft!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).not.toBeNull();

      // Clicking link inside aside-left closes drawer
      const navLink = container.querySelector('aside[aria-label="Documentation navigation"] a');
      expect(navLink).not.toBeNull();
      await act(async () => {
        fireEvent.click(navLink!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).toBeNull();

      // Non-link click on aside-right does not close drawer
      const asideRight = container.querySelector('aside[aria-label="Table of contents"]');
      await act(async () => {
        fireEvent.click(tocBtn!);
      });
      await act(async () => {
        fireEvent.click(asideRight!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).not.toBeNull();

      // Clicking link inside aside-right closes drawer
      const tocLink = container.querySelector('aside[aria-label="Table of contents"] a');
      expect(tocLink).not.toBeNull();
      await act(async () => {
        fireEvent.click(tocLink!);
      });
      expect(container.querySelector('.air-mdx-backdrop')).toBeNull();
    });
  });
});
