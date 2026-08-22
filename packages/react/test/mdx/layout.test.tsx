import { render } from '@testing-library/react';
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
      });

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
      });

      const { container } = render(
        <Layout nav={sampleNav} disableTOC>
          <div>Content</div>
        </Layout>
      );

      const tocAside = container.querySelector('aside[aria-label="Table of contents"]');
      expect(tocAside).toBeNull();
    });

    it('disables pagination when disablePagination is set', () => {
      const { container } = render(
        <Layout nav={sampleNav} disablePagination>
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

      const main = container.querySelector('main');
      expect(main?.className).toContain('custom-docs-layout');
      expect(main?.className).toContain('air-mdx');
      expect(main?.id).toBe('docs-root');
    });
  });
});
