import '../../src/client/index.js';
import { createRouter } from '@airlib/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate, page, redirect } from '../../src/index.js';

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
    navigate('/login' as never, { replace: true } as never);

    expect(replaceSpy).toHaveBeenCalledWith({ href: '/login', query: undefined, params: undefined }, '', '/login');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should use default options when options parameter is omitted', () => {
    navigate('/home' as never);

    expect(pushSpy).toHaveBeenCalledWith({ href: '/home', query: undefined, params: undefined, redirect: undefined }, '', '/home');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should navigate to a RouteComponent correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');
    const UiRoute = page(coreRoute);

    navigate(UiRoute as never, { params: { id: '456' } } as never);

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/456', query: undefined, params: { id: '456' } },
      '',
      '/users/456'
    );
  });

  it('should navigate to a plain AnyRoute correctly', () => {
    const router = createRouter();
    const coreRoute = router.route('/users').route('/:id');

    navigate(coreRoute as never, { params: { id: '789' } } as never);

    expect(pushSpy).toHaveBeenCalledWith(
      { href: '/users/789', query: undefined, params: { id: '789' } },
      '',
      '/users/789'
    );
  });

  describe('redirect utility', () => {
    it('should return a Redirect instance when called with a RouteComponent', () => {
      const router = createRouter();
      const coreRoute = router.route('/redirect-test');
      const UiRoute = page(coreRoute);

      const result = redirect(UiRoute as never, { params: { id: '1' }, query: { foo: 'bar' } } as never) as any;

      expect(result.route).toBe(coreRoute);
      expect(result.params).toEqual({ id: '1' });
    });
  });
});
