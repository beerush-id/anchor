/** @jsxImportSource solid-js */

import { createRouter } from '@airlib/router';
import { fireEvent, render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from '../../src/mdx/Pagination.js';
import type { NavItem } from '../../src/mdx/Sidebar.js';
import { UIRouter } from '../../src/router/router.js';

describe('Sequential Documentation Pagination', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
  });
  const setupNav = () => {
    const router = createRouter<JSX.Element>();
    const route1 = router.route('/docs/intro');
    const route2 = router.route('/docs/install');
    const route3 = router.route('/docs/config');

    const nav: NavItem[] = [
      { text: 'Introduction', route: route1, href: '/docs/intro' },
      { text: 'Installation', route: route2, href: '/docs/install' },
      { text: 'Configuration', route: route3, href: '/docs/config' },
    ];

    return { router, route1, route2, route3, nav };
  };

  describe('Sequential Page Discovery', () => {
    it('renders both previous and next links when reader is on a middle page', () => {
      const { router, route2, nav } = setupNav();
      (route2 as any).active = true;

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).not.toBeNull();
      expect(prevLink?.getAttribute('rel')).toBe('prev');
      expect(prevLink?.textContent).toContain('Introduction');

      expect(nextLink).not.toBeNull();
      expect(nextLink?.getAttribute('rel')).toBe('next');
      expect(nextLink?.textContent).toContain('Configuration');
    });

    it('renders only the next link when reader is on the first document', () => {
      const { router, route1, nav } = setupNav();
      (route1 as any).active = true;

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).toBeNull();
      expect(nextLink).not.toBeNull();
      expect(nextLink?.textContent).toContain('Installation');
    });

    it('renders only the previous link when reader is on the final document', () => {
      const { router, route3, nav } = setupNav();
      (route3 as any).active = true;

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).not.toBeNull();
      expect(prevLink?.textContent).toContain('Installation');
      expect(nextLink).toBeNull();
    });

    it('discovers adjacent pages across nested navigation categories', () => {
      const router = createRouter<JSX.Element>();
      const routeChild = router.route('/docs/components/button');
      (routeChild as any).active = true;

      const nav: NavItem[] = [
        { text: 'Intro', href: '/docs/intro' },
        {
          text: 'Components',
          items: [
            { text: 'Button', route: routeChild, href: '/docs/components/button' },
            { text: 'Card', href: '/docs/components/card' },
          ],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink?.textContent).toContain('Intro');
      expect(nextLink?.textContent).toContain('Card');
    });

    it('renders nothing when active route does not match any documentation item', () => {
      const { router, nav } = setupNav();

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      expect(container.firstElementChild).toBeNull();
    });

    it('handles omitted nav prop without throwing errors', () => {
      const { router } = setupNav();

      const { container } = render(() => (
        <UIRouter router={router}>
          {/* @ts-expect-error - testing fallback when nav is omitted */}
          <Pagination />
        </UIRouter>
      ));

      expect(container.firstElementChild).toBeNull();
    });
  });

  describe('Labels & Customization', () => {
    it('allows authors to customize previous and next button labels', () => {
      const { router, route2, nav } = setupNav();
      (route2 as any).active = true;

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} previousText="Kembali" nextText="Lanjut" />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink?.getAttribute('aria-label')).toBe('Kembali: Introduction');
      expect(prevLink?.textContent).toContain('Kembali');

      expect(nextLink?.getAttribute('aria-label')).toBe('Lanjut: Configuration');
      expect(nextLink?.textContent).toContain('Lanjut');
    });

    it('prioritizes item title over text when displaying page labels', () => {
      const router = createRouter<JSX.Element>();
      const route1 = router.route('/docs/a');
      const route2 = router.route('/docs/b');
      (route1 as any).active = true;

      const nav: NavItem[] = [
        { text: 'A', href: '/docs/a', route: route1 },
        { text: 'B Text', title: 'B Full Title', href: '/docs/b', route: route2 },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      const nextLink = container.querySelector('.air-mdx-pagination-next a');
      expect(nextLink?.querySelector('strong')?.textContent).toBe('B Full Title');
    });

    it('flattens nested group categories that lack href and route properties', () => {
      const router = createRouter<JSX.Element>();
      const routeChild = router.route('/group/child');
      (routeChild as any).active = true;

      const nav: NavItem[] = [
        {
          text: 'Category Section Header',
          items: [
            { text: 'Previous Item', href: '/group/prev' },
            { text: 'Current Item', href: '/group/child', route: routeChild },
            { text: 'Next Item', href: '/group/next' },
          ],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      expect(container.querySelector('.air-mdx-pagination-prev a')).not.toBeNull();
      expect(container.querySelector('.air-mdx-pagination-next a')).not.toBeNull();
    });

    it('safely handles undefined nav prop without crashing', () => {
      const { container } = render(() => <Pagination nav={undefined as never} />);
      expect(container.querySelector('.air-mdx-pagination')).toBeNull();
    });

    it('flattens items with item lacking route and href and empty items', () => {
      const router = createRouter<JSX.Element>();
      const nav: NavItem[] = [
        { text: 'Non navigable header' },
        { separator: true },
        { text: 'Empty container', items: [] },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      ));

      expect(container.querySelector('.air-mdx-pagination')).toBeNull();
    });

    it('forwards preload prop and triggers mouseEnter on pagination links', () => {
      const { router, route2, nav } = setupNav();
      (route2 as any).active = true;

      const { container } = render(() => (
        <UIRouter router={router}>
          <Pagination nav={nav} preload="hover" />
        </UIRouter>
      ));

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).not.toBeNull();
      expect(nextLink).not.toBeNull();

      if (prevLink) fireEvent.mouseEnter(prevLink);
      if (nextLink) fireEvent.mouseEnter(nextLink);
    });
  });
});
