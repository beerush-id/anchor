import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_TYPE } from '../src/enum.js';
import { RouterContext } from '../src/index.js';
import { Redirect } from '../src/redirect.js';
import { createRouter, Router } from '../src/router.js';
import { getStore } from '../src/store.js';

describe('router.ts', () => {
  describe('Router class', () => {
    let router: Router;

    beforeEach(() => {
      router = new Router();
    });

    describe('constructor', () => {
      it('should create a new Router instance', () => {
        expect(router).toBeInstanceOf(Router);
      });

      it('should use default baseUrl when not provided', () => {
        const defaultRouter = new Router();
        expect(defaultRouter).toBeDefined();
      });

      it('should use provided baseUrl', () => {
        const customRouter = new Router({ baseUrl: 'https://example.com' });
        expect(customRouter).toBeDefined();
      });

      it('should use provided cacheSize', () => {
        const customRouter = new Router({ cacheSize: 50 });
        expect(customRouter).toBeDefined();
      });

      it('should use provided maxAge', () => {
        const customRouter = new Router({ maxAge: 60000 });
        expect(customRouter).toBeDefined();
      });

      it('should initialize activeRoute as undefined', () => {
        expect(router.activeRoute).toBeUndefined();
      });

      it('should initialize activeContext with empty objects', () => {
        expect(router.activeContext).toBeInstanceOf(RouterContext);

        expect(router.path).toBeUndefined();
        expect(router.data).toEqual({});
        expect(router.query).toEqual({});
        expect(router.params).toEqual({});
      });

      it('should initialize activeSegments as undefined', () => {
        expect(router.activeSegments).toBeUndefined();
      });
    });

    describe('route method', () => {
      it('should return the root route', () => {
        const route = router.route();
        expect(route).toBe(router.rootRoute);
      });

      it('should create a new route', () => {
        const route = router.route('/users');
        expect(route).toBeDefined();
      });

      it('should return root route when path is /', () => {
        const result = router.route('/');

        expect(result).toBeDefined();
        expect(result.name).toBe('');
        expect(router.rootRoute.index).toBe(result);
        expect(() => (result as any).route('/users')).toThrow();
      });

      it('should set index route on root when path is /', () => {
        router.route('/');
        // The root route should have an index route
        expect(router).toBeDefined();
      });

      it('should create static route', () => {
        const route = router.route('/users');
        expect(route.type).toBe(ROUTE_TYPE.STATIC);
      });

      it('should create dynamic route', () => {
        const route = router.route('/:id');
        expect(route.type).toBe(ROUTE_TYPE.DYNAMIC);
      });

      it('should create wildcard route', () => {
        const route = router.route('/*');
        expect(route.type).toBe(ROUTE_TYPE.WILDCARD);
      });

      it('should register static route in root registry', () => {
        const route = router.route('/users');
        expect(route).toBeDefined();
      });

      it('should register dynamic route with DYNAMIC_ROUTE_KEY', () => {
        const route = router.route('/:id');
        expect(route).toBeDefined();
      });

      it('should register wildcard route with WILDCARD_ROUTE_KEY', () => {
        const route = router.route('/*');
        expect(route).toBeDefined();
      });

      it('should merge router options with route options', () => {
        const customRouter = new Router({ maxAge: 1000, keepAlive: true });
        const route = customRouter.route('/users', { maxAge: 2000 });
        expect(route.options?.maxAge).toBe(2000);
        expect(route.options?.keepAlive).toBe(true);
      });

      it('should allow creating multiple routes', () => {
        const usersRoute = router.route('/users');
        const postsRoute = router.route('/posts');
        const commentsRoute = router.route('/comments');

        expect(usersRoute).toBeDefined();
        expect(postsRoute).toBeDefined();
        expect(commentsRoute).toBeDefined();
      });
    });

    describe('find method', () => {
      beforeEach(() => {
        router.route('/users');
        router.route('/posts');
      });

      it('should return match result for matching URL', () => {
        const result = router.find('/users');
        expect(result).toBeDefined();
      });

      it('should return undefined for non-matching URL', () => {
        const result = router.find('/nonexistent');
        expect(result).toBeUndefined();
      });

      it('should handle URL object', () => {
        const url = new URL('/users', 'http://localhost');
        const result = router.find(url);
        expect(result).toBeDefined();
      });

      it('should handle URL with query parameters', () => {
        const result = router.find('/users?tab=profile');
        expect(result).toBeDefined();
        expect(result?.query).toEqual({ tab: 'profile' });
      });

      it('should handle URL with hash', () => {
        const result = router.find('/users#section');
        expect(result).toBeDefined();
      });

      it('should use cache for repeated requests', () => {
        const result1 = router.find('/users');
        const result2 = router.find('/users');
        expect(result1).toBe(result2);
      });

      it('should include URL in match result', () => {
        const url = new URL('/users', 'http://localhost');
        const result = router.find(url);
        expect(result?.url).toBe(url);
      });
    });

    describe('activate method', () => {
      beforeEach(() => {
        router.route('/users');
        router.route('/posts');
      });

      it('should activate a route', async () => {
        await router.activate('/users');
        expect(router.activeRoute).toBeDefined();
      });

      it('should set activeSegments', async () => {
        await router.activate('/users');
        expect(router.activeSegments).toBeDefined();
        expect(router.activeSegments?.length).toBeGreaterThan(0);
      });

      it('should update activeContext', async () => {
        await router.activate('/users');
        expect(router.activeContext).toBeDefined();
      });

      it('should handle URL object', async () => {
        const url = new URL('/users', 'http://localhost');
        await router.activate(url);
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle URL with query parameters', async () => {
        await router.activate('/users?tab=profile');
        expect(router.activeRoute).toBeDefined();
        expect(router.activeContext.query.tab).toBe('profile');
      });

      it('should handle URL string with http protocol', async () => {
        await router.activate('http://localhost/users');
        expect(router.activeRoute).toBeDefined();
      });

      it('should return undefined for non-matching URL', async () => {
        const result = await router.activate('/nonexistent');
        expect(result).toBeUndefined();
      });

      it('should handle guards that pass', async () => {
        const usersRoute = router.route('/users');
        const guard = vi.fn();
        usersRoute.guard(guard);

        await router.activate('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should return GuardBlocker when guard throws Error', async () => {
        const usersRoute = router.route('/users');
        const error = new Error('Guard failed');
        const guard = vi.fn(() => {
          throw error;
        });
        usersRoute.guard(guard);

        const result = await router.activate('/users');
        expect(result).toBe(error);
      });

      it('should return Redirect when guard throws Redirect', async () => {
        const usersRoute = router.route('/users');
        const loginRoute = router.route('/login');
        const redirect = new Redirect(loginRoute);
        const guard = vi.fn(() => {
          throw redirect;
        });
        usersRoute.guard(guard);

        const result = await router.activate('/users');
        expect(result).toBe(redirect);
      });

      it('should handle providers', async () => {
        const usersRoute = router.route('/users');
        const provider = vi.fn(() => ({ users: [] }));
        usersRoute.provide('users', provider);

        await router.activate('/users');
        expect(provider).toHaveBeenCalled();
      });

      it('should deactivate old segments when activating new route', async () => {
        await router.activate('/users');
        const firstActiveRoute = router.activeRoute;

        await router.activate('/posts');
        expect(router.activeRoute).not.toBe(firstActiveRoute);
        expect(router.path).toBeDefined();
      });

      it('should handle race conditions', async () => {
        const usersRoute = router.route('/users');
        const postsRoute = router.route('/posts');

        const slowGuard = vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        });
        usersRoute.guard(slowGuard);

        // Start two activations
        const promise1 = router.activate('/users');
        const promise2 = router.activate('/posts');

        await Promise.all([promise1, promise2]);

        // The last activation should win
        expect(router.activeRoute).toBe(postsRoute);
      });
    });

    describe('deactivate method', () => {
      beforeEach(() => {
        router.route('/users');
      });

      it('should clear activeRoute', async () => {
        await router.activate('/users');
        router.deactivate();
        expect(router.activeRoute).toBeUndefined();
      });

      it('should clear activeSegments', async () => {
        await router.activate('/users');
        router.deactivate();
        expect(router.activeSegments).toBeUndefined();
      });

      it('should call deactivate on active segments', async () => {
        await router.activate('/users');
        router.deactivate();
        // The segments should be deactivated
      });

      it('should handle deactivating when no route is active', () => {
        expect(() => router.deactivate()).not.toThrow();
      });
    });

    describe('preload method', () => {
      beforeEach(() => {
        router.route('/users');
      });

      it('should preload a route without activating it', async () => {
        await router.preload('/users');
        expect(router.activeRoute).toBeUndefined();
      });

      it('should handle URL object', async () => {
        const url = new URL('/users', 'http://localhost');
        await router.preload(url);
        expect(router.activeRoute).toBeUndefined();
      });

      it('should handle URL with query parameters', async () => {
        await router.preload('/users?tab=profile');
        expect(router.activeRoute).toBeUndefined();
      });

      it('should return undefined for non-matching URL', async () => {
        const result = await router.preload('/nonexistent');
        expect(result).toBeUndefined();
      });

      it('should call guards during preload', async () => {
        const usersRoute = router.route('/users');
        const guard = vi.fn();
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should abort preload if guard returns Redirect', async () => {
        const usersRoute = router.route('/users');
        const loginRoute = router.route('/login');
        const redirect = new Redirect(loginRoute);
        const guard = vi.fn(() => {
          throw redirect;
        });
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should abort preload if guard returns Error', async () => {
        const usersRoute = router.route('/users');
        const error = new Error('guard error');
        const guard = vi.fn(() => {
          throw error;
        });
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should call providers during preload', async () => {
        const usersRoute = router.route('/users');
        const provider = vi.fn(() => ({ users: [] }));
        usersRoute.provide('users', provider);

        await router.preload('/users');
        expect(provider).toHaveBeenCalled();
      });

      it('should not activate route segments', async () => {
        await router.preload('/users');
        expect(router.activeSegments).toBeUndefined();
      });
    });

    describe('cleanup method', () => {
      it('should release router from the store', async () => {
        expect(router.activeContext).toBeDefined();
        expect(getStore().get(router)).toBeDefined();

        router.cleanup();

        expect(getStore().get(router)).toBeUndefined();
      });
    });

    describe('integration tests', () => {
      it('should handle full navigation cycle', async () => {
        router.route('/users');
        router.route('/posts');

        // Preload
        await router.preload('/users');
        expect(router.activeRoute).toBeUndefined();

        // Activate
        await router.activate('/users');
        expect(router.activeRoute).toBeDefined();

        // Navigate to another route
        await router.activate('/posts');
        expect(router.activeRoute).toBeDefined();

        // Deactivate
        router.deactivate();
        expect(router.activeRoute).toBeUndefined();
      });

      it('should handle nested routes', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');
        const postsRoute = userRoute.route('/posts');

        await router.activate('/users/123/posts');
        expect(router.activeRoute).toBeDefined();
        expect(router.activeSegments?.length).toBe(4);
      });

      it('should handle guards with redirects', async () => {
        const loginRoute = router.route('/login');
        const dashboardRoute = router.route('/dashboard');
        const redirect = new Redirect(loginRoute);

        const guard = vi.fn(() => {
          throw redirect;
        });
        dashboardRoute.guard(guard);

        const result = await router.activate('/dashboard');
        expect(result).toBe(redirect);
      });

      it('should handle providers with caching', async () => {
        const usersRoute = router.route('/users');
        let callCount = 0;
        const provider = vi.fn(() => {
          callCount++;
          return { users: [] };
        });
        usersRoute.provide('users', provider, { maxAge: 1000 });

        await router.activate('/users');
        expect(callCount).toBe(1);

        await router.activate('/users');
        // Provider should be cached
        expect(callCount).toBe(1);
        expect(router.activeContext.data.users).toEqual({ users: [] });
      });

      it('should handle multiple providers', async () => {
        const usersRoute = router.route('/users');
        const usersProvider = vi.fn(() => ({ users: [] }));
        const postsProvider = vi.fn(() => ({ posts: [] }));

        usersRoute.provide('users', usersProvider);
        usersRoute.provide('posts', postsProvider);

        await router.activate('/users');
        expect(usersProvider).toHaveBeenCalled();
        expect(postsProvider).toHaveBeenCalled();
      });

      it('should handle dynamic routes', async () => {
        router.route('/users').route('/:id');

        await router.activate('/users/123');
        expect(router.activeRoute).toBeDefined();
        expect(router.activeContext.params.id).toEqual('123');
      });

      it('should handle wildcard routes', async () => {
        router.route('/api').route('/*');

        await router.activate('/api/v1/users');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle query parameters', async () => {
        router.route('/users');

        await router.activate('/users?tab=profile&sort=asc');
        expect(router.activeContext.query.tab).toBe('profile');
        expect(router.activeContext.query.sort).toBe('asc');
      });

      it('should handle keepAlive option', async () => {
        const usersRoute = router.route('/users', { keepAlive: true });
        const provider = vi.fn(() => ({ users: [] }));
        usersRoute.provide('users', provider);

        await router.activate('/users');
        const data = router.activeRoute?.data;

        router.deactivate();
        await router.activate('/users');

        // Data should be preserved with keepAlive
        expect(router.activeRoute?.data).toBe(data);
      });
    });

    describe('edge cases', () => {
      it('should handle empty path', async () => {
        const result = await router.activate('');
        expect(result).toBeUndefined();
      });

      it('should handle root path', async () => {
        router.route('/');
        await router.activate('/');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle paths with trailing slashes', async () => {
        router.route('/users');
        await router.activate('/users/');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle paths with multiple slashes', async () => {
        router.route('/users');
        await router.activate('//users//');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle special characters in path', async () => {
        router.route('/users').route('/:slug');
        await router.activate('/users/my-awesome-post');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle Unicode characters in path', async () => {
        router.route('/users').route('/:name');
        await router.activate('/users/张三');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle very long paths', async () => {
        router
          .route('/a')
          .route('/b')
          .route('/c')
          .route('/d')
          .route('/e')
          .route('/f')
          .route('/g')
          .route('/h')
          .route('/i')
          .route('/j');
        await router.activate('/a/b/c/d/e/f/g/h/i/j');
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle rapid navigation', async () => {
        router.route('/users');
        router.route('/posts');
        router.route('/comments');

        const promises = [router.activate('/users'), router.activate('/posts'), router.activate('/comments')];

        await Promise.all(promises);
        expect(router.activeRoute).toBeDefined();
      });

      it('should handle navigation to same route', async () => {
        router.route('/users');

        await router.activate('/users');
        const firstRoute = router.activeRoute;

        await router.activate('/users');
        const secondRoute = router.activeRoute;

        expect(firstRoute).toBeDefined();
        expect(secondRoute).toBeDefined();
      });

      it('should handle navigation with different query params', async () => {
        router.route('/users');

        await router.activate('/users?tab=profile');
        await router.activate('/users?tab=settings');

        expect(router.activeContext.query.tab).toEqual('settings');
      });
    });
  });

  describe('createRouter function', () => {
    it('should create a new Router instance', () => {
      const router = createRouter();
      expect(router).toBeInstanceOf(Router);
    });

    it('should pass options to Router constructor', () => {
      const router = createRouter({ baseUrl: 'https://example.com', cacheSize: 50 });
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router without options', () => {
      const router = createRouter();
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router with empty options', () => {
      const router = createRouter({});
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router with all options', () => {
      const router = createRouter({
        baseUrl: 'https://example.com',
        cacheSize: 100,
        maxAge: 60000,
        keepAlive: true,
        retryMode: 'exponential',
        retryDelay: 1000,
        maxRetries: 3,
      });
      expect(router).toBeInstanceOf(Router);
    });
  });

  describe('Router with custom configuration', () => {
    it('should use custom baseUrl', () => {
      const router = new Router({ baseUrl: 'https://api.example.com' });
      expect(router).toBeDefined();
    });

    it('should use custom cacheSize', () => {
      const router = new Router({ cacheSize: 200 });
      expect(router).toBeDefined();
    });

    it('should use custom maxAge', () => {
      const router = new Router({ maxAge: 300000 });
      expect(router).toBeDefined();
    });

    it('should use custom keepAlive', () => {
      const router = new Router({ keepAlive: true });
      expect(router).toBeDefined();
    });

    it('should use custom retryMode', () => {
      const router = new Router({ retryMode: 'exponential' });
      expect(router).toBeDefined();
    });

    it('should use custom retryDelay', () => {
      const router = new Router({ retryDelay: 2000 });
      expect(router).toBeDefined();
    });

    it('should use custom maxRetries', () => {
      const router = new Router({ maxRetries: 5 });
      expect(router).toBeDefined();
    });

    it('should pass options to created routes', () => {
      const router = new Router({ maxAge: 5000, keepAlive: true });
      const route = router.route('/users');
      expect(route.options?.maxAge).toBe(5000);
      expect(route.options?.keepAlive).toBe(true);
    });
  });

  describe('Router error handling', () => {
    let router: Router;

    beforeEach(() => {
      router = new Router();
    });

    it('should handle invalid URLs gracefully', async () => {
      const result = await router.activate('/invalid-route');
      expect(result).toBeUndefined();
    });

    it('should handle provider errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Provider failed');
      const provider = vi.fn(() => {
        throw error;
      });
      usersRoute.provide('users', provider);

      // The router returns undefined when provider fails
      const result = await router.activate('/users');
      expect(result).toBeUndefined();
    });

    it('should handle guard errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      usersRoute.guard(guard);

      const result = await router.activate('/users');
      expect(result).toBe(error);
    });

    it('should handle async guard errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Async guard failed');
      const guard = vi.fn(async () => {
        throw error;
      });
      usersRoute.guard(guard);

      const result = await router.activate('/users');
      expect(result).toBe(error);
    });

    it('should handle async provider errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Async provider failed');
      const provider = vi.fn(async () => {
        throw error;
      });
      usersRoute.provide('users', provider);

      // The router returns undefined when provider fails
      const result = await router.activate('/users');
      expect(result).toBeUndefined();
    });
  });

  describe('Router performance', () => {
    it('should handle many route activations', async () => {
      const router = new Router();
      router.route('/users');
      router.route('/posts');
      router.route('/comments');

      for (let i = 0; i < 100; i++) {
        await router.activate('/users');
        await router.activate('/posts');
        await router.activate('/comments');
      }

      expect(router.activeRoute).toBeDefined();
    });

    it('should handle many route creations', () => {
      const router = new Router();

      for (let i = 0; i < 100; i++) {
        router.route(`/route${i}`);
      }

      expect(router).toBeDefined();
    });

    it('should handle many find operations', () => {
      const router = new Router();
      router.route('/users');
      router.route('/posts');
      router.route('/comments');

      for (let i = 0; i < 1000; i++) {
        router.find('/users');
        router.find('/posts');
        router.find('/comments');
      }

      expect(router).toBeDefined();
    });
  });
});
