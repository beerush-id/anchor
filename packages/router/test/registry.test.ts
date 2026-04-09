import { beforeEach, describe, expect, it } from 'vitest';
import { DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from '../src/constant.js';
import { createRouter, type Router } from '../src/index.js';
import { RouteRegistry } from '../src/registry.js';
import { Route } from '../src/route.js';

let sharedRouter: Router;

describe('registry.ts', () => {
  beforeEach(() => {
    sharedRouter = createRouter();
  });

  describe('RouteRegistry', () => {
    let rootRoute: Route<'/', {}, {}, {}, {}>;
    let registry: RouteRegistry;

    beforeEach(() => {
      rootRoute = new Route(sharedRouter, '/');
      registry = new RouteRegistry(rootRoute);
    });

    describe('constructor', () => {
      it('should create a new RouteRegistry instance', () => {
        expect(registry).toBeInstanceOf(RouteRegistry);
        expect(registry).toBeInstanceOf(Map);
      });

      it('should store the route reference', () => {
        const testRoute = new Route(sharedRouter, '/test');
        const testRegistry = new RouteRegistry(testRoute as never);
        expect(testRegistry.route).toBe(testRoute);
      });

      it('should link route to registry in ROUTE_MAP_LINK', () => {
        const testRoute = new Route(sharedRouter, '/test');
        const testRegistry = new RouteRegistry(testRoute as never);
        expect(ROUTE_MAP_LINK.get(testRoute)).toBe(testRegistry);
      });
    });

    describe('name getter', () => {
      it('should return the route name', () => {
        const testRoute = new Route(sharedRouter, '/users');
        const testRegistry = new RouteRegistry(testRoute as never);
        expect(testRegistry.name).toBe('users');
      });

      it('should return empty string for root route', () => {
        expect(registry.name).toBe('');
      });

      it('should return dynamic parameter name', () => {
        const dynamicRoute = new Route(sharedRouter, '/:id');
        const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
        // The name includes the ':' prefix for dynamic routes
        expect(dynamicRegistry.name).toBe(':id');
      });

      it('should return wildcard name', () => {
        const wildcardRoute = new Route(sharedRouter, '/*');
        const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
        expect(wildcardRegistry.name).toBe('*');
      });
    });

    describe('match', () => {
      describe('basic matching', () => {
        it('should return undefined for empty path', () => {
          const result = registry.match('');
          expect(result).toBeUndefined();
        });

        it('should return undefined for undefined path', () => {
          const result = registry.match(undefined as never);
          expect(result).toBeUndefined();
        });

        it('should match root route', () => {
          const result = registry.match('/');
          expect(result).toBeDefined();
          expect(result?.route).toBe(rootRoute);
          expect(result?.params).toEqual({});
          expect(result?.segments).toEqual([rootRoute]);
        });

        it('should match root route with empty segments array', () => {
          // The match function returns undefined for empty arrays
          // Use '/' to match the root route
          const result = registry.match('/');
          expect(result).toBeDefined();
          expect(result?.route).toBe(rootRoute);
        });
      });

      describe('static route matching', () => {
        it('should match static child route', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result = registry.match('/users');
          expect(result).toBeDefined();
          expect(result?.route).toBe(usersRoute);
          expect(result?.params).toEqual({});
          expect(result?.segments).toEqual([registry.route, usersRoute]);
        });

        it('should match nested static routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const profileRoute = new Route(sharedRouter, '/profile');
          const profileRegistry = new RouteRegistry(profileRoute as never);
          usersRegistry.set('profile', profileRegistry);

          const result = registry.match('/users/profile');
          expect(result).toBeDefined();
          expect(result?.route).toBe(profileRoute);
          expect(result?.params).toEqual({});
          expect(result?.segments).toEqual([registry.route, usersRoute, profileRoute]);
        });

        it('should match deeply nested static routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const profileRoute = new Route(sharedRouter, '/profile');
          const profileRegistry = new RouteRegistry(profileRoute as never);
          usersRegistry.set('profile', profileRegistry);

          const settingsRoute = new Route(sharedRouter, '/settings');
          const settingsRegistry = new RouteRegistry(settingsRoute as never);
          profileRegistry.set('settings', settingsRegistry);

          const result = registry.match('/users/profile/settings');
          expect(result).toBeDefined();
          expect(result?.route).toBe(settingsRoute);
          expect(result?.segments).toEqual([registry.route, usersRoute, profileRoute, settingsRoute]);
        });

        it('should return index route of matched static route', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const rootIndexRoute = new Route(sharedRouter, '/');
          usersRoute.index = rootIndexRoute as never;
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result = registry.match('/users');
          expect(result).toBeDefined();
          expect(result?.segments).toEqual([registry.route, usersRoute, rootIndexRoute]);
        });

        it('should return undefined for non-matching static route', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result = registry.match('/posts');
          expect(result).toBeUndefined();
        });

        it('should handle multiple static routes at same level', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const postsRoute = new Route(sharedRouter, '/posts');
          const commentsRoute = new Route(sharedRouter, '/comments');

          registry.set('users', new RouteRegistry(usersRoute as never));
          registry.set('posts', new RouteRegistry(postsRoute as never));
          registry.set('comments', new RouteRegistry(commentsRoute as never));

          const usersResult = registry.match('/users');
          const postsResult = registry.match('/posts');
          const commentsResult = registry.match('/comments');

          expect(usersResult?.route).toBe(usersRoute);
          expect(postsResult?.route).toBe(postsRoute);
          expect(commentsResult?.route).toBe(commentsRoute);
        });
      });

      describe('dynamic route matching', () => {
        it('should match dynamic route', () => {
          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/123');
          expect(result).toBeDefined();
          expect(result?.route).toBe(dynamicRoute);
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ id: '123' });
          expect(result?.segments).toEqual([registry.route, dynamicRoute]);
        });

        it('should return index route of matched dynamic route', () => {
          const dynamicRoute = new Route(sharedRouter, '/:id');
          const rootIndexRoute = new Route(sharedRouter, '/');
          dynamicRoute.index = rootIndexRoute as never;
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/123');
          expect(result).toBeDefined();
          expect(result?.segments).toEqual([registry.route, dynamicRoute, rootIndexRoute]);
        });

        it('should match nested dynamic routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const userRoute = new Route(sharedRouter, '/:id');
          const userRegistry = new RouteRegistry(userRoute as never);
          usersRegistry.set(DYNAMIC_ROUTE_KEY, userRegistry);

          const result = registry.match('/users/123');
          expect(result).toBeDefined();
          expect(result?.route).toBe(userRoute);
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ id: '123' });
          expect(result?.segments).toEqual([registry.route, usersRoute, userRoute]);
        });

        it('should match multiple dynamic parameters', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const userRoute = new Route(sharedRouter, '/:userId');
          const userRegistry = new RouteRegistry(userRoute as never);
          usersRegistry.set(DYNAMIC_ROUTE_KEY, userRegistry);

          const postsRoute = new Route(sharedRouter, '/posts');
          const postsRegistry = new RouteRegistry(postsRoute as never);
          userRegistry.set('posts', postsRegistry);

          const postRoute = new Route(sharedRouter, '/:postId');
          const postRegistry = new RouteRegistry(postRoute as never);
          postsRegistry.set(DYNAMIC_ROUTE_KEY, postRegistry);

          const result = registry.match('/users/123/posts/456');
          expect(result).toBeDefined();
          expect(result?.route).toBe(postRoute);
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ userId: '123', postId: '456' });
          expect(result?.segments).toEqual([registry.route, usersRoute, userRoute, postsRoute, postRoute]);
        });

        it('should match dynamic route with special characters', () => {
          const dynamicRoute = new Route(sharedRouter, '/:slug');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/my-awesome-post');
          expect(result).toBeDefined();
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ slug: 'my-awesome-post' });
        });

        it('should match dynamic route with numbers', () => {
          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/12345');
          expect(result).toBeDefined();
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ id: '12345' });
        });

        it('should match dynamic route with UUID', () => {
          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const uuid = '550e8400-e29b-41d4-a716-446655440000';
          const result = registry.match(`/${uuid}`);
          expect(result).toBeDefined();
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ id: uuid });
        });

        it('should match dynamic route with underscores', () => {
          const dynamicRoute = new Route(sharedRouter, '/:user_id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/user_123');
          expect(result).toBeDefined();
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ user_id: 'user_123' });
        });

        it('should match dynamic route with hyphens', () => {
          const dynamicRoute = new Route(sharedRouter, '/:user-id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/user-123');
          expect(result).toBeDefined();
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ 'user-id': 'user-123' });
        });
      });

      describe('wildcard route matching', () => {
        it('should match wildcard route', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/any/path/here');
          expect(result).toBeDefined();
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['any', 'path', 'here'] });
          expect(result?.segments).toEqual([registry.route, wildcardRoute]);
        });

        it('should return index route of matched wildcard route', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const rootIndexRoute = new Route(sharedRouter, '/');
          wildcardRoute.index = rootIndexRoute as never;
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/any/path');
          expect(result).toBeDefined();
          expect(result?.segments).toEqual([registry.route, wildcardRoute, rootIndexRoute]);
        });

        it('should match wildcard with single segment', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/test');
          expect(result).toBeDefined();
          expect(result?.params).toEqual({ '*': ['test'] });
        });

        it('should match wildcard with empty remaining path', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          usersRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/users');
          expect(result).toBeDefined();
          expect(result?.route).toBe(usersRoute);
        });

        it('should match nested wildcard routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          usersRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/users/any/deep/path');
          expect(result).toBeDefined();
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['any', 'deep', 'path'] });
          expect(result?.segments).toEqual([registry.route, usersRoute, wildcardRoute]);
        });

        it('should match wildcard after static route', () => {
          const apiRoute = new Route(sharedRouter, '/api');
          const apiRegistry = new RouteRegistry(apiRoute as never);
          registry.set('api', apiRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          apiRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/api/v1/users/123');
          expect(result).toBeDefined();
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['v1', 'users', '123'] });
        });

        it('should fallback to wildcard when static child has no match', () => {
          // This tests lines 94-101 in registry.ts
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          // Add a static child route
          const profileRoute = new Route(sharedRouter, '/profile');
          const profileRegistry = new RouteRegistry(profileRoute as never);
          usersRegistry.set('profile', profileRegistry);

          // Add a wildcard at the users level
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          usersRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          // Request /users/something - should match wildcard since 'something' is not 'profile'
          const result = registry.match('/users/something');
          expect(result).toBeDefined();
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['something'] });
        });
      });

      describe('route priority', () => {
        it('should prefer static over dynamic', () => {
          const staticRoute = new Route(sharedRouter, '/users');
          const staticRegistry = new RouteRegistry(staticRoute as never);
          registry.set('users', staticRegistry);

          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result = registry.match('/users');
          expect(result?.route).toBe(staticRoute);
        });

        it('should fallback to wildcard when static child has no match', () => {
          // This tests the uncovered lines 94-101 in registry.ts
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          // Add a static child route
          const profileRoute = new Route(sharedRouter, '/profile');
          const profileRegistry = new RouteRegistry(profileRoute as never);
          usersRegistry.set('profile', profileRegistry);

          // Add a wildcard at the users level
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          usersRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          // Request /users/something - should match wildcard since 'something' is not 'profile'
          const result = registry.match('/users/something');
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['something'] });
        });

        it('should prefer static over wildcard', () => {
          const staticRoute = new Route(sharedRouter, '/users');
          const staticRegistry = new RouteRegistry(staticRoute as never);
          registry.set('users', staticRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/users');
          expect(result?.route).toBe(staticRoute);
        });

        it('should prefer dynamic over wildcard', () => {
          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/123');
          expect(result?.route).toBe(dynamicRoute);
        });

        it('should use wildcard when no static or dynamic match', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/any/path');
          expect(result?.route).toBe(wildcardRoute);
        });
      });

      describe('path normalization', () => {
        it('should handle leading slashes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result1 = registry.match('/users');
          const result2 = registry.match('users');

          expect(result1?.route).toBe(usersRoute);
          expect(result2?.route).toBe(usersRoute);
        });

        it('should handle trailing slashes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result1 = registry.match('/users');
          const result2 = registry.match('/users/');

          expect(result1?.route).toBe(usersRoute);
          expect(result2?.route).toBe(usersRoute);
        });

        it('should handle multiple consecutive slashes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result = registry.match('//users//');
          expect(result?.route).toBe(usersRoute);
        });

        it('should handle paths with only slashes', () => {
          const result = registry.match('///');
          expect(result?.route).toBe(rootRoute);
        });
      });

      describe('complex scenarios', () => {
        it('should match mixed static, dynamic, and wildcard routes', () => {
          const apiRoute = new Route(sharedRouter, '/api');
          const apiRegistry = new RouteRegistry(apiRoute as never);
          registry.set('api', apiRegistry);

          const v1Route = new Route(sharedRouter, '/v1');
          const v1Registry = new RouteRegistry(v1Route as never);
          apiRegistry.set('v1', v1Registry);

          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          v1Registry.set('users', usersRegistry);

          const userRoute = new Route(sharedRouter, '/:id');
          const userRegistry = new RouteRegistry(userRoute as never);
          usersRegistry.set(DYNAMIC_ROUTE_KEY, userRegistry);

          const postsRoute = new Route(sharedRouter, '/posts');
          const postsRegistry = new RouteRegistry(postsRoute as never);
          v1Registry.set('posts', postsRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          v1Registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result1 = registry.match('/api/v1/users/123');
          const result2 = registry.match('/api/v1/posts');
          const result3 = registry.match('/api/v1/other');

          expect(result1?.route).toBe(userRoute);
          // Dynamic params include the ':' prefix in the key
          expect(result1?.params).toEqual({ id: '123' });

          expect(result2?.route).toBe(postsRoute);

          expect(result3?.route).toBe(wildcardRoute);
          expect(result3?.params).toEqual({ '*': ['other'] });
        });

        it('should handle deeply nested wildcard fallback', () => {
          const aRoute = new Route(sharedRouter, '/a');
          const aRegistry = new RouteRegistry(aRoute as never);
          registry.set('a', aRegistry);

          const bRoute = new Route(sharedRouter, '/b');
          const bRegistry = new RouteRegistry(bRoute as never);
          aRegistry.set('b', bRegistry);

          const cRoute = new Route(sharedRouter, '/c');
          const cRegistry = new RouteRegistry(cRoute as never);
          bRegistry.set('c', cRegistry);

          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          cRegistry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/a/b/c/d/e/f');
          expect(result?.route).toBe(wildcardRoute);
          expect(result?.params).toEqual({ '*': ['d', 'e', 'f'] });
        });

        it('should handle route with same name as parameter', () => {
          const idRoute = new Route(sharedRouter, '/id');
          const idRegistry = new RouteRegistry(idRoute as never);
          registry.set('id', idRegistry);

          const dynamicRoute = new Route(sharedRouter, '/:id');
          const dynamicRegistry = new RouteRegistry(dynamicRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, dynamicRegistry);

          const result1 = registry.match('/id');
          const result2 = registry.match('/123');

          expect(result1?.route).toBe(idRoute);
          expect(result2?.route).toBe(dynamicRoute);
        });
      });

      describe('segments accumulation', () => {
        it('should accumulate segments for nested routes', () => {
          const aRoute = new Route(sharedRouter, '/a');
          const aRegistry = new RouteRegistry(aRoute as never);
          registry.set('a', aRegistry);

          const bRoute = new Route(sharedRouter, '/b');
          const bRegistry = new RouteRegistry(bRoute as never);
          aRegistry.set('b', bRegistry);

          const cRoute = new Route(sharedRouter, '/c');
          const cRegistry = new RouteRegistry(cRoute as never);
          bRegistry.set('c', cRegistry);

          const result = registry.match('/a/b/c');
          expect(result?.segments).toEqual([registry.route, aRoute, bRoute, cRoute]);
        });

        it('should include root route in segments', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const result = registry.match('/users');
          expect(result?.segments).toEqual([registry.route, usersRoute]);
        });

        it('should handle segments with dynamic routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const userRoute = new Route(sharedRouter, '/:id');
          const userRegistry = new RouteRegistry(userRoute as never);
          usersRegistry.set(DYNAMIC_ROUTE_KEY, userRegistry);

          const result = registry.match('/users/123');
          expect(result?.segments).toEqual([registry.route, usersRoute, userRoute]);
        });
      });

      describe('params accumulation', () => {
        it('should accumulate params for nested dynamic routes', () => {
          const usersRoute = new Route(sharedRouter, '/users');
          const usersRegistry = new RouteRegistry(usersRoute as never);
          registry.set('users', usersRegistry);

          const userRoute = new Route(sharedRouter, '/:userId');
          const userRegistry = new RouteRegistry(userRoute as never);
          usersRegistry.set(DYNAMIC_ROUTE_KEY, userRegistry);

          const postsRoute = new Route(sharedRouter, '/posts');
          const postsRegistry = new RouteRegistry(postsRoute as never);
          userRegistry.set('posts', postsRegistry);

          const postRoute = new Route(sharedRouter, '/:postId');
          const postRegistry = new RouteRegistry(postRoute as never);
          postsRegistry.set(DYNAMIC_ROUTE_KEY, postRegistry);

          const result = registry.match('/users/123/posts/456');
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ userId: '123', postId: '456' });
        });

        it('should preserve params order', () => {
          const aRoute = new Route(sharedRouter, '/:a');
          const aRegistry = new RouteRegistry(aRoute as never);
          registry.set(DYNAMIC_ROUTE_KEY, aRegistry);

          const bRoute = new Route(sharedRouter, '/:b');
          const bRegistry = new RouteRegistry(bRoute as never);
          aRegistry.set(DYNAMIC_ROUTE_KEY, bRegistry);

          const cRoute = new Route(sharedRouter, '/:c');
          const cRegistry = new RouteRegistry(cRoute as never);
          bRegistry.set(DYNAMIC_ROUTE_KEY, cRegistry);

          const result = registry.match('/1/2/3');
          // Dynamic params include the ':' prefix in the key
          expect(result?.params).toEqual({ a: '1', b: '2', c: '3' });
        });
      });

      describe('edge cases', () => {
        it('should handle very long paths', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const longPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z';
          const result = registry.match(longPath);
          expect(result).toBeDefined();
        });

        it('should handle paths with special characters', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/path/with-dashes_and_underscores/and.dots');
          expect(result).toBeDefined();
        });

        it('should handle paths with URL-encoded characters', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/path%20with%20spaces');
          expect(result).toBeDefined();
        });

        it('should handle paths with Unicode characters', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/path/with/中文/characters');
          expect(result).toBeDefined();
        });

        it('should handle paths with emoji', () => {
          const wildcardRoute = new Route(sharedRouter, '/*');
          const wildcardRegistry = new RouteRegistry(wildcardRoute as never);
          registry.set(WILDCARD_ROUTE_KEY, wildcardRegistry);

          const result = registry.match('/path/with/😀/emoji');
          expect(result).toBeDefined();
        });
      });
    });
  });
});
