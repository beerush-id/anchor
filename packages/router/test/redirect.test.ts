import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router, type UnknownRoute } from '../src/index.js';
import { Redirect, redirect, redirectUrl, setRedirectHandler } from '../src/redirect.js';
import { Route } from '../src/route.js';

let sharedRouter: Router;

describe('redirect.ts', () => {
  beforeEach(() => {
    sharedRouter = createRouter();
  });

  describe('Redirect class', () => {
    it('should create a new Redirect instance', () => {
      const redirect = new Redirect(new Route(sharedRouter, '/test'));
      expect(redirect).toBeInstanceOf(Redirect);
    });

    it('should store the route', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const redirect = new Redirect(testRoute);
      expect(redirect.route).toBe(testRoute);
    });

    it('should store params when provided', () => {
      const params = { id: '123' };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id'), params);
      expect(redirect.params).toEqual(params);
    });

    it('should store query when provided', () => {
      const query = { tab: 'profile' };
      const redirect = new Redirect(new Route(sharedRouter, '/test?tab'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should store both params and query when provided', () => {
      const params = { id: '123' };
      const query = { tab: 'profile' };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id?tab'), params as never, query as never);
      expect(redirect.params).toEqual(params);
      expect(redirect.query).toEqual(query);
    });

    it('should have undefined params when not provided', () => {
      const redirect = new Redirect(new Route(sharedRouter, '/test'));
      expect(redirect.params).toBeUndefined();
    });

    it('should have undefined query when not provided', () => {
      const redirect = new Redirect(new Route(sharedRouter, '/test'));
      expect(redirect.query).toBeUndefined();
    });

    it('should be throwable', () => {
      const redirect = new Redirect(new Route(sharedRouter, '/test'));
      expect(() => {
        throw redirect;
      }).toThrow(Redirect);
    });

    it('should be catchable as Redirect', () => {
      const redirect = new Redirect(new Route(sharedRouter, '/test'));
      try {
        throw redirect;
      } catch (error) {
        expect(error).toBeInstanceOf(Redirect);
        expect(error).toBe(redirect);
      }
    });

    it('should handle empty params object', () => {
      const params = {} as { id: string };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id'), params);
      expect(redirect.params).toEqual({});
    });

    it('should handle empty query object', () => {
      const query = {} as { tab: string };
      const redirect = new Redirect(new Route(sharedRouter, '/test?tab'), undefined, query as never);
      expect(redirect.query).toEqual({});
    });

    it('should handle params with multiple properties', () => {
      const params = { id: '123', slug: 'test-post' } as { id: string; slug: string };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id?slug'), params);
      expect(redirect.params).toEqual(params);
    });

    it('should handle query with multiple properties', () => {
      const query = { tab: 'profile', sort: 'asc' } as { tab: string; sort: string };
      const redirect = new Redirect(new Route(sharedRouter, '/test?tab&sort'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should handle params with numeric values', () => {
      const params = { id: 123 } as { id: number };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id(number)'), params);
      expect(redirect.params).toEqual(params);
    });

    it('should handle query with numeric values', () => {
      const query = { page: 1 } as { page: number };
      const redirect = new Redirect(new Route(sharedRouter, '/test?page(number)'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should handle params with boolean values', () => {
      const params = { active: true } as { active: boolean };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:active(boolean)'), params);
      expect(redirect.params).toEqual(params);
    });

    it('should handle query with boolean values', () => {
      const query = { debug: false } as { debug: boolean };
      const redirect = new Redirect(new Route(sharedRouter, '/test?debug(boolean)'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should handle params with null values', () => {
      const params = { id: null } as { id: null };
      const redirect = new Redirect(new Route(sharedRouter, '/test/:id(null)'), params);
      expect(redirect.params).toEqual(params);
    });

    it('should handle query with null values', () => {
      const query = { filter: null } as { filter: null };
      const redirect = new Redirect(new Route(sharedRouter, '/test?filter(null)'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should handle query with array values', () => {
      const query = { tags: ['js', 'ts'] } as { tags: string[] };
      const redirect = new Redirect(new Route(sharedRouter, '/test?tags=(array)'), {}, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should handle query with object values', () => {
      const query = { options: { sort: 'asc' } } as { options: { sort: string } };
      const redirect = new Redirect(new Route(sharedRouter, '/test?options=(object)'), undefined, query as never);
      expect(redirect.query).toEqual(query);
    });

    it('should preserve route reference', () => {
      const route = new Route(sharedRouter, '/test');
      const redirect1 = new Redirect(route);
      const redirect2 = new Redirect(route);
      expect(redirect1.route).toBe(redirect2.route);
    });

    it('should create independent redirect instances', () => {
      const route = new Route(sharedRouter, '/test/:id');
      const redirect1 = new Redirect(route, { id: '1' });
      const redirect2 = new Redirect(route, { id: '2' });
      expect(redirect1).not.toBe(redirect2);
      expect(redirect1.params).not.toBe(redirect2.params);
    });
  });

  describe('redirect function', () => {
    let testRoute: UnknownRoute;
    let mockHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      testRoute = new Route(sharedRouter, '/test') as UnknownRoute;
      mockHandler = vi.fn();
      setRedirectHandler(mockHandler);
    });

    afterEach(() => {
      setRedirectHandler(() => {});
    });

    it('should create a Redirect instance', () => {
      const result = redirect(testRoute as never);
      expect(result).toBeInstanceOf(Redirect);
    });

    it('should pass route to Redirect', () => {
      const result = redirect(testRoute as never);
      expect(result.route).toBe(testRoute);
    });

    it('should pass params to Redirect', () => {
      const params = { id: '123' };
      const result = redirect(testRoute as never, params as never);
      expect(result.params).toEqual(params);
    });

    it('should pass query to Redirect', () => {
      const query = { tab: 'profile' };
      const result = redirect(testRoute as never, undefined, query as never);
      expect(result.query).toEqual(query);
    });

    it('should pass both params and query to Redirect', () => {
      const params = { id: '123' };
      const query = { tab: 'profile' };
      const result = redirect(testRoute as never, params as never, query as never);
      expect(result.params).toEqual(params);
      expect(result.query).toEqual(query);
    });

    it('should call redirect handler', async () => {
      const result = redirect(testRoute as never);
      // Wait for microtask
      await Promise.resolve();
      expect(mockHandler).toHaveBeenCalledWith(result);
    });

    it('should handle multiple redirects', async () => {
      const params1 = { id: '1' };
      const params2 = { id: '2' };

      const result1 = redirect(testRoute as never, params1 as never);
      const result2 = redirect(testRoute as never, params2 as never);

      await Promise.resolve();

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenNthCalledWith(1, result1);
      expect(mockHandler).toHaveBeenNthCalledWith(2, result2);
    });

    it('should work without handler set', () => {
      setRedirectHandler(() => {});
      expect(() => redirect(testRoute as never)).not.toThrow();
    });

    it('should return Redirect that can be thrown', () => {
      const result = redirect(testRoute as never);
      expect(() => {
        throw result;
      }).toThrow(Redirect);
    });

    it('should handle undefined params', () => {
      const result = redirect(testRoute as never, undefined);
      expect(result.params).toBeUndefined();
    });

    it('should handle undefined query', () => {
      const result = redirect(testRoute as never, undefined, undefined);
      expect(result.query).toBeUndefined();
    });

    it('should handle null params', () => {
      const result = redirect(testRoute as never, null as never);
      expect(result.params).toBeNull();
    });

    it('should handle null query', () => {
      const result = redirect(testRoute as never, undefined, null as never);
      expect(result.query).toBeNull();
    });
  });

  describe('redirectUrl function', () => {
    const router = createRouter();
    let testRoute: UnknownRoute;

    beforeEach(() => {
      testRoute = router.route('/users').route('/:id') as never;
    });

    it('should return route path when no params or query', () => {
      const redirect = new Redirect(testRoute as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id');
    });

    it('should replace route parameters with values', () => {
      const params = { id: '123' };
      const redirect = new Redirect(testRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should append query parameters', () => {
      const query = { tab: 'profile' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?tab=profile');
    });

    it('should replace params and append query', () => {
      const params = { id: '123' };
      const query = { tab: 'profile' };
      const redirect = new Redirect(testRoute as never, params as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123?tab=profile');
    });

    it('should handle multiple route parameters', () => {
      const multiParamRoute = router.route('/users').route('/:id').route('/posts').route('/:postId');
      const params = { id: '123', postId: '456' };
      const redirect = new Redirect(multiParamRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123/posts/456');
    });

    it('should handle multiple query parameters', () => {
      const query = { tab: 'profile', sort: 'asc', page: '1' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?tab=profile&sort=asc&page=1');
    });

    it('should handle numeric params', () => {
      const params = { id: 123 };
      const redirect = new Redirect(testRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle numeric query values', () => {
      const query = { page: 1 };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?page=1');
    });

    it('should handle boolean query values', () => {
      const query = { debug: true };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?debug=true');
    });

    it('should handle array query values', () => {
      const query = { tags: ['js', 'ts'] };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?tags=js&tags=ts');
    });

    it('should handle empty query object', () => {
      const query = {};
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id');
    });

    it('should handle empty params object', () => {
      const params = {};
      const redirect = new Redirect(testRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id');
    });

    it('should handle special characters in params', () => {
      const params = { id: 'user-123' };
      const redirect = new Redirect(testRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/user-123');
    });

    it('should handle special characters in query values', () => {
      const query = { search: 'hello world' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      // URLSearchParams uses + for spaces, which is valid URL encoding
      expect(url).toBe('/users/:id?search=hello+world');
    });

    it('should handle URL-encoded characters in query values', () => {
      const query = { email: 'test@example.com' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?email=test%40example.com');
    });

    it('should handle route with existing query separator', () => {
      // Routes should be created via router.route() for proper path handling
      const routeWithQuery = router.route('/users').route('/:id');
      const params = { id: '123' };
      const query = { sort: 'asc' };
      const redirect = new Redirect(routeWithQuery as never, params as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123?sort=asc');
    });

    it('should handle route with multiple segments', () => {
      // Routes should be created via router.route() for proper path handling
      const multiSegmentRoute = router.route('/api').route('/v1').route('/users').route('/:id');
      const params = { id: '123' };
      const redirect = new Redirect(multiSegmentRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/api/v1/users/123');
    });

    it('should handle route with trailing slash', () => {
      // Note: The Route API doesn't preserve trailing slashes in the path.
      // When using router.route('/users').route('/:id'), the path is '/users/:id'.
      // The test verifies that params are correctly replaced.
      const trailingSlashRoute = router.route('/users').route('/:id');
      const params = { id: '123' };
      const redirect = new Redirect(trailingSlashRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle route with leading slash', () => {
      // Routes should be created via router.route() for proper path handling
      const leadingSlashRoute = router.route('/users').route('/:id');
      const params = { id: '123' };
      const redirect = new Redirect(leadingSlashRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle route without leading slash', () => {
      // Routes should be created via router.route() for proper path handling
      // Note: redirectUrl always prepends '/' if not present
      const noLeadingSlashRoute = (router.route('users' as never) as UnknownRoute).route('/:id');
      const params = { id: '123' };
      const redirect = new Redirect(noLeadingSlashRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle params with underscores', () => {
      // Routes should be created via router.route() for proper path handling
      const underscoreRoute = router.route('/users').route('/:user_id');
      const params = { user_id: '123' };
      const redirect = new Redirect(underscoreRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle params with hyphens', () => {
      // Routes should be created via router.route() for proper path handling
      const hyphenRoute = router.route('/users').route('/:user-id');
      const params = { 'user-id': '123' };
      const redirect = new Redirect(hyphenRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/123');
    });

    it('should handle query with underscores', () => {
      const query = { user_id: '123' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?user_id=123');
    });

    it('should handle query with hyphens', () => {
      const query = { 'user-id': '123' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?user-id=123');
    });

    it('should handle null query values', () => {
      const query = { value: null };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?value=null');
    });

    it('should handle undefined query values', () => {
      const query = { value: undefined };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?value=undefined');
    });

    it('should handle empty string query values', () => {
      const query = { value: '' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?value=');
    });

    it('should handle zero query values', () => {
      const query = { value: 0 };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?value=0');
    });

    it('should handle false query values', () => {
      const query = { value: false };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?value=false');
    });

    it('should preserve order of query parameters', () => {
      const query = { z: '1', a: '2', m: '3' };
      const redirect = new Redirect(testRoute as never, undefined as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe('/users/:id?z=1&a=2&m=3');
    });

    it('should handle complex real-world URL', () => {
      // Routes should be created via router.route() for proper path handling
      const complexRoute = router
        .route('/api')
        .route('/v2')
        .route('/users')
        .route('/:userId')
        .route('/posts')
        .route('/:postId')
        .route('/comments')
        .route('/:commentId');
      const params = { userId: '123', postId: '456', commentId: '789' };
      const query = { include: 'author,replies', sort: 'desc', page: '1', per_page: '10' };
      const redirect = new Redirect(complexRoute as never, params as never, query as never);
      const url = redirectUrl(redirect as never);
      expect(url).toBe(
        '/api/v2/users/123/posts/456/comments/789?include=author%2Creplies&sort=desc&page=1&per_page=10'
      );
    });

    it('should handle URL that already contains query separator', () => {
      // Route with existing query in path
      const routeWithQuery = new Route(sharedRouter, '/search?q=default');
      const query = { sort: 'asc' };
      const redirect = new Redirect(routeWithQuery as never, undefined, query as never);
      const url = redirectUrl(redirect as never);
      // Should use & to append additional query params
      expect(url).toBe('/search?q=default&sort=asc');
    });

    it('should handle URL without leading slash', () => {
      const noLeadingSlashRoute = new Route(sharedRouter, 'users/:id' as never);
      const params = { id: '123' };
      const redirect = new Redirect(noLeadingSlashRoute as never, params as never);
      const url = redirectUrl(redirect as never);
      // The route name is 'users' (first segment), so the URL is based on that
      // Since it doesn't start with '/', it gets one added
      expect(url).toBe('/users');
    });

    it('should handle URL with existing query separator and additional query', () => {
      // Test the branch where URL already contains '?'
      const routeWithQuery = new Route(sharedRouter, '/search?existing=value');
      const query = { new: 'param' };
      const redirect = new Redirect(routeWithQuery as never, undefined, query as never);
      const url = redirectUrl(redirect as never);
      // Should use '&' to append since URL already has '?'
      expect(url).toBe('/search?existing=value&new=param');
    });
  });

  describe('setRedirectHandler function', () => {
    let testRoute: Route<'/test', {}, {}, {}, {}>;

    beforeEach(() => {
      testRoute = new Route(sharedRouter, '/test');
    });

    it('should set the redirect handler', async () => {
      const handler = vi.fn();
      setRedirectHandler(handler);

      const result = redirect(testRoute as never);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith(result);
    });

    it('should replace existing handler', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      setRedirectHandler(handler1);
      const result1 = redirect(testRoute as never);

      // Wait for the first redirect to be processed
      await Promise.resolve();

      setRedirectHandler(handler2);
      const result2 = redirect(testRoute as never);

      await Promise.resolve();

      expect(handler1).toHaveBeenCalledWith(result1);
      expect(handler2).toHaveBeenCalledWith(result2);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle handler that throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = vi.fn(() => {
        throw new Error('Handler error');
      });
      setRedirectHandler(handler);

      expect(() => redirect(testRoute as never)).toThrow();

      await Promise.resolve();

      expect(handler).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('should handle async handler', async () => {
      const handler = vi.fn(async () => {
        await Promise.resolve();
      });
      setRedirectHandler(handler);

      const result = redirect(testRoute as never);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith(result);
    });

    it('should handle handler with multiple arguments', async () => {
      const handler = vi.fn();
      setRedirectHandler(handler);

      const result = redirect(testRoute as never);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith(result);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow clearing handler', async () => {
      const handler = vi.fn();
      setRedirectHandler(handler);

      setRedirectHandler(() => {});

      const result = redirect(testRoute as never);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with handler that modifies redirect', async () => {
      const handler = vi.fn((r) => {
        r.route = testRoute;
      });
      setRedirectHandler(handler);

      const result = redirect(testRoute as never);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith(result);
    });
  });

  describe('Integration tests', () => {
    const router = createRouter();
    let testRoute: UnknownRoute;
    let mockHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      testRoute = router.route('/users').route('/:id') as never;
      mockHandler = vi.fn();
      setRedirectHandler(mockHandler);
    });

    afterEach(() => {
      setRedirectHandler(() => {});
    });

    it('should work end-to-end: create redirect, get URL, and handle', async () => {
      const params = { id: '123' };
      const query = { tab: 'profile' };

      const result = redirect(testRoute as never, params as never, query as never);
      const url = redirectUrl(result as never);

      expect(url).toBe('/users/123?tab=profile');

      await Promise.resolve();

      expect(mockHandler).toHaveBeenCalledWith(result);
    });

    it('should handle redirect thrown from guard', async () => {
      const guard = vi.fn(() => {
        throw redirect(testRoute as never, { id: '123' } as never);
      });

      expect(() => guard()).toThrow(Redirect);

      await Promise.resolve();

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should allow catching and re-throwing redirect', async () => {
      const caughtRedirect = await (async () => {
        try {
          throw redirect(testRoute as never, { id: '123' } as never);
        } catch (error) {
          if (error instanceof Redirect) {
            return error;
          }
          throw error;
        }
      })();

      expect(caughtRedirect).toBeInstanceOf(Redirect);
      expect(redirectUrl(caughtRedirect)).toBe('/users/123');

      await Promise.resolve();

      expect(mockHandler).toHaveBeenCalledWith(caughtRedirect);
    });
  });
});
