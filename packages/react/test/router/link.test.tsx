import '../../src/client/index.js';
import { createRouter } from '@anchorlib/router';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyRoute } from '../../src/router/index.js';
import { Link } from '../../src/router/link.js';
import * as NavigateModule from '../../src/router/navigate.js';
import { route } from '../../src/router/router.js';

describe('Anchor React - Link Component', () => {
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  let preloadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    navigateSpy = vi.spyOn(NavigateModule, 'navigate').mockImplementation(() => {});
  });

  afterEach(() => {
    navigateSpy.mockRestore();
    if (preloadSpy) preloadSpy.mockRestore();
  });

  it('renders an anchor tag with string href', () => {
    render(<Link href="/about">About Us</Link>);
    const anchor = screen.getByText('About Us');
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('href')).toBe('/about');
  });

  it('renders correctly with a structured RouteComponent in `to`', () => {
    const router = createRouter();
    const coreRoute = router.route('/settings');
    const SettingsRoute = route(coreRoute);

    render(<Link to={SettingsRoute}>Settings</Link>);
    const anchor = screen.getByText('Settings');
    expect(anchor.getAttribute('href')).toBe('/settings');
  });

  it('intercepts standard clicks and calls navigate', () => {
    const TypedLink = Link as FC<{ href: string; query: any; children: any }>;

    render(
      <TypedLink href="/contact" query={{ ref: 'test' }}>
        Contact
      </TypedLink>
    );
    const anchor = screen.getByText('Contact');

    fireEvent.click(anchor);

    expect(navigateSpy).toHaveBeenCalledWith('/contact?ref=test', {
      query: { ref: 'test' },
      params: undefined,
      replace: undefined,
    });
  });

  it('respects replace prop during navigation', () => {
    render(
      <Link href="/login" replace>
        Login
      </Link>
    );
    const anchor = screen.getByText('Login');

    fireEvent.click(anchor);

    expect(navigateSpy).toHaveBeenCalledWith('/login', {
      query: undefined,
      params: undefined,
      replace: true,
    });
  });

  it('allows native browser behavior for modified clicks (metaKey, ctrlKey, etc) and targets', () => {
    render(
      <Link href="/external" target="_blank">
        External
      </Link>
    );
    const anchor = screen.getByText('External');

    // With target="_blank", it should return early
    fireEvent.click(anchor);
    expect(navigateSpy).not.toHaveBeenCalled();

    // With metaKey, it should return early
    render(<Link href="/new-tab">New Tab</Link>);
    const newTabAnchor = screen.getByText('New Tab');
    fireEvent.click(newTabAnchor, { metaKey: true });
    expect(navigateSpy).not.toHaveBeenCalled();

    fireEvent.click(newTabAnchor, { ctrlKey: true });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('applies aria-current and activeClass when route is natively active', () => {
    const router = createRouter();
    const coreRoute = router.route('/dashboard');
    const DashboardRoute = route(coreRoute);

    coreRoute.active = true; // Mocking activity

    render(
      <Link to={DashboardRoute} className="btn" activeClass="btn-active">
        Dashboard
      </Link>
    );

    const anchor = screen.getByText('Dashboard');
    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect(anchor.className).toContain('btn btn-active');
  });

  it('applies active stylings to Index routes if their parent is active', () => {
    const router = createRouter();
    const parentCoreRoute = router.route('/users');
    const indexCoreRoute = parentCoreRoute.route('/'); // Index child
    const IndexRouteComponent = route(indexCoreRoute as never as AnyRoute);

    // Parent is active, index child inherently drops active state during deep routing:
    parentCoreRoute.active = true;
    indexCoreRoute.active = false;

    render(
      <Link to={IndexRouteComponent} activeClass="active-index" fullMatch={false}>
        Users
      </Link>
    );

    const anchor = screen.getByText('Users');
    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect(anchor.className).toContain('active-index');
  });

  it('calls router.preload when hovering and preloadMode is hover, and conditionally triggers custom onMouseEnter event', () => {
    const router = createRouter();
    const coreRoute = router.route('/heavy');
    const HeavyRoute = route(coreRoute);

    preloadSpy = vi.spyOn(router, 'preload').mockImplementation(async () => {}) as any;
    const hoverSpy = vi.fn();

    render(
      <Link to={HeavyRoute} preload="hover" onMouseEnter={hoverSpy}>
        Heavy
      </Link>
    );
    const anchor = screen.getByText('Heavy');

    fireEvent.mouseEnter(anchor);
    expect(preloadSpy).toHaveBeenCalledWith('/heavy');
    expect(hoverSpy).toHaveBeenCalled();
  });

  it('calls router.preload natively if route options define preloadMode as hover without explicit props', () => {
    const router = createRouter();
    // Use options directly on route
    const coreRoute = router.route('/heavy-native', { preloadMode: 'hover' });
    const NativeHeavyRoute = route(coreRoute);

    preloadSpy = vi.spyOn(router, 'preload').mockImplementation(async () => {}) as any;

    render(<Link to={NativeHeavyRoute}>Heavy Native</Link>);
    const anchor = screen.getByText('Heavy Native');

    fireEvent.mouseEnter(anchor);
    expect(preloadSpy).toHaveBeenCalledWith('/heavy-native');
  });

  it('renders an empty href to / if no to or href is provided', () => {
    render(<Link>Empty Link</Link>);
    const anchor = screen.getByText('Empty Link');

    expect(anchor.getAttribute('href')).toBe('/');
  });

  it('triggers custom onClick if provided', () => {
    const onClickSpy = vi.fn();
    render(
      <Link href="/something" onClick={onClickSpy}>
        Click Me
      </Link>
    );

    const anchor = screen.getByText('Click Me');
    fireEvent.click(anchor);

    expect(onClickSpy).toHaveBeenCalled();
  });

  it('does not apply active stylings to Index routes if parent is active but fullMatch is true', () => {
    const router = createRouter();
    const parentCoreRoute = router.route('/users');
    const indexCoreRoute = parentCoreRoute.route('/'); // Index child
    const IndexRouteComponent = route(indexCoreRoute as never as AnyRoute);

    // Parent is active, index child inherently drops active state during deep routing:
    parentCoreRoute.active = true;
    indexCoreRoute.active = false;

    render(
      <Link to={IndexRouteComponent} activeClass="active-index" fullMatch={true}>
        Users
      </Link>
    );

    const anchor = screen.getByText('Users');
    expect(anchor.getAttribute('aria-current')).toBeNull();
    expect(anchor.className).not.toContain('active-index');
  });

  it('navigates strictly when path differs (prevents false endsWith matches)', () => {
    // Override window.location to simulate being in a nested route
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/console/projects',
        search: ''
      },
      writable: true,
    });
    
    render(<Link href="/projects">Root Projects</Link>);
    const anchor = screen.getByText('Root Projects');
    fireEvent.click(anchor);

    // Should navigate because '/console/projects' !== '/projects'
    expect(navigateSpy).toHaveBeenCalledWith('/projects', {
      query: undefined,
      params: undefined,
      replace: undefined,
    });
  });
  it('does not apply active stylings to Index routes by default (inferred fullMatch=true)', () => {
    const router = createRouter();
    const parentCoreRoute = router.route('/users');
    const indexCoreRoute = parentCoreRoute.route('/'); // Index child
    const IndexRouteComponent = route(indexCoreRoute as never as AnyRoute);

    parentCoreRoute.active = true;
    indexCoreRoute.active = false;

    render(
      <Link to={IndexRouteComponent} activeClass="active-index">
        Users
      </Link>
    );

    const anchor = screen.getByText('Users');
    expect(anchor.getAttribute('aria-current')).toBeNull();
    expect(anchor.className).not.toContain('active-index');
  });

  it('does not apply active stylings to non-index sibling routes even if parent is active', () => {
    const router = createRouter();
    const parentCoreRoute = router.route('/users');
    const siblingCoreRoute = parentCoreRoute.route('/profile'); // Non-index sibling
    const SiblingRouteComponent = route(siblingCoreRoute as never as AnyRoute);

    parentCoreRoute.active = true;
    siblingCoreRoute.active = false;

    render(
      <Link to={SiblingRouteComponent} activeClass="active-sibling" fullMatch={false}>
        Profile
      </Link>
    );

    const anchor = screen.getByText('Profile');
    expect(anchor.getAttribute('aria-current')).toBeNull();
    expect(anchor.className).not.toContain('active-sibling');
  });

  it('swallows navigation if target path exactly matches current path', () => {
    // Override window.location to simulate being on the target route
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/projects',
        search: ''
      },
      writable: true,
    });
    
    render(<Link href="/projects">Root Projects</Link>);
    const anchor = screen.getByText('Root Projects');
    fireEvent.click(anchor);

    // Should NOT navigate because '/projects' === '/projects'
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
