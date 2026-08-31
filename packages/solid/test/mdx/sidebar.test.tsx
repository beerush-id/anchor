/** @jsxImportSource solid-js */

import '../../src/client/index.js';
import { createRouter } from '@airlib/router';
import { fireEvent, render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type NavItem, Sidebar, SidebarNode } from '../../src/mdx/Sidebar.js';
import { UIRouter } from '../../src/router/router.js';

describe('Documentation Sidebar Navigation', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn() as never;
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Navigation Hierarchy & Item Types', () => {
    it('renders links, text items, and separators for structural clarity', () => {
      const nav: NavItem[] = [
        { text: 'Getting Started', href: '/docs/intro' },
        { separator: true },
        { text: 'Section Header' },
      ];

      const { container } = render(() => <Sidebar nav={nav} />);

      const link = container.querySelector('a.air-mdx-sidebar-item');
      const hr = container.querySelector('hr.air-mdx-sidebar-separator');
      const texts = container.querySelectorAll('span.air-mdx-sidebar-text');

      expect(link?.getAttribute('href')).toBe('/docs/intro');
      expect(link?.textContent).toBe('Getting Started');
      expect(hr).not.toBeNull();
      expect(texts[1]?.textContent).toBe('Section Header');
    });

    it('renders custom item icons alongside text', () => {
      const nav: NavItem[] = [
        {
          text: 'Guides',
          href: '/guides',
          icon: () => <span data-testid="guide-icon">📖</span>,
        },
      ];

      const { getByTestId, container } = render(() => <Sidebar nav={nav} />);

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

      const { container } = render(() => <Sidebar nav={nav} collapsible />);

      const toggle = container.querySelector('button.air-mdx-sidebar-group-toggle');
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(childrenWrapper?.getAttribute('aria-hidden')).toBe('true');
    });

    it('expands and collapses group children when toggle is clicked', async () => {
      const nav: NavItem[] = [
        {
          text: 'APIs',
          collapsed: true,
          items: [{ text: 'Core API', href: '/api/core' }],
        },
      ];

      const { container } = render(() => <Sidebar nav={nav} collapsible />);

      const toggle = container.querySelector('button.air-mdx-sidebar-group-toggle')!;
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      fireEvent.click(toggle);
      await Promise.resolve();

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(childrenWrapper?.getAttribute('aria-hidden')).toBe('false');

      fireEvent.click(toggle);
      await Promise.resolve();

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(childrenWrapper?.getAttribute('aria-hidden')).toBe('true');
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

      const { container } = render(() => <SidebarNode item={item} level={0} />);

      const groups = container.querySelectorAll('.air-mdx-sidebar-group-container');
      expect(groups).toHaveLength(2);
      expect((groups[0] as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('0');
      expect((groups[1] as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('1');
    });

    it('renders group header as link with toggle button when group has route and is collapsible', () => {
      const router = createRouter<JSX.Element>();
      const sectionRoute = router.route('/section');

      const nav: NavItem[] = [
        {
          text: 'Section Overview',
          route: sectionRoute,
          items: [{ text: 'Item 1', href: '/section/1' }],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      ));

      const headerLink = container.querySelector('.air-mdx-sidebar-group-wrapper a.air-mdx-sidebar-group');
      const toggle = container.querySelector('.air-mdx-sidebar-toggle-btn');

      expect(headerLink?.textContent).toContain('Section Overview');
      expect(toggle).not.toBeNull();
    });
  });

  describe('Route Awareness & Automatic Expansion', () => {
    it('automatically expands a collapsed group when a child route is active', () => {
      const router = createRouter<JSX.Element>();
      const docsRoute = router.route('/docs/intro');
      (docsRoute as any).active = true;

      const nav: NavItem[] = [
        {
          text: 'Getting Started',
          collapsed: true,
          items: [{ text: 'Introduction', route: docsRoute }],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      ));

      const groupContainer = container.querySelector('.air-mdx-sidebar-group-container');
      const childrenWrapper = container.querySelector('.air-mdx-sidebar-children');

      expect(groupContainer?.className).not.toContain('collapsed');
      expect(childrenWrapper?.getAttribute('aria-hidden')).toBe('false');
    });

    it('automatically expands a collapsed group when child href matches active router fullPath', async () => {
      const router = createRouter<JSX.Element>();
      await router.activate('/docs/guides/setup');

      const nav: NavItem[] = [
        {
          text: 'Guides',
          collapsed: true,
          items: [{ text: 'Setup', href: '/docs/guides/setup' }],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible />
        </UIRouter>
      ));

      const groupContainer = container.querySelector('.air-mdx-sidebar-group-container');
      expect(groupContainer?.className).not.toContain('collapsed');
    });

    it('renders leaf item with route property and forwards preload mode', () => {
      const router = createRouter<JSX.Element>();
      const leafRoute = router.route('/leaf');

      const nav: NavItem[] = [
        {
          text: 'Leaf Route Item',
          route: leafRoute,
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} preload="hover" />
        </UIRouter>
      ));

      const link = container.querySelector('a.air-mdx-sidebar-item');
      expect(link?.textContent).toContain('Leaf Route Item');
    });

    it('renders non-collapsible group header as static div', () => {
      const nav: NavItem[] = [
        {
          text: 'Static Section',
          items: [{ text: 'Item', href: '/static/item' }],
        },
      ];

      const { container } = render(() => <Sidebar nav={nav} collapsible={false} />);
      const staticHeader = container.querySelector('div.air-mdx-sidebar-group');
      expect(staticHeader?.textContent).toContain('Static Section');
    });

    it('renders non-collapsible group with route without toggle button', () => {
      const router = createRouter<JSX.Element>();
      const sectionRoute = router.route('/non-col-section');

      const nav: NavItem[] = [
        {
          text: 'Non Collapsible Section',
          route: sectionRoute,
          items: [{ text: 'Child', href: '/non-col-section/child' }],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible={false} />
        </UIRouter>
      ));

      expect(container.querySelector('.air-mdx-sidebar-group-wrapper a')).not.toBeNull();
      expect(container.querySelector('.air-mdx-sidebar-toggle-btn')).toBeNull();
    });

    it('renders anonymous group without header when text is omitted', () => {
      const nav: NavItem[] = [
        {
          items: [{ text: 'Anonymous Child', href: '/anon/child' }],
        },
      ];

      const { container } = render(() => <Sidebar nav={nav} />);
      expect(container.querySelector('.air-mdx-sidebar-group')).toBeNull();
      expect(container.querySelector('a.air-mdx-sidebar-item')?.textContent).toContain('Anonymous Child');
    });

    it('supports multi-level nested groups and forwards preload', () => {
      const router = createRouter<JSX.Element>();
      const deepRoute = router.route('/level1/level2/leaf');

      const nav: NavItem[] = [
        {
          text: 'Level 1',
          items: [
            {
              text: 'Level 2',
              items: [{ text: 'Leaf', route: deepRoute }],
            },
          ],
        },
      ];

      const { container } = render(() => (
        <UIRouter router={router}>
          <Sidebar nav={nav} collapsible preload="hover" />
        </UIRouter>
      ));

      expect(container.querySelector('.air-mdx-sidebar-children')).not.toBeNull();
      const leafLink = container.querySelector('a.air-mdx-sidebar-item');
      if (leafLink) fireEvent.mouseEnter(leafLink);
    });

    it('renders SidebarNode with leaf href without level provided and triggers hover preload', () => {
      const { container } = render(() => <SidebarNode item={{ text: 'Leaf', href: '/leaf' }} preload="hover" />);
      const link = container.querySelector('a.air-mdx-sidebar-item');
      expect(link).not.toBeNull();
      expect((link as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('0');
      if (link) fireEvent.mouseEnter(link);
    });

    it('renders SidebarNode with leaf route without level provided and triggers hover preload', () => {
      const router = createRouter<JSX.Element>();
      const leafRoute = router.route('/leaf-route');
      const { container } = render(() => (
        <UIRouter router={router}>
          <SidebarNode item={{ text: 'Leaf Route', route: leafRoute }} preload="hover" />
        </UIRouter>
      ));
      const link = container.querySelector('a.air-mdx-sidebar-item');
      expect(link).not.toBeNull();
      expect((link as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('0');
      if (link) fireEvent.mouseEnter(link);
    });

    it('renders group with route and forwards preload and triggers hover preload', () => {
      const router = createRouter<JSX.Element>();
      const groupRoute = router.route('/group-route');
      const { container } = render(() => (
        <UIRouter router={router}>
          <SidebarNode
            item={{
              text: 'Group Route Preload',
              route: groupRoute,
              items: [{ text: 'Nested', href: '/nested' }],
            }}
            preload="hover"
            collapsible
          />
        </UIRouter>
      ));

      const link = container.querySelector('.air-mdx-sidebar-group-wrapper a');
      expect(link).not.toBeNull();
      if (link) fireEvent.mouseEnter(link);
    });

    it('renders static leaf item without level and without link', () => {
      const { container } = render(() => <SidebarNode item={{ text: 'Plain Text' }} />);
      const item = container.querySelector('.air-mdx-sidebar-item');
      expect(item).not.toBeNull();
      expect(item?.textContent).toContain('Plain Text');
      expect((item as HTMLElement).style.getPropertyValue('--air-nav-level')).toBe('0');
    });
  });
});
