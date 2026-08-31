/** @jsxImportSource solid-js */

import { GuardError, Redirect } from '@airlib/router';
import { render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteStacks } from '../../src/index.js';
import { createRouter, RouteRendererComponent, RouteViewer, redirect, UIRouter } from '../../src/index.js';
import { DEFAULT_ROUTER_CONFIGS } from '../../src/router/constant.js';
import { getCurrentUrl, modal, page, route } from '../../src/router/index.js';

describe('Anchor Solid - UIRouter & RouteViewer Components', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    scrollToSpy.mockRestore();
  });

  describe('page() factory', () => {
    it('wraps a route and exposes .index and .route properties', () => {
      const router = createRouter();
      const rawRoute = router.route('/testing');
      const UiRoute = page(rawRoute);

      expect(UiRoute.route).toBe(rawRoute);
      expect(typeof UiRoute.render).toBe('function');
      expect(typeof UiRoute.renderAsync).toBe('function');
    });

    it('exposes renderAsync method', () => {
      const router = createRouter();
      const rawRoute = router.route('/testing');
      const UiRoute = page(rawRoute);
      const loader = vi.fn();
      const fallback = vi.fn();

      const renderAsyncSpy = vi.spyOn(rawRoute, 'renderAsync');
      const result = UiRoute.renderAsync(loader as never, fallback as never);

      expect(renderAsyncSpy).toHaveBeenCalledWith(loader, fallback);
      expect(result).toBe(UiRoute);
    });
  });

  describe('modal() factory', () => {
    it('creates a RouteComponent with the route registered in the stack registry', () => {
      const router = createRouter();
      const rawRoute = router.route('/modal-test');
      const UiModal = modal(rawRoute);

      expect(UiModal.route).toBe(rawRoute);
      expect(typeof UiModal.render).toBe('function');
    });
  });

  describe('RouteViewer', () => {
    const createStacks = (): RouteStacks => new Map();

    it('returns children when the route is inactive', () => {
      const router = createRouter();
      const testRoute = router.route('/blank');
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="fallback">Fallback</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="fallback"]')).toBeDefined();
    });

    it('returns children when inactive but holding a layout', () => {
      const router = createRouter();
      const testRoute = router.route('/inactive');
      testRoute.render(() => <div>Layout</div>);
      testRoute.active = false;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div>Inner Child</div>
        </RouteViewer>
      ));

      expect(container.textContent).toBe('Inner Child');
    });

    it('renders the Layout and children when active', () => {
      const router = createRouter();
      const testRoute = router.route('/active');
      testRoute.route('/');
      testRoute.render(({ children }) => (
        <div>
          <span data-testid="layout" />
          {children as any}
        </div>
      ));
      testRoute.state.authenticated = true;
      testRoute.index!.state.authenticated = true;
      testRoute.active = true;
      testRoute.index!.active = true;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="child">Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="layout"]')).toBeDefined();
      expect(container.querySelector('[data-testid="child"]')).toBeDefined();
    });

    it('renders Layout and Index child when both are active', () => {
      const router = createRouter();
      const parentRoute = router.route('/parent');
      parentRoute.render(({ children }) => <div data-testid="parent-layout">{children as any}</div>);

      const indexRoute = parentRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index!</div>);

      parentRoute.state.authenticated = true;
      indexRoute.state.authenticated = true;
      parentRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={parentRoute as never} stacks={stacks}>
          <div data-testid="child">Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="parent-layout"]')).toBeDefined();
      expect(container.querySelector('[data-testid="index-view"]')).toBeDefined();
      expect(container.querySelector('[data-testid="child"]')).toBeDefined();
    });

    it('renders content without Layout when active but no renderer', () => {
      const router = createRouter();
      const emptyRoute = router.route('/empty');
      emptyRoute.state.authenticated = true;
      emptyRoute.active = true;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={emptyRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Bypassed Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="bypassed-child"]')).toBeDefined();
      expect(container.textContent).toBe('Bypassed Child');
    });

    it('renders exception renderer when route has an exception', async () => {
      const router = createRouter();
      const testRoute = router.route('/error');
      testRoute.render(({ children }) => <div>{children as any}</div>);
      testRoute.catch((props) => () => <div data-testid="error-view">Error! {props.error.message}</div>);
      const stacks = createStacks();

      // Activate a non-matching URL to trigger exception on the route
      await router.activate('http://localhost/error/nonexistent');

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div>Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="error-view"]')).toBeDefined();
    });

    it('renders the Exception component when the route is not authenticated', () => {
      const router = createRouter();
      const ExceptionComponent = () => () => <div data-testid="unauth-error-view">Unauthenticated!</div>;
      const testRoute = router.route().route('/protected-route');
      const child = testRoute.route('/');
      testRoute.render(({ children }) => children as any).catch(ExceptionComponent);

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      testRoute.state.error = new GuardError('Auth required');
      child.state.authenticated = false;
      child.active = true;
      testRoute.active = true;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="unauth-error-view"]')).not.toBeNull();
    });

    it('renders isolated Exception component when unauthenticated without children', () => {
      const router = createRouter();
      const ExceptionComponent = (props: { error?: Error }) => () => (
        <div data-testid="unauth-isolated-view">Unauth: {props.error?.message}</div>
      );
      const testRoute = router.route('/isolated-protected');
      testRoute.catch(ExceptionComponent);

      testRoute.state.authenticated = false;
      testRoute.state.error = new GuardError('Access denied');
      testRoute.active = true;
      const stacks = createStacks();

      const { container } = render(() => <RouteViewer route={testRoute as never} stacks={stacks} />);
      expect(container.querySelector('[data-testid="unauth-isolated-view"]')?.textContent).toContain('Access denied');
    });

    it('renders null renderer when route has an exception', async () => {
      const router = createRouter();
      const testRoute = router.route('/error');
      testRoute.render(({ children }) => <div>{children as any}</div>);
      const stacks = createStacks();

      // Activate a non-matching URL to trigger exception on the route
      await router.activate('http://localhost/error/nonexistent');

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div>Child</div>
        </RouteViewer>
      ));

      expect(container.querySelector('[data-testid="error-view"]')).toBeNull();
    });

    it('renders Layout instead of isolated exception when route has an exception but also has children', async () => {
      const router = createRouter();
      const testRoute = router.route('/error');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch((props) => () => <div data-testid="error-view">Error! {props.error.message}</div>);

      // Add a child route so route.children.size > 0
      testRoute.route('/child');

      const stacks = createStacks();

      // Activate a non-matching URL to trigger exception on the route
      await router.activate('http://localhost/error/nonexistent');

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div>Child Element</div>
        </RouteViewer>
      ));

      // Because it has children, the exception is rendered inside the layout!
      expect(container.querySelector('[data-testid="layout-wrapper"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="error-view"]')).not.toBeNull();
    });

    it('renders Layout instead of isolated exception when route is not authenticated but also has children', () => {
      const router = createRouter();
      const testRoute = router.route('/protected-route');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch(() => () => <div data-testid="unauth-error-view">Error!</div>);

      // Add a child route so route.children.size > 0
      const child = testRoute.route('/child');

      const stacks = createStacks();

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      child.state.authenticated = false;
      child.active = true;
      testRoute.active = true;

      const { container } = render(() => (
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Child</div>
        </RouteViewer>
      ));

      // Because it has children, the exception is rendered inside the layout!
      expect(container.querySelector('[data-testid="layout-wrapper"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="unauth-error-view"]')).not.toBeNull();
    });

    it('renders Layout instead of isolated exception when route has an exception but has an index renderer', async () => {
      const router = createRouter();
      const testRoute = router.route('/error');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch((props) => () => <div data-testid="error-view">Error! {props.error.message}</div>);

      // Add an index route with a renderer
      const indexRoute = testRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index</div>);

      const stacks = createStacks();

      await router.activate('http://localhost/error/nonexistent');

      const { container } = render(() => <RouteViewer route={testRoute as never} stacks={stacks} />);

      // Because it has an index renderer, the exception is rendered inside the layout!
      expect(container.querySelector('[data-testid="layout-wrapper"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="error-view"]')).not.toBeNull();
    });

    it('renders Layout instead of isolated exception when route is not authenticated but has an index renderer', () => {
      const router = createRouter();
      const testRoute = router.route('/protected-route');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch(() => () => <div data-testid="unauth-error-view">Error!</div>);

      // Add an index route with a renderer
      const indexRoute = testRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index</div>);

      const stacks = createStacks();

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      indexRoute.state.authenticated = false;
      indexRoute.active = true;
      testRoute.active = true;

      const { container } = render(() => <RouteViewer route={testRoute as never} stacks={stacks} />);

      // Because it has an index renderer, the exception is rendered inside the layout!
      expect(container.querySelector('[data-testid="layout-wrapper"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="unauth-error-view"]')).not.toBeNull();
    });
  });

  describe('RouteViewer - modal/stack branch', () => {
    const createStacks = (): RouteStacks => new Map();

    it('pushes a modal route into the stacks map and returns null inline', () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-push');
      modal(modalRoute);
      modalRoute.state.authenticated = true;
      modalRoute.active = true;
      const stacks = createStacks();

      const { container } = render(() => (
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="tree-child">Tree Child</div>
        </RouteViewer>
      ));

      // The modal branch returns null, so inline content should be empty
      expect(container.innerHTML).toBe('');
      expect(stacks.size).toBe(1);
      expect(stacks.has(modalRoute as never)).toBe(true);
    });

    it('renders a modal when inactive', () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-full');
      modal(modalRoute);

      modalRoute.render(({ children }) => <div data-testid="modal-layout">{children as any}</div>);

      const stacks = createStacks();

      render(() => <RouteViewer route={modalRoute as never} stacks={stacks} />);

      // Render the Stack component from the map
      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();

      const { container } = render(() => <Stack />);
      expect(container.querySelector('[data-testid="modal-layout"]')).toBeNull();
    });

    it('renders a modal with Layout and Index in the stack when both are active', () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-full');
      modal(modalRoute);

      modalRoute.render(({ children }) => <div data-testid="modal-layout">{children as any}</div>);
      const indexRoute = modalRoute.route('/');
      indexRoute.render(() => <div data-testid="modal-index">Modal Index</div>);

      modalRoute.state.authenticated = true;
      indexRoute.state.authenticated = true;
      modalRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(() => <RouteViewer route={modalRoute as never} stacks={stacks} />);

      // Render the Stack component from the map
      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();

      const { container } = render(() => <Stack />);
      expect(container.querySelector('[data-testid="modal-layout"]')).toBeDefined();
      expect(container.querySelector('[data-testid="modal-index"]')).toBeDefined();
    });
  });

  describe('UIRouter', () => {
    it('binds popstate listener on mount and removes on unmount', async () => {
      const router = createRouter<JSX.Element>();
      const RootUi = page(router.rootRoute).render(() => <span>OK</span>);

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      const { unmount } = render(() => <UIRouter router={router} root={RootUi} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      unmount();
      await Promise.resolve();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('scrolls to top on activation', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} headless={false} resetScroll={true} />);

      await activateSpy.mock.results[0]?.value;

      expect(activateSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior });
    });

    it('uses string resetScroll value as scroll behavior', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} headless={false} resetScroll={'instant'} />);

      await activateSpy.mock.results[0]?.value;

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    });

    it('scrolls element into view on popstate when hash target exists', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const targetEl = document.createElement('div');
      targetEl.id = 'section-target';
      const scrollIntoViewMock = vi.fn();
      targetEl.scrollIntoView = scrollIntoViewMock;
      document.body.appendChild(targetEl);

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} />);

      const popstateListener = addEventListenerSpy.mock.calls.find(
        ([event]: [string, ...unknown[]]) => event === 'popstate'
      )?.[1] as (evt: unknown) => Promise<void>;
      expect(popstateListener).toBeDefined();

      await popstateListener({
        state: {
          from: { path: '/docs' },
          to: { path: '/docs', hash: 'section-target', href: 'http://localhost/docs#section-target' },
        },
      });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: 'start',
        inline: 'start',
        behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior,
      });
      document.body.removeChild(targetEl);
    });

    it('scrolls element into view after activation when navigating across paths with hash', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const targetEl = document.createElement('div');
      targetEl.id = 'section-other';
      const scrollIntoViewMock = vi.fn();
      targetEl.scrollIntoView = scrollIntoViewMock;
      document.body.appendChild(targetEl);

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} />);

      const popstateListener = addEventListenerSpy.mock.calls.find(
        ([event]: [string, ...unknown[]]) => event === 'popstate'
      )?.[1] as (evt: unknown) => Promise<void>;

      await popstateListener({
        state: {
          from: { path: '/other' },
          to: { path: '/docs', hash: 'section-other', href: 'http://localhost/docs#section-other' },
        },
      });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: 'start',
        inline: 'start',
        behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior,
      });
      document.body.removeChild(targetEl);
    });

    it('handles hash navigation gracefully when target element does not exist in DOM', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} />);

      const popstateListener = addEventListenerSpy.mock.calls.find(
        ([event]: [string, ...unknown[]]) => event === 'popstate'
      )?.[1] as (evt: unknown) => Promise<void>;

      await popstateListener({
        state: {
          from: { path: '/docs' },
          to: { path: '/docs', hash: 'non-existent-id', href: 'http://localhost/docs#non-existent-id' },
        },
      });
    });

    it('logs error when activation throws a non-Redirect error', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(router, 'activate').mockRejectedValueOnce(new Error('Activation failed'));

      render(() => <UIRouter router={router} root={rootUi} headless={false} />);
      await Promise.resolve();

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
      errorSpy.mockRestore();
    });

    it('silently handles Redirect error during activation', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const targetRoute = router.route('/target');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(router, 'activate').mockRejectedValueOnce(new Redirect(targetRoute as never));

      render(() => <UIRouter router={router} root={rootUi} headless={false} />);
      await Promise.resolve();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('silently handles Redirect error with string URL during activation', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(router, 'activate').mockRejectedValueOnce(new Redirect('/url-target'));

      render(() => <UIRouter router={router} root={rootUi} headless={false} />);
      await Promise.resolve();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('does not reset scroll when destination is a modal stack route', async () => {
      const router = createRouter<JSX.Element>();
      const modalRoute = router.route('/modal-route');
      modal(modalRoute);
      const rootUi = page(router.rootRoute);

      vi.spyOn(router, 'find').mockReturnValue({ route: modalRoute } as never);
      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} headless={false} resetScroll={true} />);

      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('renders modal routes through StackRenderer when active', () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const modalRoute = router.route('/stack-modal');
      modal(modalRoute);
      modalRoute.render(() => <div data-testid="stack-modal-content">Modal</div>);
      modalRoute.state.authenticated = true;
      modalRoute.active = true;

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      const { container } = render(() => <UIRouter router={router} root={rootUi} />);

      expect(container.querySelector('[data-testid="stack-modal-content"]')).toBeDefined();
      expect(container.querySelector('.route-modal')).toBeDefined();
    });
  });

  describe('Global Redirect Handler', () => {
    let pushSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      pushSpy = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    });

    afterEach(() => {
      pushSpy.mockRestore();
    });

    it('should navigate automatically when a Redirect is created', async () => {
      const router = createRouter();
      const rawRoute = router.route('/redirect-target');

      redirect(rawRoute, {
        params: { id: '1' },
        query: { foo: 'bar' },
      } as any);

      await Promise.resolve();

      expect(pushSpy).toHaveBeenCalledWith(
        { href: '/redirect-target?foo=bar', query: { foo: 'bar' }, params: { id: '1' }, redirect: location.href },
        '',
        '/redirect-target?foo=bar'
      );
    });

    it('should navigate automatically when a string URL Redirect is created', async () => {
      redirect('/url-target' as never, { query: { key: 'val' } } as any);

      await Promise.resolve();

      expect(pushSpy).toHaveBeenCalledWith(
        { href: '/url-target?key=val', query: { key: 'val' }, redirect: location.href },
        '',
        '/url-target?key=val'
      );
    });
  });
  describe('RouteRenderer', () => {
    const createStacks = (): RouteStacks => new Map();

    it('recursively renders child routes through the registry', () => {
      const router = createRouter();
      const rootRoute = router.route('/root');
      rootRoute.render(({ children }) => <div data-testid="root-layout">{children as any}</div>);

      const childRoute = rootRoute.route('/child-1');
      childRoute.render(() => <div data-testid="child-1">Child 1</div>);

      rootRoute.state.authenticated = true;
      childRoute.state.authenticated = true;
      rootRoute.active = true;
      childRoute.active = true;
      const stacks = createStacks();

      const registry = Array.from(router.routes)[0];
      const { container } = render(() => (
        <RouteRendererComponent route={rootRoute as never} registry={registry as any} stacks={stacks} />
      ));

      expect(container.querySelector('[data-testid="root-layout"]')).toBeDefined();
      expect(container.querySelector('[data-testid="child-1"]')).toBeDefined();
    });
  });

  describe('page() UIRoute component', () => {
    it('passes children through when rendered as a component', () => {
      const router = createRouter();
      const rawRoute = router.route('/passthrough');
      const UiRoute = page(rawRoute);

      const { container } = render(() => (
        <UiRoute>
          <div data-testid="passed-child">Hello</div>
        </UiRoute>
      ));

      expect(container.querySelector('[data-testid="passed-child"]')).toBeDefined();
      expect(container.textContent).toBe('Hello');
    });

    it('supports .render() chaining', () => {
      const router = createRouter();
      const rawRoute = router.route('/render-chain');
      const UiRoute = page(rawRoute);

      const result = UiRoute.render(() => <div>Rendered</div>);
      expect(result).toBe(UiRoute);
      expect(rawRoute.renderer).toBeDefined();
    });
  });

  describe('deprecated route() wrapper', () => {
    it('delegates to page() and returns a RouteComponent', () => {
      const router = createRouter();
      const rawRoute = router.route('/deprecated');
      const UiRoute = route(rawRoute);

      expect(UiRoute.route).toBe(rawRoute);
      expect(typeof UiRoute.render).toBe('function');
    });
  });

  describe('getCurrentUrl()', () => {
    it('returns location.href when outside router context in browser', () => {
      const url = getCurrentUrl();
      expect(url).toBe(location.href);
    });

    it('falls back to DEFAULT_CONFIG.baseUrl when location is undefined', () => {
      const originalLocation = globalThis.location;
      try {
        delete (globalThis as any).location;
        const url = getCurrentUrl();
        expect(url).toBeDefined();
      } finally {
        globalThis.location = originalLocation;
      }
    });
  });
});
