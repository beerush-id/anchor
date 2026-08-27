import '../../src/client/index.js';
import { type AnyType, clearContextStore, mutable } from '@airlib/core';
import { DEFAULT_CONFIG, NotFoundError, Redirect, type UnknownRoute } from '@airlib/router';
import { act, render, screen } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRouter,
  getCurrentUrl,
  modal,
  page,
  redirect,
  route,
  RouteRendererComponent,
  RouteViewer,
  UIRouter,
} from '../../src/index.js';
import { DEFAULT_ROUTER_CONFIGS } from '../../src/router/constant.js';

describe('Anchor React - UIRouter & RouteViewer Components', () => {
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

  describe('route() HOC wrapper', () => {
    it('wraps an @airlib/router Route and exposes it accurately via the .index and .route properties', () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/testing');
      const UiRoute = page(rawRoute);

      expect(UiRoute.route).toBe(rawRoute);
      expect(typeof UiRoute.render).toBe('function');
    });
  });

  describe('page() factory', () => {
    it('creates a RouteComponent identical to route()', () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/page-test');
      const UiPage = page(rawRoute);

      expect(UiPage.route).toBe(rawRoute);
      expect(typeof UiPage.render).toBe('function');
      expect(typeof UiPage.renderAsync).toBe('function');
    });

    it('exposes renderAsync method', () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/page-test');
      const UiPage = page(rawRoute);
      const loader = vi.fn();
      const fallback = vi.fn();

      const renderAsyncSpy = vi.spyOn(rawRoute, 'renderAsync');
      const result = UiPage.renderAsync(loader as never, fallback as never);

      expect(renderAsyncSpy).toHaveBeenCalledWith(loader, fallback);
      expect(result).toBe(UiPage);
    });
  });

  describe('route() deprecated factory', () => {
    it('delegates to page() and exposes the same RouteComponent surface', () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/legacy');
      const UiRoute = route(rawRoute as never);

      expect(UiRoute.route).toBe(rawRoute);
      expect(typeof UiRoute.render).toBe('function');
      expect(typeof UiRoute.renderAsync).toBe('function');
    });
  });

  describe('modal() factory', () => {
    it('creates a RouteComponent with the route registered in the stack registry', () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/modal-test');
      const UiModal = modal(rawRoute);

      expect(UiModal.route).toBe(rawRoute);
      expect(typeof UiModal.render).toBe('function');
    });
  });

  describe('RouteViewer', () => {
    const createStacks = () => new Map();

    it('returns children natively if the route is inactive or lacks a renderer', () => {
      const router = createRouter<ReactNode>();
      const testRoute = router.route('/blank');
      const stacks = createStacks();

      render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="fallback">Fallback</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('fallback')).toBeDefined();
    });

    it('returns null visually when inactive but holding a layout (React natively outputs empty for null/inactive Snippets wrapped)', () => {
      const router = createRouter<ReactNode>();
      const testRoute = router.route('/inactive');
      testRoute.render(() => <div>Layout</div>);
      testRoute.active = false;
      const stacks = createStacks();

      const { container } = render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div>Inner Child</div>
        </RouteViewer>
      );

      // Because Snippet processes the boolean logic conditionally, inactive routes render nothing
      // over their layouts unless explicit children bypass.
      expect(container.textContent).toBe('Inner Child');
    });

    it('renders the Layout and children when active', () => {
      const router = createRouter<ReactNode>();
      const testRoute = router.route('/active');
      testRoute.render(({ children }) => (
        <div>
          <span data-testid="layout" />
          {children}
        </div>
      ));
      testRoute.state.authenticated = true;
      testRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="child">Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('layout')).toBeDefined();
      expect(screen.getByTestId('child')).toBeDefined();
    });

    it('renders Layout and Index child exactly if both components exist and both are active', () => {
      const router = createRouter<ReactNode>();
      const parentRoute = router.route('/parent');
      parentRoute.render(({ children }) => <div data-testid="parent-layout">{children}</div>);

      const indexRoute = parentRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index!</div>);

      parentRoute.state.authenticated = true;
      indexRoute.state.authenticated = true;
      parentRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={parentRoute as never} stacks={stacks}>
          <div data-testid="child">Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('parent-layout')).toBeDefined();
      expect(screen.getByTestId('index-view')).toBeDefined();
      expect(screen.getByTestId('child')).toBeDefined();
    });

    it('returns the Index alone if the Layout is missing but Index exists and is active', () => {
      const router = createRouter();
      const parentRoute = router.route('/parent-no-layout');
      // No layout renderer assigned to parentRoute

      const indexRoute = parentRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view-only">Index Alone!</div>);

      parentRoute.state.authenticated = true;
      indexRoute.state.authenticated = true;
      parentRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={parentRoute as never} stacks={stacks}>
          <div data-testid="child-ignored">Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('index-view-only')).toBeDefined();
    });

    it('returns children natively if it lacks both Layout and Index components but remains active', () => {
      const router = createRouter();
      const emptyRoute = router.route('/empty');
      // No layout renderer and no index renderer assigned

      emptyRoute.state.authenticated = true;
      emptyRoute.active = true;
      const stacks = createStacks();

      const { container } = render(
        <RouteViewer route={emptyRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Bypassed Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('bypassed-child')).toBeDefined();
      expect(container.textContent).toBe('Bypassed Child');
    });

    it('renders the Exception component and sets its displayName when exceptionRenderer exists', () => {
      const router = createRouter();
      const ExceptionComponent = () => <div data-testid="error-view">Error</div>;
      const testRoute = router.route().route('/error-route');
      const child = testRoute.route('/');
      testRoute.render(({ children }) => children).catch(ExceptionComponent);

      // Simulate route with an exception
      child.active = true;
      testRoute.active = true;
      testRoute.context.exception = new Error() as never;
      const stacks = createStacks();

      render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('error-view')).toBeDefined();
    });

    it('renders the Exception component when the route is not authenticated', () => {
      const router = createRouter();
      const ExceptionComponent = () => <div data-testid="unauth-error-view">Unauthenticated!</div>;
      const testRoute = router.route().route('/protected-route');
      const child = testRoute.route('/');
      testRoute.render(({ children }) => children).catch(ExceptionComponent);

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      child.active = true;
      testRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('unauth-error-view')).toBeDefined();
    });

    it('renders Layout instead of isolated exception when route is not authenticated but also has children', () => {
      const router = createRouter();
      const testRoute = router.route('/protected-route');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch(({ error }) => <div data-testid="unauth-error-view">Error!</div>);

      // Add a child route so route.children.size > 0
      const child = testRoute.route('/child');

      const stacks = createStacks();

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      child.active = true;
      testRoute.active = true;

      render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="bypassed-child">Child</div>
        </RouteViewer>
      );

      // Because it has children, the exception is rendered inside the layout!
      expect(screen.getByTestId('layout-wrapper')).toBeDefined();
      expect(screen.getByTestId('unauth-error-view')).toBeDefined();
    });

    it('renders Layout instead of isolated exception when route is not authenticated but has an index renderer', () => {
      const router = createRouter();
      const testRoute = router.route('/protected-route');
      testRoute.render(({ children }) => <div data-testid="layout-wrapper">{children as any}</div>);
      testRoute.catch(({ error }) => <div data-testid="unauth-error-view">Error!</div>);

      // Add an index route with a renderer
      const indexRoute = testRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index</div>);

      const stacks = createStacks();

      // Simulate route without authentication
      testRoute.state.authenticated = false;
      indexRoute.active = true;
      testRoute.active = true;

      render(<RouteViewer route={testRoute as never} stacks={stacks} />);

      // Because it has an index renderer, the exception is rendered inside the layout!
      expect(screen.getByTestId('layout-wrapper')).toBeDefined();
      expect(screen.getByTestId('unauth-error-view')).toBeDefined();
    });
  });

  describe('RouteViewer - modal/stack branch', () => {
    const createStacks = () => mutable<Map<UnknownRoute, FC>>(new Map());

    it('pushes a modal route into the stacks map via queueMicrotask and returns null inline', async () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-push');
      modal(modalRoute);
      modalRoute.active = true;
      const stacks = createStacks();

      const { container } = render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="tree-child">Tree Child</div>
        </RouteViewer>
      );

      // The modal branch returns null, so inline content should not include Layout/Index
      expect(container.innerHTML).toBe('');

      // Wait for queueMicrotask to fire
      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      expect(stacks.size).toBe(1);
      expect(stacks.has(modalRoute as never)).toBe(true);
    });

    it('renders a modal with Layout and Index in the stack when both are active', async () => {
      const router = createRouter<ReactNode>();
      const modalRoute = router.route('/modal-full');
      modal(modalRoute);

      modalRoute.render(({ children }) => <div data-testid="modal-layout">{children}</div>);
      const indexRoute = modalRoute.route('/');
      indexRoute.render(() => <div data-testid="modal-index">Modal Index</div>);

      modalRoute.state.authenticated = true;
      indexRoute.state.authenticated = true;
      modalRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(<RouteViewer route={modalRoute as never} stacks={stacks} />);

      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      // Render the Stack component from the map
      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();

      render(<Stack />);
      expect(screen.getByTestId('modal-layout')).toBeDefined();
      expect(screen.getByTestId('modal-index')).toBeDefined();
    });

    it('renders a modal with Layout only (no Index) in the stack', async () => {
      const router = createRouter<ReactNode>();
      const modalRoute = router.route('/modal-layout-only');
      modal(modalRoute);

      modalRoute.render(({ children }) => <div data-testid="modal-layout-only">{children}</div>);

      modalRoute.state.authenticated = true;
      modalRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="modal-child">Child Inside Modal</div>
        </RouteViewer>
      );

      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      const Stack = stacks.get(modalRoute as never)!;
      render(<Stack />);
      expect(screen.getByTestId('modal-layout-only')).toBeDefined();
    });

    it('renders a modal with Index only (no Layout) in the stack', async () => {
      const router = createRouter<ReactNode>();
      const modalRoute = router.route('/modal-index-only');
      modal(modalRoute);
      // No layout renderer, but add an index route
      const indexRoute = modalRoute.route('/');
      indexRoute.render(() => <div data-testid="modal-index-alone">Index Alone</div>);

      modalRoute.state.authenticated = true;
      modalRoute.active = true;
      indexRoute.state.authenticated = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(<RouteViewer route={modalRoute as never} stacks={stacks} />);

      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      const Stack = stacks.get(modalRoute as never)!;
      render(<Stack />);
      expect(screen.getByTestId('modal-index-alone')).toBeDefined();
    });

    it('renders children passthrough in the stack when inactive', async () => {
      const router = createRouter<ReactNode>();
      const modalRoute = router.route('/modal-inactive');
      modal(modalRoute);
      modalRoute.active = false;
      const stacks = createStacks();

      render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="inactive-child">Inactive Modal Child</div>
        </RouteViewer>
      );

      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      const Stack = stacks.get(modalRoute as never)!;
      render(<Stack />);
      // When inactive, the stack's render block returns children (passthrough)
      expect(screen.getByTestId('inactive-child')).toBeDefined();
    });

    it('renders children in the stack when active but has no Layout or Index', async () => {
      const router = createRouter<ReactNode>();
      const modalRoute = router.route('/modal-empty');
      modal(modalRoute);
      // No layout renderer, no index route
      modalRoute.state.authenticated = true;
      modalRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="empty-modal-child">Empty Modal</div>
        </RouteViewer>
      );

      await act(async () => {
        await new Promise((r) => queueMicrotask(r as never));
      });

      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();
      render(<Stack />);
      expect(screen.getByTestId('empty-modal-child')).toBeDefined();
    });
  });

  describe('RouteRenderer', () => {
    const createStacks = () => mutable<Map<UnknownRoute, FC>>(new Map());

    it('recursively renders children mapping through the RouteRegistry and mutates displayNames', () => {
      const router = createRouter<ReactNode>();
      const rootRoute = router.route('/root');

      rootRoute.render(({ children }) => <div data-testid="layout">{children}</div>);
      rootRoute.route('/').render(() => <div>Index</div>);

      // Dynamic child inside registry
      const childRoute = rootRoute.route('/child-1');
      childRoute.render(() => <div data-testid="child-1">Child 1 Component</div>);

      rootRoute.state.authenticated = true;
      childRoute.state.authenticated = true;

      rootRoute.active = true;
      childRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteRendererComponent
          route={rootRoute as never}
          registry={rootRoute.router.rootRegistry.get('root') as AnyType}
          stacks={stacks}
        />
      );

      // Assure children map recursively mounted
      expect(screen.getByTestId('child-1')).toBeDefined();
    });

    it('assigns generic fallback / displayNames to empty root layout blocks automatically', () => {
      const router = createRouter<ReactNode>();
      const emptyRoot = router.rootRoute;

      // When route.path parses generically to '', test the || '/' internal fallback mechanism.
      emptyRoot.render(() => <div>Root</div>);

      const stacks = createStacks();
      render(<RouteRendererComponent route={emptyRoot} registry={router.rootRegistry} stacks={stacks} />);

      // Since emptyRoot lacks an index renderer, it drops into the explicit Index() fallback naming branch
      expect((emptyRoot.renderer as AnyType).displayName).toBe('Content(/)');
    });

    it('assigns both Layout and Index displayNames with generic fallback paths when both exist on the absolute root', () => {
      const router = createRouter<ReactNode>();
      const root = router.rootRoute;
      const rootIndex = root.route('/');

      page(root).render(({ children }) => <div>{children}</div>);
      rootIndex.render(() => <div>Root Index</div>);

      const stacks = createStacks();
      render(<RouteRendererComponent route={root} registry={router.rootRegistry} stacks={stacks} />);

      expect((root.renderer as AnyType).displayName).toBe('Layout(/)');
      expect((rootIndex.renderer as AnyType).displayName).toBe('Content(/)');
    });

    it('assigns both Layout and Index displayNames with generic fallback paths when both exist on the absolute root', () => {
      const router = createRouter<ReactNode>();
      const root = router.rootRoute;
      const indexRoute = root.route('/');

      root.active = true;
      indexRoute.active = true;

      page(root).render(({ children }) => <div>{children}</div>);

      const stacks = createStacks();
      render(<RouteRendererComponent route={root} registry={router.rootRegistry} stacks={stacks} />);

      expect((root.renderer as AnyType).displayName).toBe('Content(/)');
    });

    it('assigns both Layout and Child displayNames with generic fallback paths when both exist on the absolute root', () => {
      const router = createRouter<ReactNode>();
      const root = router.rootRoute;
      const child = root.route('/child');

      page(root).render(({ children }) => <div>{children}</div>);
      child.render(() => <div>Child Page</div>);

      const stacks = createStacks();
      render(<RouteRendererComponent route={root} registry={router.rootRegistry} stacks={stacks} />);

      expect((root.renderer as AnyType).displayName).toBe('Layout(/)');
      expect((child.renderer as AnyType).displayName).toBe('Content(/child)');
    });
  });

  describe('UIRouter', () => {
    it('binds memory listeners upon mounting and destroys upon unmounting', () => {
      const router = createRouter<ReactNode>();
      const RootUi = page(router.rootRoute).render(() => <span>OK</span>);

      vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      const { unmount } = render(
        <>
          <UIRouter router={router} root={RootUi} />
          <RootUi />
        </>
      );

      // Assure popstate event listener added immediately via `createEffect`
      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('scrolls cleanly to top visually alongside its activation', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      const { unmount } = render(<UIRouter router={router} root={rootUi} headless={false} resetScroll={true} />);
      unmount();

      // Because activation fires twice initially via direct invoke and effects loop, verify scrollTo also fires properly
      // Awaiting UI router cycle natively:
      await act(async () => {
        await activateSpy.mock.results[0]?.value;
      });

      expect(activateSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior });

      scrollToSpy.mockClear();
      render(<UIRouter router={router} root={rootUi} headless={false} resetScroll={false} />);
      render(<UIRouter router={router} root={rootUi} headless={false} resetScroll={'instant'} />);
    });

    it('skips scrolling to top if a modal stack is active', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      const modalRoute = router.route('/modal');
      modal(modalRoute);

      // Make the modal active so it gets registered in stacks during render
      modalRoute.active = true;

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);
      scrollToSpy.mockClear();

      render(<UIRouter router={router} root={rootUi} url={'https://localhost/modal'} resetScroll={true} />);

      await act(async () => {
        await activateSpy.mock.results[0]?.value;
        // Wait another microtask for RouteViewer's queueMicrotask to set the stack
        await new Promise((r) => queueMicrotask(r as never));
      });

      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    const mountHashTarget = (id: string) => {
      const target = document.createElement('section');
      target.id = id;
      const scrollSpy = vi.fn();
      target.scrollIntoView = scrollSpy;
      document.body.appendChild(target);

      return { target, scrollSpy };
    };

    const dispatchPopState = (state: Record<string, unknown>) => {
      window.dispatchEvent(new PopStateEvent('popstate', { state } as PopStateEventInit));
    };

    it('scrolls to same-path hash targets without reactivating the route', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);
      const { target, scrollSpy } = mountHashTarget('setup');

      render(<UIRouter router={router} root={rootUi} />);

      await act(async () => {
        dispatchPopState({ from: { path: '/docs' }, to: { path: '/docs', hash: 'setup' } });
        await activateSpy.mock.results[0]?.value;
      });

      await Promise.resolve();

      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'start',
        inline: 'start',
        behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior,
      });
      expect(activateSpy).not.toHaveBeenCalled();
      target.remove();
    });

    it('uses the string resetScroll value as the hash scroll behavior', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);

      // Coverage for slave route rendering.
      void router.add('/foo');

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);
      const { target, scrollSpy } = mountHashTarget('setup');

      render(<UIRouter router={router} root={rootUi} resetScroll="instant" />);

      await act(async () => {
        dispatchPopState({ from: { path: '/docs' }, to: { path: '/docs', hash: 'setup' } });
        await activateSpy.mock.results[0]?.value;
      });

      await Promise.resolve();

      expect(scrollSpy).toHaveBeenCalledWith({ block: 'start', inline: 'start', behavior: 'instant' });
      target.remove();
    });

    it('ignores hash targets that are missing from the document', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);

      render(<UIRouter router={router} root={rootUi} />);

      await act(async () => {
        dispatchPopState({ from: { path: '/docs' }, to: { path: '/docs', hash: 'missing' } });
        await activateSpy.mock.results[0]?.value;
      });

      // No element to scroll and no reactivation, without throwing.
      expect(activateSpy).not.toHaveBeenCalled();
    });

    it('scrolls to hash targets after activating a different path', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      const activateSpy = vi.spyOn(router, 'activate').mockImplementation((async () => {}) as never);
      const { target, scrollSpy } = mountHashTarget('setup');
      const href = `${location.origin}/docs#setup`;

      render(<UIRouter router={router} root={rootUi} />);

      await act(async () => {
        dispatchPopState({ from: { path: '/' }, to: { path: '/docs', hash: 'setup', href } });
        await activateSpy.mock.results[0]?.value;
        // The hash scroll settles 100ms after activation completes.
        await new Promise((r) => setTimeout(r, 150));
      });

      await Promise.resolve();

      expect(activateSpy).toHaveBeenCalledWith(href);
      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'start',
        inline: 'start',
        behavior: DEFAULT_ROUTER_CONFIGS.scrollBehavior,
      });
      target.remove();
    });

    it('logs unexpected activation errors and halts', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      const error = new Error('activation failed');
      vi.spyOn(router, 'activate').mockImplementation((async () => {
        throw error;
      }) as never);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<UIRouter router={router} root={rootUi} headless={false} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });

    it('halts silently when activation is interrupted by a Redirect', async () => {
      const router = createRouter<ReactNode>();
      const rootUi = page(router.rootRoute);
      vi.spyOn(router, 'activate').mockImplementation((async () => {
        throw new Redirect('/login');
      }) as never);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<UIRouter router={router} root={rootUi} headless={false} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentUrl', () => {
    // The router context lives in a shared store that survives tests; clear it so
    // stale `uiRouterCtx` values never leak between cases.
    beforeEach(() => {
      clearContextStore();
    });

    it('falls back to the current location outside of a router context', () => {
      expect(getCurrentUrl()).toBe(location.href);
    });

    it('resolves the router context url inside UIRouter', () => {
      const router = createRouter<ReactNode>();
      router.context.url = 'https://anchor.dev/docs';

      let resolved: string | undefined;
      const Probe: FC = () => {
        resolved = getCurrentUrl();
        return null;
      };

      render(
        <UIRouter router={router}>
          <Probe />
        </UIRouter>
      );

      expect(resolved).toBe('https://anchor.dev/docs');
    });

    it('falls back to the configured base url when location does not exist', () => {
      vi.stubGlobal('location', undefined);

      try {
        expect(getCurrentUrl()).toBe(DEFAULT_CONFIG.baseUrl);
      } finally {
        vi.unstubAllGlobals();
      }
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

    it('should navigate automatically when a Redirect is thrown/created', async () => {
      const router = createRouter<ReactNode>();
      const rawRoute = router.route('/redirect-target');

      // Creating a redirect invokes the handler registered natively by router.tsx
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

  describe('Exception rendering on leaf routes', () => {
    it('renders ExceptionSnippet directly when leaf route has exception and no children', async () => {
      const router = createRouter<ReactNode>();
      const leafRoute = router.route('/leaf-error');
      leafRoute.active = true;
      leafRoute.context.exception = new NotFoundError('Leaf Error');
      leafRoute.catch(() => <div>Custom Leaf Error Page</div>);

      const { container } = render(
        <UIRouter router={router}>
          <RouteViewer route={leafRoute as any} stacks={new Map()} />
        </UIRouter>
      );

      expect(container.textContent).toContain('Custom Leaf Error Page');
    });

    it('renders ExceptionSnippet when leaf route is not authenticated', async () => {
      const router = createRouter<ReactNode>();
      const leafRoute = router.route('/unauth');
      leafRoute.active = true;
      leafRoute.state.authenticated = false;
      leafRoute.catch(() => <div>Access Denied</div>);

      const { container } = render(
        <UIRouter router={router}>
          <RouteViewer route={leafRoute as any} stacks={new Map()} />
        </UIRouter>
      );

      expect(container.textContent).toContain('Access Denied');
    });

    it('does not render ExceptionSnippet when route with catch handler has no exception', () => {
      const router = createRouter<ReactNode>();
      const parentRoute = router.route('/parent-ok');
      const childRoute = parentRoute.route('/child-ok');
      parentRoute.render(({ children }) => <div className="layout">{children}</div>).catch(() => <div>Error</div>);
      childRoute.render(() => <div>Child Success</div>);
      parentRoute.active = true;
      childRoute.active = true;
      parentRoute.state.authenticated = true;
      childRoute.state.authenticated = true;

      const { container } = render(
        <UIRouter router={router}>
          <RouteViewer route={parentRoute as any} stacks={new Map()}>
            <RouteViewer route={childRoute as any} stacks={new Map()} />
          </RouteViewer>
        </UIRouter>
      );

      expect(container.textContent).toContain('Child Success');
      expect(container.textContent).not.toContain('Error');
    });
  });
});
