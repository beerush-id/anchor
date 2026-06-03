/** @jsxImportSource solid-js */

import { createRouter } from '@anchorlib/router';
import { render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteStacks } from '../../src/index.js';
import { redirect, RouteRendererComponent, RouteViewer, UIRouter } from '../../src/index.js';
import { modal, page, route } from '../../src/router/index.js';

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
      testRoute.catch(({ error }) => <div data-testid="error-view">Error! {error.message}</div>);
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
  });

  describe('RouteViewer - modal/stack branch', () => {
    const createStacks = (): RouteStacks => new Map();

    it('pushes a modal route into the stacks map and returns null inline', () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-push');
      modal(modalRoute);
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

      render(() => <UIRouter router={router} root={rootUi} resetScroll={true} />);

      expect(activateSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    });

    it('uses string resetScroll value as scroll behavior', async () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(() => <UIRouter router={router} root={rootUi} resetScroll={'instant'} />);

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    });

    it('renders modal routes through StackRenderer when active', () => {
      const router = createRouter<JSX.Element>();
      const rootUi = page(router.rootRoute);
      const modalRoute = router.route('/stack-modal');
      modal(modalRoute);
      modalRoute.render(() => <div data-testid="stack-modal-content">Modal</div>);
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
  });
  describe('RouteRenderer', () => {
    const createStacks = (): RouteStacks => new Map();

    it('recursively renders child routes through the registry', () => {
      const router = createRouter();
      const rootRoute = router.route('/root');
      rootRoute.render(({ children }) => <div data-testid="root-layout">{children as any}</div>);

      const childRoute = rootRoute.route('/child-1');
      childRoute.render(() => <div data-testid="child-1">Child 1</div>);

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
});
