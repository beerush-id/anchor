import { createLifecycle, setReactive } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RENDER_MODE, ROUTE_TYPE } from '../src/enum.js';
import { RouteError } from '../src/error.js';
import { RouterContext, type RouterSnapshot } from '../src/index.js';
import { Redirect } from '../src/redirect.js';
import { createRouter, Router } from '../src/router.js';
import { getStore } from '../src/store.js';

describe('router.ts', () => {
  beforeEach(() => {
    setReactive(true);
  });
  afterEach(() => {
    setReactive(false);
  });

  describe('Router class', () => {
    let router: Router;

    beforeEach(() => {
      router = new Router();
    });

    describe('constructor', () => {
      it('should create a new Router instance', () => {
        expect(router).toBeInstanceOf(Router);
        expect(router.context.exception).toBeUndefined();
        expect(() => router.context.clear()).not.toThrow();
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

      it('should initialize context with empty objects', () => {
        expect(router.context).toBeInstanceOf(RouterContext);

        expect(router.path).toBeUndefined();
        expect(Object.keys(router.data)).toHaveLength(0);
        expect(Object.keys(router.query)).toHaveLength(0);
        expect(Object.keys(router.params)).toHaveLength(0);
      });

      it('should initialize activeSegments as undefined', () => {
        expect(router.activeSegments).toBeUndefined();
      });
    });

    describe('route method', () => {
      beforeEach(() => {
        router.clear();
      });

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

        expect(result.name).toBe('');
        expect(router.rootRoute.index).toBe(result);
        expect(() => (result as any).route('/users')).toThrow();
      });

      it('should set index route on root when path is /', () => {
        router.route('/');
        // The root route should have an index route
        expect(router.rootRoute.index).toBeDefined();
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
        expect(router.find('/users')?.route).toBe(route);
      });

      it('should register dynamic route with DYNAMIC_ROUTE_KEY', () => {
        const route = router.rootRoute.route('/:id');
        expect(router.find('/123')?.route).toBe(route);
        expect(router.find('/123', true)?.route).toBe(route);
      });

      it('should register wildcard route with WILDCARD_ROUTE_KEY', () => {
        const route = router.rootRoute.route('/*');
        expect(router.find('/anything')?.route).toBe(route);
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

        expect(usersRoute.path).toBe('/users');
        expect(postsRoute.path).toBe('/posts');
        expect(commentsRoute.path).toBe('/comments');
      });
    });

    describe('append method', () => {
      it('should create top-level route', () => {
        const auth = router.append('/auth');
        expect(auth.path).toBe('/auth');
        expect(router.find('/auth')?.route).toBe(auth);
      });

      it('should throw when appending invalid path', () => {
        expect(() => router.append('' as never)).toThrow();
        expect(() => router.append('/' as never)).toThrow();
        expect(() => router.append(undefined as never)).toThrow();
      });
    });

    describe('find method', () => {
      beforeEach(() => {
        router.route('/users');
        router.route('/posts');
      });

      it('should return match result for matching URL', () => {
        const result = router.find('/users');
        expect(result?.route.path).toBe('/users');
      });

      it('should return undefined for non-matching URL', () => {
        const result = router.find('/nonexistent');

        expect(result).toBeDefined();
        expect(result!.exception).toBeInstanceOf(Error);
      });

      it('should handle URL object', () => {
        const url = new URL('/users', 'http://localhost');
        const result = router.find(url);
        expect(result?.route.path).toBe('/users');
      });

      it('should handle URL with query parameters', () => {
        const result = router.find('/users?tab=profile');
        expect(result?.route.path).toBe('/users');
        expect(result?.query).toEqual({ tab: 'profile' });
      });

      it('should handle URL with hash', () => {
        const result = router.find('/users#section');
        expect(result?.route.path).toBe('/users');
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
        router.clear();
      });

      it('should activate a route', async () => {
        router.options.renderMode = RENDER_MODE.IMMEDIATE;
        router.route('/users');
        router.route('/projects');

        await router.activate('/users');
        expect(router.activeRoute?.path).toBe('/users');

        await router.activate('/projects');
        expect(router.activeRoute?.path).toBe('/projects');

        router.options.renderMode = RENDER_MODE.DEFERRED;
      });

      it('should set activeSegments', async () => {
        router.route('/users');
        await router.activate('/users');
        expect(router.activeSegments?.length).toBe(2);
      });

      it('should fully update context on navigation', async () => {
        const usersRoute = router.route('/users').route('/:id?tab');
        const postsRoute = router.route('/posts?sort').route('/:postId');

        usersRoute.provide(
          'user',
          vi.fn(() => ({ name: 'John' }))
        );
        postsRoute.provide(
          'post',
          vi.fn(() => ({ title: 'Hello' }))
        );

        // State 1: Activate /users/123
        await router.activate('/users/123?tab=profile');
        expect(router.context.url).toBeDefined();
        expect(router.context.params.id).toBe('123');
        expect(router.context.query.tab).toBe('profile');
        expect(router.context.data.user).toEqual({ name: 'John' });

        // Assert absence of posts data
        expect(router.context.params.postId).toBeUndefined();
        expect(router.context.data.post).toBeUndefined();

        // State 2: Activate /posts/456
        const runner = createLifecycle();
        await runner.runAsync(async () => {
          await router.activate('/posts/456?sort=desc');
        });

        // Verify context updated to new state
        expect(router.context.params.postId).toBe('456');
        expect(router.context.query.sort).toBe('desc');
        expect(router.context.data.post).toEqual({ title: 'Hello' });

        // Verify old state was cleared from context
        expect(router.context.params.id).toBeUndefined();
        expect(router.context.query.tab).toBeUndefined();
        expect(router.context.data.user).toBeUndefined();

        router.cleanup();
        runner.destroy();

        await Promise.resolve();
      });

      it('should handle URL object', async () => {
        const url = new URL('/users', 'http://localhost');
        router.route('/users');
        await router.activate(url);
        expect(router.activeRoute?.path).toBe('/users');
      });

      it('should handle URL with query parameters', async () => {
        router.route('/users?tab');
        await router.activate('/users?tab=profile');
        expect(router.activeRoute?.path).toBe('/users');
        expect(router.context.query.tab).toBe('profile');
      });

      it('should handle URL string with http protocol', async () => {
        router.route('/users');
        await router.activate('http://localhost/users');
        expect(router.activeRoute?.path).toBe('/users');
      });

      it('should return undefined for non-matching URL', async () => {
        const result = await router.activate('/nonexistent');
        expect(result).toEqual([]);
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
        await router.activate('/users');

        expect(router.context.exception).toBeInstanceOf(RouteError);
      });

      it('should return Redirect when guard throws Redirect', async () => {
        const usersRoute = router.route('/users');
        const loginRoute = router.route('/login');
        const redirect = new Redirect(loginRoute as any);
        const guard = vi.fn(() => {
          throw redirect;
        });
        usersRoute.guard(guard);

        await expect(async () => {
          await router.activate('/users');
        }).rejects.toThrow();
      });

      it('should handle providers', async () => {
        const usersRoute = router.route('/users');
        const provider = vi.fn(() => ({ users: [] }));
        usersRoute.provide('users', provider);

        await router.activate('/users');
        expect(provider).toHaveBeenCalled();
      });

      it('should deactivate old segments when activating new route', async () => {
        router.route('/users');
        await router.activate('/users');
        const firstActiveRoute = router.activeRoute;

        router.route('/posts');
        await router.activate('/posts');
        expect(router.activeRoute).not.toBe(firstActiveRoute);
        expect(router.path).toBe('/posts');
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

      it('should skip remaining guard authentication when controller is aborted (line 352)', async () => {
        const controller = new AbortController();

        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');

        const parentGuard = vi.fn(async () => {
          // Abort during the first segment's guard — next segment should be skipped.
          controller.abort();
        });
        const childGuard = vi.fn();

        usersRoute.guard(parentGuard);
        userRoute.guard(childGuard);

        const result = await router.activate('/users/123', false, controller);

        expect(parentGuard).toHaveBeenCalled();
        expect(childGuard).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should skip remaining segment activation when controller is aborted (line 388)', async () => {
        const controller = new AbortController();

        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');

        const parentProvider = vi.fn(async () => {
          // Abort during the first segment's provider — next segment should be skipped.
          controller.abort();
          return { users: [] };
        });
        const childProvider = vi.fn(async () => ({ user: {} }));

        usersRoute.provide('users', parentProvider);
        userRoute.provide('user', childProvider);

        const result = await router.activate('/users/123', false, controller);

        expect(parentProvider).toHaveBeenCalled();
        expect(childProvider).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should handle race conditions with real-world overlapping async timings', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');
        const projectsRoute = router.route('/projects');
        const projectRoute = projectsRoute.route('/:id');

        // Real-world scenario: different segments have different loading times
        const userGuard = vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });
        const userProvider = vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 20));
          return {};
        });

        const projectGuard = vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 5));
        });
        const projectProvider = vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 15));
          return {};
        });

        usersRoute.guard(userGuard);
        usersRoute.provide('data', userProvider);
        userRoute.guard(userGuard);
        userRoute.provide('data', userProvider);

        projectsRoute.guard(projectGuard);
        projectsRoute.provide('data', projectProvider);
        projectRoute.guard(projectGuard);
        projectRoute.provide('data', projectProvider);

        // We stagger the timings to hit all three asynchronous escape boundaries:
        // - p1 (users) is interrupted by p2 (projects) during p1's 20ms provider (covers line 351)
        // - p3 (users) is interrupted by p4 (users) during p3's 20ms provider. Because they share
        //   the parent '/users' prefix, p3 survives line 351, deletes the parent segment,
        //   and then fails exactly at line 341 when it moves to the nested segment.
        const promises = [
          router.activate('/users/1'), // starts 0ms, provider runs 10ms-30ms
          new Promise((r) => setTimeout(() => r(router.activate('/projects/1')), 20)), // interrupts p1 at 20ms
          new Promise((r) => setTimeout(() => r(router.activate('/users/2')), 50)), // starts 50ms, provider runs 60ms-80ms
          new Promise((r) => setTimeout(() => r(router.activate('/users/3')), 70)), // interrupts p3 at 70ms
        ];

        await Promise.all(promises);
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
        const usersRoute = router.rootRoute.route('/users');
        const guard = vi.fn();
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should abort preload if guard returns Redirect', async () => {
        const usersRoute = router.rootRoute.route('/users');
        const loginRoute = router.rootRoute.route('/login');
        const redirect = new Redirect(loginRoute as never);
        const guard = vi.fn(() => {
          throw redirect;
        });
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should abort preload if guard returns Error', async () => {
        const usersRoute = router.rootRoute.route('/users');
        const error = new Error('guard error');
        const guard = vi.fn(() => {
          throw error;
        });
        usersRoute.guard(guard);

        await router.preload('/users');
        expect(guard).toHaveBeenCalled();
      });

      it('should call providers during preload', async () => {
        const usersRoute = router.rootRoute.route('/users');
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
        expect(router.context).toBeDefined();
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
        expect(router.activeRoute).toBe(postsRoute);
        expect(router.activeSegments?.length).toBe(4);
      });

      it('should preserve parent state on nested route activation', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');

        const parentProvider = vi.fn(() => ({ parentData: 'parent' }));
        const childProvider = vi.fn(() => ({ childData: 'child' }));

        usersRoute.provide('parent', parentProvider);
        userRoute.provide('child', childProvider);

        await router.activate('/users');
        const initialParentState = router.context.data.parent;
        expect(initialParentState).toEqual({ parentData: 'parent' });

        await router.activate('/users/123');
        expect(parentProvider).toHaveBeenCalledTimes(1);
        expect(childProvider).toHaveBeenCalledTimes(1);

        expect(router.context.data.parent).toBe(initialParentState);
        expect(router.context.data.child).toEqual({ childData: 'child' });
      });

      it('should handle guards with redirects', async () => {
        const loginRoute = router.route('/login');
        const dashboardRoute = router.route('/dashboard');
        const redirect = new Redirect(loginRoute as any);

        const guard = vi.fn(() => {
          throw redirect;
        });
        dashboardRoute.guard(guard);

        await expect(async () => {
          await router.activate('/dashboard');
        }).rejects.toThrow();
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
        expect(router.context.data.users).toEqual({ users: [] });
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
        const userRoute = router.route('/users').route('/:id');

        await router.activate('/users/123');
        expect(router.activeRoute).toBe(userRoute);
        expect(router.context.params.id).toEqual('123');
      });

      it('should handle wildcard routes', async () => {
        const wildcardRoute = router.route('/api').route('/*');

        await router.activate('/api/v1/users');
        expect(router.activeRoute).toBe(wildcardRoute);
      });

      it('should handle query parameters', async () => {
        router.route('/users?tab&sort');

        await router.activate('/users?tab=profile&sort=asc');
        expect(router.context.query.tab).toBe('profile');
        expect(router.context.query.sort).toBe('asc');
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

    describe('reactive navigation', () => {
      beforeEach(() => {
        vi.stubGlobal('window', {});
        router.deactivate();
      });

      it('should tear down and recreate on full tree changes', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');
        const postsRoute = router.route('/posts');
        const postRoute = postsRoute.route('/:postId');

        const usersProvider = vi.fn(() => ({ type: 'users' }));
        const userProvider = vi.fn(() => ({ type: 'user' }));
        const postsProvider = vi.fn(() => ({ type: 'posts' }));
        const postProvider = vi.fn(() => ({ type: 'post' }));

        usersRoute.provide('users', usersProvider);
        userRoute.provide('user', userProvider);
        postsRoute.provide('posts', postsProvider);
        postRoute.provide('post', postProvider);

        await router.activate('/users/123');
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);

        const initialUsersState = router.context.data.users;

        await router.activate('/posts/456');
        expect(postsProvider).toHaveBeenCalledTimes(1);
        expect(postProvider).toHaveBeenCalledTimes(1);

        // Assert users data is gone
        expect(router.context.data.users).toBeUndefined();
        expect(router.context.data.user).toBeUndefined();
        expect(router.context.data.posts).toBeDefined();
        expect(router.context.data.post).toBeDefined();

        // Reactivate users and ensure it's recreated
        await router.activate('/users/123');
        expect(usersProvider).toHaveBeenCalledTimes(2); // Fully recreated
        expect(userProvider).toHaveBeenCalledTimes(2);
        expect(router.context.data.users).not.toBe(initialUsersState); // New identity
      });

      it('should preserve parent and tear down only leaf on leaf changes', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');
        const postsRoute = userRoute.route('/posts');
        const settingsRoute = userRoute.route('/settings');

        const usersProvider = vi.fn(() => ({ type: 'users' }));
        const userProvider = vi.fn(() => ({ type: 'user' }));
        const postsProvider = vi.fn(() => ({ type: 'posts' }));
        const settingsProvider = vi.fn(() => ({ type: 'settings' }));

        usersRoute.provide('users', usersProvider);
        userRoute.provide('user', userProvider);
        postsRoute.provide('posts', postsProvider);
        settingsRoute.provide('settings', settingsProvider);

        await router.activate('/users/123/posts');
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);
        expect(postsProvider).toHaveBeenCalledTimes(1);

        const initialUsersState = router.context.data.users;
        const initialUserState = router.context.data.user;

        await router.activate('/users/123/settings');
        // Parent providers should NOT be called again
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);
        expect(settingsProvider).toHaveBeenCalledTimes(1);

        // State preserved exactly
        expect(router.context.data.users).toBe(initialUsersState);
        expect(router.context.data.user).toBe(initialUserState);

        // Leaf state switched
        expect(router.context.data.posts).toBeUndefined();
        expect(router.context.data.settings).toBeDefined();
      });

      it('should preserve entire tree and reactively re-run providers on param changes', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id');

        const usersProvider = vi.fn(() => ({ type: 'users' }));
        const userProvider = vi.fn((ctx) => {
          // Read param to establish a reactive dependency
          return { type: 'user', currentId: ctx.params.id };
        });

        usersRoute.provide('users', usersProvider);
        userRoute.provide('user', userProvider);

        await router.activate('/users/123');
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);

        const initialUsersState = router.context.data.users;

        const activateSpy = vi.spyOn(userRoute, 'activate');

        // Navigate with a new param
        await router.activate('/users/456');

        // Let the reactive observer flush
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Ensure route.activate is called again due to param change.
        expect(activateSpy).toHaveBeenCalled();

        // Parent provider didn't read param, so it's NOT re-run
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(router.context.data.users).toBe(initialUsersState);

        // Child provider read ctx.params.id, so it should re-run in the background!
        expect(userProvider).toHaveBeenCalledTimes(2);

        // Verify state is successfully updated
        expect(router.context.params.id).toBe('456');
        expect(router.context.data.user).toEqual({ type: 'user', currentId: '456' });
      });

      it('should preserve entire tree and reactively re-run providers on query changes', async () => {
        const usersRoute = router.route('/users');
        const userRoute = usersRoute.route('/:id?tab');

        const usersProvider = vi.fn(() => ({ type: 'users' }));
        const userProvider = vi.fn((ctx) => {
          // Read query to establish a reactive dependency
          return { type: 'user', currentTab: ctx.query.tab };
        });

        usersRoute.provide('users', usersProvider);
        userRoute.provide('user', userProvider);

        await router.activate('/users/123?tab=profile');
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);

        const initialUsersState = router.context.data.users;

        const activateSpy = vi.spyOn(userRoute, 'activate');

        // Navigate with a new query
        await router.activate('/users/123?tab=settings');

        // Let the reactive observer flush
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Ensure route.activate is NEVER called again
        expect(activateSpy).not.toHaveBeenCalled();

        // Parent provider didn't read query, so it's NOT re-run
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(router.context.data.users).toEqual(initialUsersState);

        // Child provider read ctx.query.tab, so it should re-run in the background!
        expect(userProvider).toHaveBeenCalledTimes(2);

        // Verify state is successfully updated
        expect(router.context.query.tab).toBe('settings');
        expect(router.context.data.user).toEqual({ type: 'user', currentTab: 'settings' });
      });

      it('should restore exact state identity from cache after full tree teardown', async () => {
        const usersRoute = router.rootRoute.route('/users');
        const userRoute = usersRoute.route('/:id');

        const usersProvider = vi.fn(() => ({ type: 'users' }));
        const userProvider = vi.fn(() => ({ type: 'user' }));

        // Enable caching with a long maxAge
        usersRoute.provide('users', usersProvider, { maxAge: 10000 });
        userRoute.provide('user', userProvider, { maxAge: 10000 });

        // State 1: First activation
        await router.activate('/users/123');
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);

        const cachedUsersState = router.context.data.users;
        const cachedUserState = router.context.data.user;

        // State 2: Full teardown
        router.deactivate();
        expect(router.context.data.users).toBeUndefined();

        // State 3: Reactivate original route
        await router.activate('/users/123');

        // Providers should NOT be called again due to cache hit
        expect(usersProvider).toHaveBeenCalledTimes(1);
        expect(userProvider).toHaveBeenCalledTimes(1);

        // State identity should be EXACTLY restored from cache
        expect(router.context.data.users).toBe(cachedUsersState);
        expect(router.context.data.user).toBe(cachedUserState);
      });
    });

    describe('edge cases', () => {
      it('should handle empty path', async () => {
        const result = await router.activate('');
        expect(result).toEqual([]);
      });

      it('should handle root path', async () => {
        router.route('/');
        await router.activate('/');
        expect(router.activeRoute?.path).toBe('/');
      });

      it('should handle paths with trailing slashes', async () => {
        router.route('/users');
        await router.activate('/users/');
        expect(router.activeRoute?.path).toBe('/users');
      });

      it('should handle paths with multiple slashes', async () => {
        router.route('/users');
        await router.activate('//users//');
        // Invalid URL fallback to root.
        expect(router.activeRoute?.path).toBe('/');
      });

      it('should handle special characters in path', async () => {
        router.route('/users').route('/:slug');
        await router.activate('/users/my-awesome-post');
        expect(router.activeRoute?.path).toBe('/users/:slug');
      });

      it('should handle Unicode characters in path', async () => {
        router.route('/users').route('/:name');
        await router.activate('/users/张三');
        expect(router.activeRoute?.path).toBe('/users/:name');
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
        router.route('/users?tab');

        await router.activate('/users?tab=profile');
        await router.activate('/users?tab=settings');

        expect(router.context.query.tab).toEqual('settings');
      });

      it('should handle start with increment', async () => {
        const router = createRouter();

        router.start();
        expect(router.state.steps).toBe(1);

        router.start(2);
        expect(router.state.steps).toBe(3);
      });

      it('should handle start fresh', async () => {
        const router = createRouter();

        router.start();
        expect(router.state.steps).toBe(1);

        router.start();
        router.start();
        router.progress();
        router.progress();
        router.progress();
        router.progress();
        router.progress();

        router.start(1, true);

        expect(router.state.steps).toBe(1);
        expect(router.state.progress).toBe(0);
      });

      it('should listen for controller abort when activating with controller', async () => {
        const router = createRouter();
        const controller = new AbortController();
        const spy = vi.spyOn(controller.signal, 'addEventListener');

        await router.activate('http://localhost', true, controller);

        expect(spy).toHaveBeenCalled();
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
      expect(result).toEqual([]);
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
      expect(result).toEqual([]);
    });

    it('should handle guard errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      usersRoute.guard(guard);

      await router.activate('/users');
      expect(router.context.exception).toBeInstanceOf(RouteError);
    });

    it('should handle async guard errors', async () => {
      const usersRoute = router.route('/users');
      const error = new Error('Async guard failed');
      const guard = vi.fn(async () => {
        throw error;
      });
      usersRoute.guard(guard);

      await router.activate('/users');
      expect(router.context.exception).toBeInstanceOf(RouteError);
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
      expect(result).toEqual([]);
    });

    it('should detect exception renderer', () => {
      expect(router.exceptionRenderer).toBeUndefined();
      router.catch(() => 'Ok');
      expect(router.exceptionRenderer).toBeDefined();
    });

    it('should return when finding undefined url', () => {
      expect(router.find(undefined as never)).toBeUndefined();
    });

    it('should return when activating undefined url', async () => {
      expect(await router.activate(undefined as never)).toEqual([]);
    });

    it('should return when preloading undefined url', async () => {
      expect(await router.preload(undefined as never)).toBeUndefined();
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

  describe('hydration', () => {
    it('should check window for hydration data in browser (lines 124-126)', () => {
      // Simulate browser environment with hydration data
      const HYDRATION_KEY = '__ANCHOR_ROUTER_CACHE__';
      const mockHydrationData = [[{ name: 'test', cache: [] }]];

      // Stub window object with hydration data
      vi.stubGlobal('window', {
        [HYDRATION_KEY]: mockHydrationData,
      });
      vi.stubGlobal('document', {
        querySelector: () => ({
          get textContent() {
            return JSON.stringify(mockHydrationData);
          },
          remove: vi.fn(),
        }),
      });

      // Create router - should pick up hydration data
      const routerWithHydration = new Router();

      // Verify hydration data was captured
      expect((routerWithHydration as any).hydratedSegments).toEqual(mockHydrationData);

      // Clean up
      vi.unstubAllGlobals();
    });

    it('should warn malformed hydration script', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Simulate browser environment with hydration data
      const HYDRATION_KEY = '__ANCHOR_ROUTER_CACHE__';
      const mockHydrationData = [[{ name: 'test', cache: [] }]];

      // Stub window object with hydration data
      vi.stubGlobal('window', {
        [HYDRATION_KEY]: mockHydrationData,
      });
      vi.stubGlobal('document', {
        querySelector: () => ({
          get textContent() {
            return `{ a: ' }`;
          },
          remove: vi.fn(),
        }),
      });

      // Create router - should pick up hydration data
      const routerWithHydration = new Router();

      // Verify hydration data was captured
      expect((routerWithHydration as any).hydratedSegments).toBeUndefined();
      expect(errSpy).toHaveBeenCalledTimes(1);

      // Clean up
      vi.unstubAllGlobals();
      errSpy.mockRestore();
    });

    it('should not check window in non-browser environment', () => {
      // Ensure no window object exists
      vi.unstubAllGlobals();

      const router = new Router();
      expect((router as any).hydratedSegments).toBeUndefined();
    });

    it('should hydrate segments during activation (lines 301-312)', async () => {
      const router = new Router();
      const route = router.route('/test', { maxAge: 1000 });
      const mockProvider = vi.fn(async () => 'test-data');
      route.provide('data', mockProvider);

      // First activate to populate cache
      await router.activate('/test');

      // Get the snapshot from the activated route
      const snapshot = route.snapshot();

      // Deactivate
      router.deactivate();

      // Clear provider call count
      mockProvider.mockClear();

      // Set hydratedSegments for next activation
      (router as any).hydratedSegments = [snapshot];

      // Activate route again - should use hydration
      await router.activate('/test', false);

      // Verify hydration was used (provider should not be called)
      expect(mockProvider).toHaveBeenCalledTimes(0);

      // Verify hydratedSegments was deleted after use
      expect((router as any).hydratedSegments).toBeUndefined();
    });

    it('should skip hydration when snapshot is undefined', async () => {
      const router = new Router();
      const route = router.route('/test', { maxAge: 1000 });
      const mockProvider = vi.fn(async () => 'test-data');
      route.provide('data', mockProvider);

      // Set hydratedSegments with undefined snapshot for the segment
      (router as any).hydratedSegments = [undefined];

      // Activate route
      await router.activate('/test', false);

      // Provider should be called since no valid snapshot
      expect(mockProvider).toHaveBeenCalledTimes(1);

      // Verify hydratedSegments was still deleted
      expect((router as any).hydratedSegments).toBeUndefined();
    });

    it('should create hydration script with escaped characters (lines 499-507)', () => {
      const router = new Router();
      const snapshot = [
        [
          {
            name: 'test',
            cache: [
              {
                key: '{"params":{},"query":{}}',
                value: {
                  data: '<script>alert("xss")</script>',
                  timestamp: Date.now(),
                  maxAge: 1000,
                },
              },
            ],
          },
        ],
      ];

      const script = router.createHydrationScript(snapshot as RouterSnapshot);

      // Verify script tag structure
      expect(script).toContain('<script id="__ANCHOR_ROUTER_CACHE__"');
      expect(script).toContain('</script>');
      expect(script).toContain('__ANCHOR_ROUTER_CACHE__');

      // Verify dangerous characters are escaped
      expect(script).not.toContain('<script>alert');
      expect(script).toContain('\\u003C'); // < escaped
      expect(script).toContain('\\u003E'); // > escaped
      expect(script).toContain('\\u002F'); // / escaped
    });

    it('should handle empty snapshot in hydration script', () => {
      const router = new Router();
      const snapshot: any[] = [];

      const script = router.createHydrationScript(snapshot);

      expect(script).toContain('<script id="__ANCHOR_ROUTER_CACHE__"');
      expect(script).toContain('</script>');
      expect(script).toContain('__ANCHOR_ROUTER_CACHE__');
      expect(script).toContain('[]');
    });

    it('should escape Unicode line separators in hydration script', () => {
      const router = new Router();
      const snapshot = [
        [
          {
            name: 'test',
            cache: [
              {
                key: 'test-key',
                value: {
                  data: 'line1\u2028line2\u2029line3',
                  timestamp: Date.now(),
                  maxAge: 1000,
                },
              },
            ],
          },
        ],
      ];

      const script = router.createHydrationScript(snapshot as RouterSnapshot);

      // Verify Unicode line separators are escaped
      expect(script).toContain('\\u2028');
      expect(script).toContain('\\u2029');
    });
  });

  describe('entries()', () => {
    it('should return default root route entry on a fresh router', () => {
      const router = new Router();
      const entries = router.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0][0]).toBe('/');
      expect(entries[0][1].isIndex).toBe(false);
      expect(entries[0][1].route).toBe(router.rootRoute);
    });

    it('should aggregate route entries across multiple independent appended route trees', () => {
      const router = new Router();

      // Tree 1: Root tree
      const root = router.route();
      root.route('/dashboard');
      root.route('/settings');

      // Tree 2: Independent Auth tree
      const auth = router.add('/auth');
      auth.route('/'); // auth index
      auth.route('/login');
      auth.route('/oauth').route('/:provider');

      // Tree 3: Independent API tree
      const api = router.add('/api').route('/v1');
      api.route('/webhooks').route('/*');

      const entries = router.entries();
      expect(entries).toHaveLength(12);

      const paths = entries.map(([path, val]) => (val.isIndex ? `${path} (index)` : path));
      expect(paths).toContain('/');
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/settings');
      expect(paths).toContain('/auth');
      expect(paths).toContain('/auth/ (index)');
      expect(paths).toContain('/auth/login');
      expect(paths).toContain('/auth/oauth');
      expect(paths).toContain('/auth/oauth/:provider');
      expect(paths).toContain('/api');
      expect(paths).toContain('/api/v1');
      expect(paths).toContain('/api/v1/webhooks');
      expect(paths).toContain('/api/v1/webhooks/*');
    });
  });

  describe('passive routing and static configuration', () => {
    it('inherits static option from router root and allows override on child routes', () => {
      const router = createRouter({ static: true });
      const root = router.route();
      const about = root.route('/about');
      const dynamic = root.route('/dynamic', { static: false });

      expect(root.options?.static).toBe(true);
      expect(about.options?.static).toBe(true);
      expect(dynamic.options?.static).toBe(false);
    });

    it('resolves routes passively via find(url, true) using passive cache', () => {
      const router = createRouter({ static: true });
      router.route('/page').route('/:id');

      const match = router.find('/page/123', true);
      expect(match).toBeDefined();
      expect(match?.route.options?.static).toBe(true);

      const cachedMatch = router.find('/page/123', true);
      expect(cachedMatch).toBe(match);
    });
  });
});
