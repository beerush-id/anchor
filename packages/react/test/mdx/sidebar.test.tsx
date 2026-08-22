import { createRouter } from '@airlib/router';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/client/index.js';
import type { ReactNode } from 'react';
import { type NavItem, Sidebar, SidebarNode } from '../../src/mdx/Sidebar.js';
import { UIRouter } from '../../src/router/router.js';

describe('Documentation Sidebar Navigation', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn() as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Navigation Hierarchy & Item Types', () => {
    it('renders links, text items, and separators for structural clarity', () => {
      const nav: NavItem[] = [
        { text: 'Getting Started', href: '/docs/intro' },
        { separator: true },
        { text: 'Section Header' },
      ];

      const { container } = render(<Sidebar nav={nav} />);

      const link = container.querySelector('a.air-mdx-sidebar-link');
      const hr = container.querySelector('hr.air-mdx-sidebar-separator');
      const text = container.querySelector('span.air-mdx-sidebar-text');

      expect(link?.getAttribute('href')).toBe('/docs/intro');
      expect(link?.textContent).toBe('Getting Started');
      expect(hr).not.toBeNull();
      expect(text?.textContent).toBe('Section Header');
    });

    it('renders custom item icons alongside text', () => {
      const nav: NavItem[] = [
        {
          text: 'Guides',
          href: '/guides',
          icon: () => <span data-testid="guide-icon">📖</span>,
        },
      ];

      const { getByTestId, container } = render(<Sidebar nav={nav} />);

      expect(getByTestId('guide-icon')).not.toBeNull();
      expect(container.textContent).toContain('Guides');
    });
  });

  describe('Collapsible Groups & Level Indentation', () => {
    it('renders toggle button with accessible aria-expanded state for collapsible groups', () => {
      const nav: NavItem[] = [
        {
          text: 'Components',
          collapsed: true,
          items: [
            { text: 'Button', href: '/components/button' },
            { text: 'Card', href: '/components/card' },
          ],
        },
      ];

      const { container } = render(<Sidebar nav={nav} collapsible />);

      const toggle = container.querySelector('button.air-mdx-sidebar-group-toggle');
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(childrenWrapper?.getAttribute('hidden')).not.toBeNull();
    });

    it('expands and collapses group children when toggle is clicked', async () => {
      const nav: NavItem[] = [
        {
          text: 'APIs',
          collapsed: true,
          items: [{ text: 'Core API', href: '/api/core' }],
        },
      ];

      const { container } = render(<Sidebar nav={nav} collapsible />);

      const toggle = container.querySelector('button.air-mdx-sidebar-group-toggle')!;
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(childrenWrapper?.getAttribute('hidden')).toBeNull();

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(childrenWrapper?.getAttribute('hidden')).not.toBeNull();
    });

    it('computes css variable level for nested indentation', () => {
      const item: NavItem = {
        text: 'Parent',
        items: [
          {
            text: 'Child Group',
            items: [{ text: 'Deep Link', href: '/deep' }],
          },
        ],
      };

      const { container } = render(<SidebarNode item={item} level={0} />);

      const groups = container.querySelectorAll('.air-mdx-sidebar-group-container');
      expect(groups).toHaveLength(2);
      expect((groups[0] as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('0');
      expect((groups[1] as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('1');
    });
    it('renders group header as link with toggle button when group has route and is collapsible', () => {
      const router = createRouter<ReactNode>();
      const sectionRoute = router.route('/section');

      const nav: NavItem[] = [
        {
          text: 'Section Overview',
          route: sectionRoute,
          items: [{ text: 'Item 1', href: '/section/1' }],
        },
      ];

      const { container } = render(
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      );

      const headerLink = container.querySelector('.air-mdx-sidebar-group-header a.air-mdx-sidebar-link');
      const toggle = container.querySelector('.air-mdx-sidebar-toggle');

      expect(headerLink?.textContent).toContain('Section Overview');
      expect(toggle).not.toBeNull();
    });
  });

  describe('Route Awareness & Automatic Expansion', () => {
    it('automatically expands a collapsed group when a child route is active', () => {
      const router = createRouter<ReactNode>();
      const docsRoute = router.route('/docs/intro');
      (docsRoute as any).active = true;

      const nav: NavItem[] = [
        {
          text: 'Getting Started',
          collapsed: true,
          items: [{ text: 'Introduction', route: docsRoute }],
        },
      ];

      const { container } = render(
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      );

      const groupContainer = container.querySelector('.air-mdx-sidebar-group-container');
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      expect(groupContainer?.className).not.toContain('collapsed');
      expect(childrenWrapper?.getAttribute('hidden')).toBeNull();
    });

    it('automatically expands a collapsed group when child href matches active router fullPath', async () => {
      const router = createRouter<ReactNode>();
      await router.activate('/docs/guides/setup');

      const nav: NavItem[] = [
        {
          text: 'Guides',
          collapsed: true,
          items: [{ text: 'Setup', href: '/docs/guides/setup' }],
        },
      ];

      const { container } = render(
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      );

      const groupContainer = container.querySelector('.air-mdx-sidebar-group-container');
      expect(groupContainer?.className).not.toContain('collapsed');
    });
  });
});
