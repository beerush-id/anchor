import '../../src/client/index.js';
import { createRouter } from '@anchorlib/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate } from '../../src/router/navigate.js';
import { route } from '../../src/router/router.js';

describe('Anchor React - Navigate Utility', () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let replaceSpy: ReturnType<typeof vi.spyOn>;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushSpy = vi.spyOn(history, 'pushState').mockImplementation(() => {});
    replaceSpy = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true) as any;
  });

  afterEach(() => {
    pushSpy.mockRestore();
    replaceSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it('should navigate to a string path using pushState by default', () => {
    navigate('/dashboard', { params: { id: '123' }, query: { tab: 'settings' } });

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/dashboard?tab=settings', query: { tab: 'settings' }, params: { id: '123' } },
      '',
      '/dashboard?tab=settings'
    );
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();

    const eventArg = dispatchSpy.mock.calls[0][0] as PopStateEvent;
    expect(eventArg.type).toBe('popstate');
    expect(eventArg.state).toEqual({
      href: '/dashboard?tab=settings',
      query: { tab: 'settings' },
      params: { id: '123' },
    });
  });

  it('should use replaceState when options.replace is true', () => {
    navigate('/login', { replace: true });

    expect(replaceSpy).toHaveBeenCalledWith({ href: '/login', query: undefined, params: undefined }, '', '/login');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should navigate to a RouteComponent correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');
    const UiRoute = route(coreRoute);

    navigate(UiRoute, { params: { id: '456' } });

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/456', query: undefined, params: { id: '456' } },
      '',
      '/users/456'
    );
  });

  it('should navigate to a plain AnyRoute correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');

    navigate(coreRoute, { params: { id: '789' } });

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/789', query: undefined, params: { id: '789' } },
      '',
      '/users/789'
    );
  });
});
