import '../../src/client/index.js';
import { mutable } from '@anchorlib/core';
import type { UnknownRoute } from '@anchorlib/router';
import { createRouter, redirect } from '@anchorlib/router';
import { act, render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { modal, page, RouteRenderer, RouteViewer, UIRouter } from '../../src/router/router.js';

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
    it('wraps an @anchorlib/router Route and exposes it accurately via the .index and .route properties', () => {
      const router = createRouter();
      const rawRoute = router.route('/testing');
      const UiRoute = page(rawRoute);

      expect(UiRoute.index).toBe(rawRoute);
      expect(typeof UiRoute.route).toBe('function');

      const childUiRoute = UiRoute.route('/child');
      expect(childUiRoute.path).toBe('/testing/child');
    });
  });

  describe('page() factory', () => {
    it('creates a RouteComponent identical to route()', () => {
      const router = createRouter();
      const rawRoute = router.route('/page-test');
      const UiPage = page(rawRoute);

      expect(UiPage.index).toBe(rawRoute);
      expect(typeof UiPage.route).toBe('function');
    });
  });

  describe('modal() factory', () => {
    it('creates a RouteComponent with the route registered in the stack registry', () => {
      const router = createRouter();
      const rawRoute = router.route('/modal-test');
      const UiModal = modal(rawRoute);

      expect(UiModal.index).toBe(rawRoute);
      expect(typeof UiModal.route).toBe('function');
    });

    it('supports child routes like page()', () => {
      const router = createRouter();
      const rawRoute = router.route('/modal-parent');
      const UiModal = modal(rawRoute);

      const child = UiModal.route('/child');
      expect(child.path).toBe('/modal-parent/child');
    });
  });

  describe('RouteViewer', () => {
    const createStacks = () => mutable<Map<UnknownRoute, FC>>(new Map());

    it('returns children natively if the route is inactive or lacks a renderer', () => {
      const router = createRouter();
      const testRoute = router.route('/blank');
      const stacks = createStacks();

      const { container } = render(
        <RouteViewer route={testRoute as never} stacks={stacks}>
          <div data-testid="fallback">Fallback</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('fallback')).toBeDefined();
    });

    it('returns null visually when inactive but holding a layout (React natively outputs empty for null/inactive Snippets wrapped)', () => {
      const router = createRouter();
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
      const router = createRouter();
      const testRoute = router.route('/active');
      testRoute.render((state, context, children) => (
        <div>
          <span data-testid="layout" />
          {children as any}
        </div>
      ));
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
      const router = createRouter();
      const parentRoute = router.route('/parent');
      parentRoute.render((state, context, children) => <div data-testid="parent-layout">{children as any}</div>);

      const indexRoute = parentRoute.route('/');
      indexRoute.render(() => <div data-testid="index-view">Index!</div>);

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
        await new Promise((r) => queueMicrotask(r));
      });

      expect(stacks.size).toBe(1);
      expect(stacks.has(modalRoute as never)).toBe(true);
    });

    it('renders a modal with Layout and Index in the stack when both are active', async () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-full');
      modal(modalRoute);

      modalRoute.render((state, context, children) => <div data-testid="modal-layout">{children as any}</div>);
      const indexRoute = modalRoute.route('/');
      indexRoute.render(() => <div data-testid="modal-index">Modal Index</div>);

      modalRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(<RouteViewer route={modalRoute as never} stacks={stacks} />);

      await act(async () => {
        await new Promise((r) => queueMicrotask(r));
      });

      // Render the Stack component from the map
      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();

      const { container } = render(<Stack />);
      expect(screen.getByTestId('modal-layout')).toBeDefined();
      expect(screen.getByTestId('modal-index')).toBeDefined();
    });

    it('renders a modal with Layout only (no Index) in the stack', async () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-layout-only');
      modal(modalRoute);

      modalRoute.render((state, context, children) => <div data-testid="modal-layout-only">{children as any}</div>);

      modalRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="modal-child">Child Inside Modal</div>
        </RouteViewer>
      );

      await act(async () => {
        await new Promise((r) => queueMicrotask(r));
      });

      const Stack = stacks.get(modalRoute as never)!;
      const { container } = render(<Stack />);
      expect(screen.getByTestId('modal-layout-only')).toBeDefined();
    });

    it('renders a modal with Index only (no Layout) in the stack', async () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-index-only');
      modal(modalRoute);
      // No layout renderer, but add an index route
      const indexRoute = modalRoute.route('/');
      indexRoute.render(() => <div data-testid="modal-index-alone">Index Alone</div>);

      modalRoute.active = true;
      indexRoute.active = true;
      const stacks = createStacks();

      render(<RouteViewer route={modalRoute as never} stacks={stacks} />);

      await act(async () => {
        await new Promise((r) => queueMicrotask(r));
      });

      const Stack = stacks.get(modalRoute as never)!;
      const { container } = render(<Stack />);
      expect(screen.getByTestId('modal-index-alone')).toBeDefined();
    });

    it('renders children passthrough in the stack when inactive', async () => {
      const router = createRouter();
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
        await new Promise((r) => queueMicrotask(r));
      });

      const Stack = stacks.get(modalRoute as never)!;
      const { container } = render(<Stack />);
      // When inactive, the stack's render block returns children (passthrough)
      expect(screen.getByTestId('inactive-child')).toBeDefined();
    });

    it('renders children in the stack when active but has no Layout or Index', async () => {
      const router = createRouter();
      const modalRoute = router.route('/modal-empty');
      modal(modalRoute);
      // No layout renderer, no index route
      modalRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteViewer route={modalRoute as never} stacks={stacks}>
          <div data-testid="empty-modal-child">Empty Modal</div>
        </RouteViewer>
      );

      await act(async () => {
        await new Promise((r) => queueMicrotask(r));
      });

      const Stack = stacks.get(modalRoute as never)!;
      expect(Stack).toBeDefined();
      const { container } = render(<Stack />);
      expect(screen.getByTestId('empty-modal-child')).toBeDefined();
    });
  });

  describe('RouteRenderer', () => {
    const createStacks = () => mutable<Map<UnknownRoute, FC>>(new Map());

    it('recursively renders children mapping through the RouteRegistry and mutates displayNames', () => {
      const router = createRouter();
      const rootRoute = router.route('/root');

      rootRoute.render((state, context, children) => <div data-testid="layout">{children as any}</div>);
      rootRoute.route('/').render(() => <div>Index</div>);

      // Dynamic child inside registry
      const childRoute = rootRoute.route('/child-1');
      childRoute.render(() => <div data-testid="child-1">Child 1 Component</div>);

      rootRoute.active = true;
      childRoute.active = true;
      const stacks = createStacks();

      render(
        <RouteRenderer
          route={rootRoute as never}
          registry={rootRoute.router.rootRegistry.get('root') as object as any}
          stacks={stacks}
        />
      );

      // Assure children map recursively mounted
      expect(screen.getByTestId('child-1')).toBeDefined();
    });

    it('assigns generic fallback / displayNames to empty root layout blocks automatically', () => {
      const router = createRouter();
      const emptyRoot = router.rootRoute;

      // When route.path parses generically to '', test the || '/' internal fallback mechanism.
      emptyRoot.render(() => <div>Root</div>);

      const stacks = createStacks();
      render(<RouteRenderer route={emptyRoot} registry={router.rootRegistry} stacks={stacks} />);

      // Since emptyRoot lacks an index renderer, it drops into the explicit Index() fallback naming branch
      expect((emptyRoot.renderer as any).displayName).toBe('Index(/)');
    });

    it('assigns both Layout and Index displayNames with generic fallback paths when both exist on the absolute root', () => {
      const router = createRouter();
      const root = router.rootRoute;
      const rootIndex = root.route('/');

      root.render((state, context, children) => <div>{children as any}</div>);
      rootIndex.render(() => <div>Root Index</div>);

      const stacks = createStacks();
      render(<RouteRenderer route={root} registry={router.rootRegistry} stacks={stacks} />);

      expect((root.renderer as any).displayName).toBe('Layout(/)');
      expect((rootIndex.renderer as any).displayName).toBe('Index(/)');
    });
  });

  describe('UIRouter', () => {
    it('binds memory listeners upon mounting and destroys upon unmounting', () => {
      const router = createRouter();
      const RootUi = page(router.rootRoute);

      vi.spyOn(router, 'activate').mockImplementation(async () => {});

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
      const router = createRouter();
      const rootUi = page(router.rootRoute);

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation(async () => {});

      render(<UIRouter router={router} root={rootUi} resetScroll={true} />);

      // Because activation fires twice initially via direct invoke and effects loop, verify scrollTo also fires properly
      // Awaiting UI router cycle natively:
      await act(async () => {
        await activateSpy.mock.results[0]?.value;
      });

      expect(activateSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('skips scrolling to top if a modal stack is active', async () => {
      const router = createRouter();
      const rootUi = page(router.rootRoute);
      const modalRoute = router.route('/modal');
      modal(modalRoute);

      // Make the modal active so it gets registered in stacks during render
      modalRoute.active = true;

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation(async () => {});
      scrollToSpy.mockClear();

      render(<UIRouter router={router} root={rootUi} url={'https://localhost/modal'} resetScroll={true} />);

      await act(async () => {
        await activateSpy.mock.results[0]?.value;
        // Wait another microtask for RouteViewer's queueMicrotask to set the stack
        await new Promise((r) => queueMicrotask(r));
      });

      expect(scrollToSpy).not.toHaveBeenCalled();
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
      const router = createRouter();
      const rawRoute = router.route('/redirect-target');

      // Creating a redirect invokes the handler registered natively by router.tsx
      redirect(rawRoute, { id: '1' } as any, { foo: 'bar' } as any);

      expect(pushSpy).toHaveBeenCalledWith(
        { href: '/redirect-target?foo=bar', query: { foo: 'bar' }, params: { id: '1' }, redirect: location.href },
        '',
        '/redirect-target?foo=bar'
      );
    });
  });
});
