import { createRouter } from '@anchorlib/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate, redirect } from '../../src/router/navigate.js';
import { page } from '../../src/router/router.js';

describe('Anchor Solid - Navigate Utility', () => {
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
    navigate('/dashboard' as never, { params: { id: '123' }, query: { tab: 'settings' } } as never);

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
    const UiRoute = page(coreRoute);

    navigate(UiRoute, { params: { id: '456' }, query: { foo: 'bar' } } as never);

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/456?foo=bar', query: { foo: 'bar' }, params: { id: '456' } },
      '',
      '/users/456?foo=bar'
    );
  });

  it('should navigate to a plain AnyRoute correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');

    navigate(coreRoute, { params: { id: '789' } } as never);

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/789', query: undefined, params: { id: '789' } },
      '',
      '/users/789'
    );
  });

  it('should redirect to a RouteComponent without options correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');
    const UiRoute = page(coreRoute);

    redirect(UiRoute);
  });

  it('should redirect to a RouteComponent without correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');
    const UiRoute = page(coreRoute);

    redirect(UiRoute, { params: { id: '456' }, query: { foo: 'bar' } } as never);
  });
});
