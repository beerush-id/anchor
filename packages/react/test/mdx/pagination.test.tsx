import { createRouter } from '@airlib/router';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../src/client/index.js';
import type { ReactNode } from 'react';
import { Pagination } from '../../src/mdx/Pagination.js';
import type { NavItem } from '../../src/mdx/Sidebar.js';
import { UIRouter } from '../../src/router/router.js';

describe('Sequential Documentation Pagination', () => {
  const setupNav = () => {
    const router = createRouter<ReactNode>();
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

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      );

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

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      );

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).toBeNull();
      expect(nextLink).not.toBeNull();
      expect(nextLink?.textContent).toContain('Installation');
    });

    it('renders only the previous link when reader is on the final document', () => {
      const { router, route3, nav } = setupNav();
      (route3 as any).active = true;

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      );

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink).not.toBeNull();
      expect(prevLink?.textContent).toContain('Installation');
      expect(nextLink).toBeNull();
    });

    it('discovers adjacent pages across nested navigation categories', () => {
      const router = createRouter<ReactNode>();
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

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      );

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink?.textContent).toContain('Intro');
      expect(nextLink?.textContent).toContain('Card');
    });

    it('renders nothing when active route does not match any documentation item', () => {
      const { router, nav } = setupNav();

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} />
        </UIRouter>
      );

      expect(container.firstElementChild).toBeNull();
    });

    it('handles omitted nav prop without throwing errors', () => {
      const { router } = setupNav();

      const { container } = render(
        <UIRouter router={router}>
          {/* @ts-expect-error - testing fallback when nav is omitted */}
          <Pagination />
        </UIRouter>
      );

      expect(container.firstElementChild).toBeNull();
    });
  });

  describe('Labels & Customization', () => {
    it('allows authors to customize previous and next button labels', () => {
      const { router, route2, nav } = setupNav();
      (route2 as any).active = true;

      const { container } = render(
        <UIRouter router={router}>
          <Pagination nav={nav} previousText="Kembali" nextText="Lanjut" />
        </UIRouter>
      );

      const prevLink = container.querySelector('.air-mdx-pagination-prev a');
      const nextLink = container.querySelector('.air-mdx-pagination-next a');

      expect(prevLink?.getAttribute('aria-label')).toBe('Kembali: Introduction');
      expect(prevLink?.textContent).toContain('Kembali');

      expect(nextLink?.getAttribute('aria-label')).toBe('Lanjut: Configuration');
      expect(nextLink?.textContent).toContain('Lanjut');
    });
  });
});
