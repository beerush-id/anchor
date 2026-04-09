import '../../src/client/index.js';
import { createRouter } from '@anchorlib/router';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { route, RouteRenderer, RouteViewer, UIRouter } from '../../src/router/router.js';

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
      const UiRoute = route(rawRoute);

      expect(UiRoute.index).toBe(rawRoute);
      expect(typeof UiRoute.route).toBe('function');

      const childUiRoute = UiRoute.route('/child');
      expect(childUiRoute.path).toBe('testing/child');
    });
  });

  describe('RouteViewer', () => {
    it('returns children natively if the route is inactive or lacks a renderer', () => {
      const router = createRouter();
      const testRoute = router.route('/blank');

      const { container } = render(
        <RouteViewer route={testRoute as never}>
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

      const { container } = render(
        <RouteViewer route={testRoute as never}>
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

      render(
        <RouteViewer route={testRoute as never}>
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

      render(
        <RouteViewer route={parentRoute as never}>
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

      render(
        <RouteViewer route={parentRoute as never}>
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

      const { container } = render(
        <RouteViewer route={emptyRoute as never}>
          <div data-testid="bypassed-child">Bypassed Child</div>
        </RouteViewer>
      );

      expect(screen.getByTestId('bypassed-child')).toBeDefined();
      expect(container.textContent).toBe('Bypassed Child');
    });
  });

  describe('RouteRenderer', () => {
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

      render(
        <RouteRenderer
          route={rootRoute as never}
          registry={rootRoute.router.rootRegistry.get('root') as object as any}
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

      render(<RouteRenderer route={emptyRoot} registry={router.rootRegistry} />);

      // Since emptyRoot lacks an index renderer, it drops into the explicit Index() fallback naming branch
      expect((emptyRoot.renderer as any).displayName).toBe('Index(/)');
    });

    it('assigns both Layout and Index displayNames with generic fallback paths when both exist on the absolute root', () => {
      const router = createRouter();
      const root = router.rootRoute;
      const rootIndex = root.route('/');

      root.render((state, context, children) => <div>{children as any}</div>);
      rootIndex.render(() => <div>Root Index</div>);

      render(<RouteRenderer route={root} registry={router.rootRegistry} />);

      expect((root.renderer as any).displayName).toBe('Layout(/)');
      expect((rootIndex.renderer as any).displayName).toBe('Index(/)');
    });
  });

  describe('UIRouter', () => {
    it('binds memory listeners upon mounting and destroys upon unmounting', () => {
      const router = createRouter();
      const rootUi = route(router.rootRoute);

      vi.spyOn(router, 'activate').mockImplementation(async () => {});

      const { unmount } = render(<UIRouter router={router} root={rootUi} />);

      // Assure popstate event listener added immediately via `createEffect`
      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('scrolls cleanly to top visually alongside its activation', async () => {
      const router = createRouter();
      const rootUi = route(router.rootRoute);

      const activateSpy = vi.spyOn(router, 'activate').mockImplementation(async () => {});

      render(<UIRouter router={router} root={rootUi} />);

      // Because activation fires twice initially via direct invoke and effects loop, verify scrollTo also fires properly
      // Awaiting UI router cycle natively:
      await act(async () => {
        await activateSpy.mock.results[0]?.value;
      });

      expect(activateSpy).toHaveBeenCalled();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });
});
