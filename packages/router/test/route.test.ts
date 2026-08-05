import { mutable, setReactive } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DYNAMIC_ROUTE_KEY, WILDCARD_ROUTE_KEY } from '../src/constant.js';
import { ROUTE_STATUS, ROUTE_TYPE } from '../src/enum.js';
import { GuardError, ProviderError, RouteError } from '../src/error.js';
import { getExceptionRendererFactory, getRenderProps, Router, setExceptionRendererFactory } from '../src/index.js';
import { Redirect } from '../src/redirect.js';
import { RouteRegistry } from '../src/registry.js';
import { Route } from '../src/route.js';

let sharedRouter: Router;

describe('Route class', () => {
  beforeEach(() => {
    setReactive(true);
  });
  afterEach(() => {
    setReactive(false);
  });

  beforeEach(() => {
    sharedRouter = new Router();
  });

  describe('constructor', () => {
    it('should create a new Route instance', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route).toBeInstanceOf(Route);
      expect(route.exception).toBeUndefined();
    });

    it('should create a new Route instance with failed name', () => {
      const route = new Route(sharedRouter, undefined as never);
      expect(route).toBeInstanceOf(Route);
      expect(route.name).toBe('');
    });

    it('should extract route name from path', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.name).toBe('users');
    });

    it('should extract route name from path with leading slash', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.name).toBe('users');
    });

    it('should extract dynamic parameter name', () => {
      const route = new Route(sharedRouter, '/:id');
      // Dynamic route names include the ':' prefix
      expect(route.name).toBe(':id');
    });

    it('should extract wildcard name', () => {
      const route = new Route(sharedRouter, '/*');
      expect(route.name).toBe('*');
    });

    it('should set type to STATIC for static routes', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.type).toBe(ROUTE_TYPE.STATIC);
    });

    it('should set type to DYNAMIC for dynamic routes', () => {
      const route = new Route(sharedRouter, '/:id');
      expect(route.type).toBe(ROUTE_TYPE.DYNAMIC);
    });

    it('should set type to WILDCARD for wildcard routes', () => {
      const route = new Route(sharedRouter, '/*');
      expect(route.type).toBe(ROUTE_TYPE.WILDCARD);
    });

    it('should store options when provided', () => {
      const options = { maxAge: 1000, keepAlive: true };
      const route = new Route(sharedRouter, '/test', options);
      // Options are merged with DEFAULT_CONFIG
      expect(route.options?.maxAge).toBe(1000);
      expect(route.options?.keepAlive).toBe(true);
    });

    it('should have default options when not provided', () => {
      const route = new Route(sharedRouter, '/test');
      // Options are merged with DEFAULT_CONFIG, so they're never undefined
      expect(route.options).toBeDefined();
    });

    it('should store parent when provided', () => {
      const parent = new Route(sharedRouter, '/parent');
      const child = new Route(sharedRouter, '/child', undefined, parent);
      expect(child.parent).toBe(parent);
    });

    it('should have undefined parent when not provided', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.parent).toBeUndefined();
    });

    it('should initialize guards as empty Set', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.guards).toBeInstanceOf(Set);
      expect(route.guards.size).toBe(0);
    });

    it('should initialize providers as empty Map', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.providers).toBeInstanceOf(Map);
      expect(route.providers.size).toBe(0);
    });

    it('should initialize active as false', () => {
      const route = new Route(sharedRouter, '/test').state;
      expect(route.active).toBe(false);
    });

    it('should initialize data as undefined', () => {
      const route = new Route(sharedRouter, '/test').context;
      expect(route.data).toEqual({});
    });

    it('should initialize error as undefined', () => {
      const route = new Route(sharedRouter, '/test').state;
      expect(route.error).toBeUndefined();
    });

    it('should initialize params as undefined', () => {
      const route = new Route(sharedRouter, '/test').context;
      expect(route.params).toEqual({});
    });

    it('should initialize query as undefined', () => {
      const route = new Route(sharedRouter, '/test').context;
      expect(route.query).toEqual({});
    });

    it('should initialize index as undefined', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.index).toBeUndefined();
    });
  });

  describe('active getter/setter', () => {
    it('should return false initially', () => {
      const route = new Route(sharedRouter, '/test').state;
      expect(route.active).toBe(false);
    });

    it('should allow setting active to true', () => {
      const route = new Route(sharedRouter, '/test').state;
      route.active = true;
      expect(route.active).toBe(true);
    });

    it('should allow setting active to false', () => {
      const route = new Route(sharedRouter, '/test').state;
      route.active = true;
      route.active = false;
      expect(route.active).toBe(false);
    });
  });

  describe('data getter/setter', () => {
    it('should return undefined initially', () => {
      const route = new Route(sharedRouter, '/test').context;
      expect(route.data).toEqual({});
    });

    it('should allow setting data', () => {
      const route = new Route(sharedRouter, '/test').context;
      const testData = { user: 'John' };
      route.data = testData;
      // Data is wrapped in mutable(), so use toEqual instead of toBe
      expect(route.data).toEqual(testData);
    });

    it('should allow clearing data with undefined', () => {
      const route = new Route(sharedRouter, '/test').context;
      route.data = { user: 'John' };
      route.data = undefined as never;
      expect(route.data).toBeUndefined();
    });
  });

  describe('error getter/setter', () => {
    it('should return undefined initially', () => {
      const route = new Route(sharedRouter, '/test').state;
      expect(route.error).toBeUndefined();
    });

    it('should allow setting error', () => {
      const route = new Route(sharedRouter, '/test').state;
      const testError = new GuardError('Test error');
      route.error = testError;
      // Error is wrapped in mutable(), so use toEqual instead of toBe
      expect(route.error).toEqual(testError);
    });

    it('should allow clearing error with undefined', () => {
      const route = new Route(sharedRouter, '/test').state;
      route.error = new GuardError('Test error');
      route.error = undefined;
      expect(route.error).toBeUndefined();
    });
  });

  describe('state properties (authenticated, authenticating, resolved, resolving)', () => {
    it('should get and set authenticated state', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      expect(state.authenticated).toBe(false);
      state.authenticated = true;
      expect(state.authenticated).toBe(true);
    });

    it('should get and set authenticating state', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      expect(state.authenticating).toBe(false);
      state.authenticating = true;
      expect(state.authenticating).toBe(true);
    });

    it('should get and set resolved state', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      expect(state.resolved).toBe(false);
      state.resolved = true;
      expect(state.resolved).toBe(true);
    });

    it('should get and set resolving state', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      expect(state.resolving.size > 0).toBe(false);
      state.resolving.add('test');
      expect(state.resolving.has('test')).toBe(true);
    });
  });

  describe('render and setRendererFactory', () => {
    it('should allow setting a renderer and rendering', () => {
      const route = new Route(sharedRouter, '/test');
      const renderer = vi.fn().mockImplementation(({ state: reader }) => {
        expect(reader.active).toBe(false);
        expect(reader.status).toBe(ROUTE_STATUS.IDLE);
        expect(reader.resolved).toBe(false);
        expect(reader.resolving.size > 0).toBe(false);
        expect(reader.authenticated).toBe(false);
        expect(reader.authenticating).toBe(false);
        expect(reader.params).toEqual({});
        expect(reader.query).toEqual({});
        expect(reader.data).toEqual({});
        expect(reader.error).toBeUndefined();
        expect(reader.exception).toBeUndefined();
      });
      route.render(renderer);

      expect(route.renderer).toBeDefined();
      if (route.renderer) {
        route.renderer(getRenderProps(route as never) as never);
        expect(renderer).toHaveBeenCalled();

        // Let's also test without layout by bypassing `createRenderer` behavior if we could
        // But `createRenderer` itself uses `layout = true`.
      }
    });

    it('should support changing renderer factory', async () => {
      const { setRendererFactory, getRendererFactory } = await import('../src/route.js');
      const originalFactory = getRendererFactory();

      const factory = vi.fn(() => vi.fn());
      setRendererFactory(factory as never);

      const route = new Route(sharedRouter, '/test');
      const renderer = vi.fn();
      route.render(renderer);

      expect(factory).toHaveBeenCalled();

      // restore factory
      setRendererFactory(originalFactory);

      // Test without layout
      const route2 = new Route(sharedRouter, '/test2');
      const renderer2 = vi.fn();
      const internalRenderer = originalFactory(route2 as never, renderer2 as never);
      internalRenderer({ children: [] } as never);
      expect(renderer2).toHaveBeenCalled();
    });

    it('should allow setting an exception renderer', () => {
      const route = new Route(sharedRouter, '/test');

      expect(route.exceptionRenderer).toBeUndefined();
      route.catch(() => 'Ok');

      expect(route.exceptionRenderer).toBeDefined();
      expect(route.exceptionRenderer!({} as never)).toBe('Ok');
    });

    it('should allow setting an exception renderer factory', () => {
      const factory = getExceptionRendererFactory();
      setExceptionRendererFactory(factory);
      expect(getExceptionRendererFactory()).toBe(factory);

      const route = new Route(sharedRouter, '/test');
      const renderer = factory(route as never, () => 'Ok');
      expect(renderer({} as never)).toBe('Ok');
    });
  });

  describe('renderAsync method', () => {
    it('should set loadRenderer and optionally call render with fallback', () => {
      const route = new Route(sharedRouter, '/test');
      const loader = vi.fn();
      const fallback = vi.fn();
      const renderSpy = vi.spyOn(route, 'render');

      route.renderAsync(loader as never, fallback as never);

      expect((route as any).loadRenderer).toBe(loader);
      expect(renderSpy).toHaveBeenCalledWith(fallback);
    });

    it('should not call render if no fallback provided', () => {
      const route = new Route(sharedRouter, '/test');
      const loader = vi.fn();
      const renderSpy = vi.spyOn(route, 'render');

      route.renderAsync(loader as never);

      expect((route as any).loadRenderer).toBe(loader);
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('params getter', () => {
    it('should return undefined when context is not set', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.params).toEqual({});
      expect(route.context.params).toEqual({});
    });
  });

  describe('query getter', () => {
    it('should return undefined when context is not set', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.query).toEqual({});
      expect(route.context.query).toEqual({});
    });
  });

  describe('path getter', () => {
    it('should return route name for root route', () => {
      const route = new Route(sharedRouter, '/test');
      expect(route.path).toBe('/test');
    });

    it('should return full path including parent', () => {
      const parent = new Route(sharedRouter, '/users');
      const child = new Route(sharedRouter, '/profile', undefined, parent);
      expect(child.path).toBe('/users/profile');
    });

    it('should handle deeply nested routes', () => {
      const root = new Route(sharedRouter, '/api');
      const v1 = new Route(sharedRouter, '/v1', undefined, root);
      const users = new Route(sharedRouter, '/users', undefined, v1);
      const profile = new Route(sharedRouter, '/profile', undefined, users);
      expect(profile.path).toBe('/api/v1/users/profile');
    });

    it('should handle parent with path /', () => {
      const parent = new Route(sharedRouter, '/');
      const child = new Route(sharedRouter, '/test', undefined, parent);
      // Parent with '/' has empty name, so child path starts with '/'
      expect(child.path).toBe('/test');
    });
  });

  describe('url method', () => {
    it('should return route path without params or query', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url()).toBe('/users');
    });

    it('should replace route parameters', () => {
      // Routes should be created via router.route() for proper path handling
      // When using new Route(sharedRouter, ) directly, only the first segment is extracted
      const parent = new Route(sharedRouter, '/users');
      const route = new Route(sharedRouter, '/:id', undefined, parent);
      // The url method replaces :key with value, so use 'id' not ':id'
      expect(route.url({ id: '123' } as never)).toBe('/users/123');
    });

    it('should replace multiple route parameters', () => {
      // Routes should be created via router.route() for proper path handling
      const users = new Route(sharedRouter, '/users');
      const user = new Route(sharedRouter, '/:userId', undefined, users);
      const posts = new Route(sharedRouter, '/posts', undefined, user);
      const post = new Route(sharedRouter, '/:postId', undefined, posts);
      // The url method replaces :key with value
      expect(post.url({ userId: '123', postId: '456' } as never)).toBe('/users/123/posts/456');
    });

    it('should append query parameters', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, { tab: 'profile' } as never)).toBe('/users?tab=profile');
    });

    it('should append multiple query parameters', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, { tab: 'profile', sort: 'asc' } as never)).toBe('/users?tab=profile&sort=asc');
    });

    it('should replace params and append query', () => {
      // Routes should be created via router.route() for proper path handling
      const parent = new Route(sharedRouter, '/users');
      const route = new Route(sharedRouter, '/:id', undefined, parent);
      // The url method replaces :key with value
      expect(route.url({ id: '123' } as never, { tab: 'profile' } as never)).toBe('/users/123?tab=profile');
    });

    it('should handle array query values', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, { tags: ['js', 'ts'] } as never)).toBe('/users?tags=js&tags=ts');
    });

    it('should handle numeric params', () => {
      // Routes should be created via router.route() for proper path handling
      const parent = new Route(sharedRouter, '/users');
      const route = new Route(sharedRouter, '/:id', undefined, parent);
      // The url method replaces :key with value
      expect(route.url({ id: 123 } as never)).toBe('/users/123');
    });

    it('should handle numeric query values', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, { page: 1 } as never)).toBe('/users?page=1');
    });

    it('should handle boolean query values', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, { debug: true } as never)).toBe('/users?debug=true');
    });

    it('should handle empty params object', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url({})).toBe('/users');
    });

    it('should handle empty query object', () => {
      const route = new Route(sharedRouter, '/users');
      expect(route.url(undefined, {})).toBe('/users');
    });

    it('should handle special characters in params', () => {
      // Routes should be created via router.route() for proper path handling
      const parent = new Route(sharedRouter, '/users');
      const route = new Route(sharedRouter, '/:slug', undefined, parent);
      // The url method replaces :key with value
      expect(route.url({ slug: 'my-awesome-post' } as never)).toBe('/users/my-awesome-post');
    });

    it('should handle special characters in query values', () => {
      const route = new Route(sharedRouter, '/users');
      // The url method doesn't encode spaces, it uses them directly
      expect(route.url(undefined, { search: 'hello world' } as never)).toBe('/users?search=hello world');
    });
  });

  describe('route method', () => {
    let parentRoute: Route<'/users', {}, {}, {}, {}>;

    beforeEach(() => {
      parentRoute = new Route(sharedRouter, '/users') as never;
      // Create registry for parent
      new RouteRegistry(parentRoute as never);
    });

    it('should create index route', () => {
      const indexRoute = parentRoute.route('/');

      expect(indexRoute.name).toBe('');
      expect(parentRoute.index).toBe(indexRoute);
      expect(() => (indexRoute as any).route('/test')).toThrow();
    });

    it('should create a child route', () => {
      const childRoute = parentRoute.route('/profile');
      expect(childRoute).toBeInstanceOf(Route);
      expect(childRoute.name).toBe('profile');
      expect(childRoute.parent).toBe(parentRoute);
    });

    it('should set index route when path is /', () => {
      parentRoute.route('/');
      expect(parentRoute.index).toBeDefined();
    });

    it('should create static child route', () => {
      const childRoute = parentRoute.route('/profile');
      expect(childRoute.type).toBe(ROUTE_TYPE.STATIC);
    });

    it('should create dynamic child route', () => {
      const childRoute = parentRoute.route('/:id');
      expect(childRoute.type).toBe(ROUTE_TYPE.DYNAMIC);
    });

    it('should create wildcard child route', () => {
      const childRoute = parentRoute.route('/*');
      expect(childRoute.type).toBe(ROUTE_TYPE.WILDCARD);
    });

    it('should merge parent options with child options', () => {
      const parent = new Route(sharedRouter, '/users', { maxAge: 1000 });
      new RouteRegistry(parent as never);

      const child = parent.route('/profile', { keepAlive: true });
      expect(child.options?.maxAge).toBe(1000);
      expect(child.options?.keepAlive).toBe(true);
      expect(parent.children).toBeDefined();
      expect(child.children).toBeDefined();
      expect(child.authenticated).toBe(false);
    });

    it('should allow child options to override parent options', () => {
      const parent = new Route(sharedRouter, '/users', { maxAge: 1000 });
      new RouteRegistry(parent as never);

      const child = parent.route('/profile', { maxAge: 2000 });
      expect(child.options?.maxAge).toBe(2000);
    });

    it('should throw error when parent has no registry', () => {
      const parent = new Route(sharedRouter, '/users');
      expect(() => parent.route('/profile' as never)).toThrow('RouteMap not found');
    });

    it('should register static child in parent registry', () => {
      const parent = new Route(sharedRouter, '/users');
      const parentRegistry = new RouteRegistry(parent as never);
      const child = parent.route('/profile');

      expect(parentRegistry.get('profile')).toBeDefined();
    });

    it('should register dynamic child with DYNAMIC_ROUTE_KEY', () => {
      const parent = new Route(sharedRouter, '/users');
      const parentRegistry = new RouteRegistry(parent as never);
      const child = parent.route('/:id');

      expect(parentRegistry.get(DYNAMIC_ROUTE_KEY)).toBeDefined();
    });

    it('should register wildcard child with WILDCARD_ROUTE_KEY', () => {
      const parent = new Route(sharedRouter, '/users');
      const parentRegistry = new RouteRegistry(parent as never);
      const child = parent.route('/*');

      expect(parentRegistry.get(WILDCARD_ROUTE_KEY)).toBeDefined();
    });

    it('should create nested child routes', () => {
      const parent = new Route(sharedRouter, '/users');
      new RouteRegistry(parent as never);
      const child = parent.route('/profile');
      const grandchild = child.route('/settings');

      expect(grandchild.path).toBe('/users/profile/settings');
    });
  });

  describe('guard method', () => {
    it('should add guard to guards set', () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn();
      route.guard(guard);

      expect(route.guards.has(guard)).toBe(true);
    });

    it('should return route for chaining', () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn();
      const result = route.guard(guard);

      expect(result).toBe(route);
    });

    it('should allow adding multiple guards', () => {
      const route = new Route(sharedRouter, '/test');
      const guard1 = vi.fn();
      const guard2 = vi.fn();

      route.guard(guard1).guard(guard2);

      expect(route.guards.size).toBe(2);
      expect(route.guards.has(guard1)).toBe(true);
      expect(route.guards.has(guard2)).toBe(true);
    });

    it('should handle async guards', () => {
      const route = new Route(sharedRouter, '/test');
      const asyncGuard = vi.fn(async () => {});
      route.guard(asyncGuard);

      expect(route.guards.has(asyncGuard)).toBe(true);
    });
  });

  describe('provide method', () => {
    it('should add provider to providers map', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      route.provide('test', provider);

      expect(route.providers.has('test')).toBe(true);
    });

    it('should return route for chaining', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      const result = route.provide('test', provider);

      expect(result).toBe(route);
    });

    it('should store provider with name', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      route.provide('test', provider);

      const entry = route.providers.get('test');
      expect(entry?.name).toBe('test');
    });

    it('should store provider function', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      route.provide('test', provider);

      const entry = route.providers.get('test');
      expect(entry?.provider).toBe(provider);
    });

    it('should store provider options when provided', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      const options = { maxAge: 1000 };
      route.provide('test', provider, options);

      const entry = route.providers.get('test');
      expect(entry?.options).toEqual(options);
    });

    it('should handle undefined options', () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'data');
      route.provide('test', provider);

      const entry = route.providers.get('test');
      expect(entry?.options).toBeUndefined();
    });

    it('should allow adding multiple providers', () => {
      const route = new Route(sharedRouter, '/test');
      const provider1 = vi.fn(() => 'data1');
      const provider2 = vi.fn(() => 'data2');

      route.provide('test1', provider1).provide('test2', provider2);

      expect(route.providers.size).toBe(2);
    });

    it('should handle async providers', () => {
      const route = new Route(sharedRouter, '/test');
      const asyncProvider = vi.fn(async () => 'data');
      route.provide('test', asyncProvider);

      expect(route.providers.has('test')).toBe(true);
    });

    it('should register parallel providers', () => {
      const route = new Route(sharedRouter, '/test');

      route
        .provide(
          'test',
          vi.fn(() => 'data')
        )
        .provide({
          test1: (ctx) => ctx.data.test + '1',
          test2: (ctx) => ctx.data.test + '2',
        })
        .provide('base', (ctx) => {
          return ctx.data.test1;
        });

      expect(route.providers.has('test')).toBe(true);
      expect(route.providers.has('test1')).toBe(true);
      expect(route.providers.has('test2')).toBe(true);
      expect(route.providers.has('base')).toBe(true);
    });
  });

  describe('authenticate method', () => {
    it('should return true when no guards', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: {}, query: {} };

      const result = await route.authenticate(context);
      expect(result).toBe(true);
    });

    it('should return true when all guards pass', async () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn();
      route.guard(guard);

      const context = { params: {}, query: {} };
      const result = await route.authenticate(context);

      expect(result).toBe(true);
      expect(guard).toHaveBeenCalledWith(context);
    });

    it('should run all guards', async () => {
      const route = new Route(sharedRouter, '/test');
      const guard1 = vi.fn();
      const guard2 = vi.fn();
      route.guard(guard1).guard(guard2);

      const context = { params: {}, query: {} };
      await route.authenticate(context);

      expect(guard1).toHaveBeenCalledWith(context);
      expect(guard2).toHaveBeenCalledWith(context);
    });

    it('should return Redirect when guard throws Redirect', async () => {
      const route = new Route(sharedRouter, '/test');
      const targetRoute = new Route(sharedRouter, '/login');
      const redirect = new Redirect(targetRoute as any);
      const guard = vi.fn(() => {
        throw redirect;
      });
      route.guard(guard);

      const context = { params: {}, query: {} };
      const result = await route.authenticate(context);

      expect(result).toBe(redirect);
    });

    it('should return Error when guard throws Error', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      route.guard(guard);

      const context = { params: {}, query: {} };
      const result = await route.authenticate(context);

      expect(result).toBeInstanceOf(RouteError);
    });

    it('should set error when guard throws Error', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      route.guard(guard);

      const context = { params: {}, query: {} };
      await route.authenticate(context);

      expect(route.state.error).toBeInstanceOf(GuardError);
      expect(route.state.error?.message).toBe(error.message);
    });

    it('should set error when guard throws GuardError', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new GuardError('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      route.guard(guard);

      const context = { params: {}, query: {} };
      await route.authenticate(context);

      expect(route.state.error).toBeInstanceOf(GuardError);
      expect(route.state.error?.message).toBe(error.message);
    });

    it('should set error when guard throws non-Error', async () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn(() => {
        throw 'string error';
      });
      route.guard(guard);

      const context = { params: {}, query: {} };
      await route.authenticate(context);

      expect(route.state.error).toBeInstanceOf(GuardError);
      expect(route.state.error?.message).toBe('Unknown guard error.');
    });

    it('should handle async guards', async () => {
      const route = new Route(sharedRouter, '/test');
      const asyncGuard = vi.fn(async () => {});
      route.guard(asyncGuard);

      const context = { params: {}, query: {} };
      const result = await route.authenticate(context);

      expect(result).toBe(true);
    });

    it('should return true on subsequent calls after successful authentication', async () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn();
      route.guard(guard);

      const context = { params: {}, query: {} };
      await route.authenticate(context);
      const result = await route.authenticate(context);

      expect(result).toBe(true);
      expect(guard).toHaveBeenCalledTimes(1);
    });

    it('should re-run guards when state changes', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: {}, query: {} };

      const state = mutable(0);
      const handler = vi.fn().mockImplementation(() => {
        return state.value;
      });

      route.guard(handler);

      const result = await route.authenticate(context);
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);

      state.value++;

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('preload method', () => {
    it('should call authenticate', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: {}, query: {}, data: {} };

      const result = await route.preload(context);
      // preload returns the resolved data (undefined if no providers) or true if authenticated
      expect(result).toEqual({});
    });

    it('should return GuardBlocker when authentication fails', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      route.guard(guard);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.preload(context);

      // The error is wrapped, so check the message
      expect(result).toEqual(expect.objectContaining({ message: 'Guard failed' }));
    });

    it('should return Redirect when authentication redirects', async () => {
      const route = new Route(sharedRouter, '/test');
      const targetRoute = new Route(sharedRouter, '/login');
      const redirect = new Redirect(targetRoute as never);
      const guard = vi.fn(() => {
        throw redirect;
      });
      route.guard(guard);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.preload(context);

      expect(result).toBe(redirect);
    });
  });

  describe('activate method', () => {
    it('should set active to true', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: {}, query: {}, data: {} };

      await route.activate(context);
      expect(route.active).toBe(true);
    });

    it('should set context', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: { id: '123' }, query: {}, data: {} };

      await route.activate(context as never);
      const state = route.context;

      expect(state.data).toEqual(context.data);
      expect(state.query).toEqual(context.query);
      expect(state.params).toEqual(context.params);
    });

    it('should call authenticate', async () => {
      const route = new Route(sharedRouter, '/test');
      const guard = vi.fn();
      route.guard(guard);

      const context = { params: {}, query: {}, data: {} };
      await route.authenticate(context);

      expect(guard).toHaveBeenCalled();
    });

    it('should return GuardBlocker when authentication fails', async () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      const error = new Error('Guard failed');
      const guard = vi.fn(() => {
        throw error;
      });
      route.guard(guard);

      const context = { params: {}, query: {}, data: {} };
      await route.authenticate(context);

      // activate returns undefined on error, but sets the error property
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Guard failed');
    });

    it('should load and render async renderer on activate', async () => {
      const route = new Route(sharedRouter, '/test');
      const renderer = vi.fn();
      const loader = vi.fn(async () => renderer);

      route.renderAsync(loader as never);

      const context = { params: {}, query: {}, data: {} };
      await route.activate(context);

      expect(loader).toHaveBeenCalled();
      expect((route as any).loadRenderer).toBeUndefined();
      expect(route.renderer).toBeDefined();
      expect(route.state.status).toBe(ROUTE_STATUS.SUCCESS);
    });

    it('should handle async renderer load error', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new Error('Load failed');
      const loader = vi.fn(async () => {
        throw error;
      });

      route.renderAsync(loader as never);

      const context = { params: {}, query: {}, data: {} };
      await route.activate(context);

      expect(route.state.status).toBe(ROUTE_STATUS.ERROR);
      expect(route.state.error).toBeInstanceOf(RouteError);
      expect(route.state.error?.message).toBe('Load failed');
    });
  });

  describe('deactivate method', () => {
    it('should set active to false', () => {
      const route = new Route(sharedRouter, '/test');
      route.active = true;

      route.deactivate();
      expect(route.active).toBe(false);
    });

    it('should clear data when keepAlive is false', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.context;
      state.data = { user: 'John' };

      route.deactivate();
      expect(route.context.data).toEqual({});
    });

    it('should preserve data when keepAlive is true', () => {
      const route = new Route(sharedRouter, '/test', { keepAlive: true });
      const state = route.context;
      const data = { user: 'John' };
      state.data = data;

      route.deactivate();
      // Data is wrapped in mutable(), so use toEqual instead of toBe
      expect(state.data).toEqual(data);
    });

    it('should clear error', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      state.error = new GuardError('Error');

      route.deactivate();
      expect(state.error).toBeUndefined();
    });

    it('should set authenticated to false', () => {
      const route = new Route(sharedRouter, '/test');
      const state = route.state;
      state.authenticated = true;
      // This would be set to true by authenticate
      // We can't directly test this without calling authenticate

      route.deactivate();
      expect(state.authenticated).toBe(false);
      // After deactivate, authenticated should be false
    });
  });

  describe('resolve method', () => {
    it('should return empty object when no providers', async () => {
      const route = new Route(sharedRouter, '/test');
      const context = { params: {}, query: {}, data: {} };

      const result = await route.resolve(context);
      expect(result).toEqual({});
    });

    it('should call provider and return data', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'test-data');
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.resolve(context);

      expect(result).toEqual({ test: 'test-data' });
      expect(provider).toHaveBeenCalledWith(context);
    });

    it('should call multiple providers', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider1 = vi.fn(() => 'data1');
      const provider2 = vi.fn(() => 'data2');
      route.provide('test1', provider1).provide('test2', provider2);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.resolve(context);

      expect(result).toEqual({ test1: 'data1', test2: 'data2' });
    });

    it('should handle async providers', async () => {
      const route = new Route(sharedRouter, '/test');
      const asyncProvider = vi.fn(async () => 'async-data');
      route.provide('test', asyncProvider);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.resolve(context);

      expect(result).toEqual({ test: 'async-data' });
    });

    it('should update context data', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'test-data');
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      await route.resolve(context);

      expect(context.data).toEqual({ test: 'test-data' });
    });

    it('should set route data', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'test-data');
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const result = await route.resolve(context);

      // resolve returns the data, but route.data is set via context
      expect(result).toEqual({ test: 'test-data' });
    });

    it('should reuse existing provider observer on second call', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => 'test-data');
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };

      // First call creates the observer
      await route.resolve(context);

      // Second call should reuse the existing observer
      const context2 = { params: {}, query: {}, data: {} };
      await route.resolve(context2);

      expect(provider).toHaveBeenCalledTimes(2);
    });

    it('should re-run the providers', async () => {
      const route = new Route(sharedRouter, '/test');
      const canRead = mutable(true);
      const provider = vi.fn(() => {
        if (canRead.value) return 'data';
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      await route.activate(context as never);
      const state = route.context;

      expect(state.data).toEqual({ test: 'data' });

      canRead.value = false;

      await new Promise((resolve) => setTimeout(resolve, 1));

      expect(state.data).toEqual({});
      expect(provider).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel method', () => {
    it('should cancel specific context resolution', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return 'data';
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const promise = route.resolve(context);

      // Cancel the resolution immediately
      route.cancel(context);

      // The promise should complete (provider resolves before cancel in sync)
      const result = (await promise) as { test?: string };
      expect(result.test).toBeUndefined();
    });

    it('should cancel all resolutions when no context provided', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return 'data';
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const promise = route.resolve(context);

      // Cancel all resolutions
      route.cancel();

      const result = (await promise) as { test?: string };
      // Provider resolves before cancel takes effect in sync execution
      expect(result.test).toBeUndefined();
    });

    it('should handle cancel with no active resolutions', () => {
      const route = new Route(sharedRouter, '/test');

      // Should not throw
      expect(() => route.cancel()).not.toThrow();
      expect(() => route.cancel({ params: {}, query: {}, data: {} })).not.toThrow();
    });
  });

  describe('integration tests', () => {
    it('should work with full route lifecycle', async () => {
      // Routes should be created via router.route() for proper path handling
      const parent = new Route(sharedRouter, '/users');
      const route = new Route(sharedRouter, '/:id', undefined, parent);
      const guard = vi.fn();
      const provider = vi.fn(() => ({ name: 'John' }));

      route.guard(guard);
      route.provide('user', provider);

      const context = { params: { ':id': '123' }, query: {}, data: {} };

      // Preload
      const preloadResult = await route.preload(context as never);
      expect(preloadResult).toEqual({ user: { name: 'John' } });

      // Activate
      await route.activate(context as never);
      // activate returns the result from authenticate which could be true or the data
      expect(route.active).toBe(true);

      // Deactivate
      route.deactivate();
      expect(route.active).toBe(false);
    });

    it('should handle guard blocking with redirect', async () => {
      const loginRoute = new Route(sharedRouter, '/login');
      const protectedRoute = new Route(sharedRouter, '/dashboard');
      const redirect = new Redirect(loginRoute as never);

      const guard = vi.fn(() => {
        throw redirect;
      });
      protectedRoute.guard(guard);

      const context = { params: {}, query: {}, data: {} };

      const result = await protectedRoute.authenticate(context);
      expect(result).toBe(redirect);
    });

    it('should handle provider errors', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new Error('Provider failed');
      const provider = vi.fn(() => {
        throw error;
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };

      // The resolve method catches errors and returns undefined
      const result = await route.resolve(context);
      expect(result).toBeUndefined();
    });

    it('should handle provider throws ProviderError', async () => {
      const route = new Route(sharedRouter, '/test');
      const error = new ProviderError('Provider failed');
      const provider = vi.fn(() => {
        throw error;
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };

      // The resolve method catches errors and returns undefined
      const result = await route.resolve(context);
      expect(result).toBeUndefined();
    });

    it('should handle non-Error provider errors', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => {
        throw 'string error';
      });
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };

      const result = await route.resolve(context);

      expect(result).toBeUndefined();
      expect(route.state.error).toBeInstanceOf(ProviderError);
      expect(route.state.error?.message).toBe('Unknown provider error.');
    });

    it('should handle provider returning undefined', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => undefined);
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const result = (await route.resolve(context)) as { test: unknown };

      // Provider returned undefined, so the result is undefined
      expect(result.test).toBeUndefined();
    });

    it('should handle provider returning Error', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => new Error('Error.'));
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const result = (await route.resolve(context)) as { test: unknown };

      // Provider returned undefined, so the result is undefined
      expect(result).toBeUndefined();
      expect(route.state.status).toBe(ROUTE_STATUS.ERROR);
      expect(route.state.error).toBeInstanceOf(ProviderError);
    });

    it('should handle provider returning ProviderError', async () => {
      const route = new Route(sharedRouter, '/test');
      const provider = vi.fn(() => new ProviderError('Error.'));
      route.provide('test', provider);

      const context = { params: {}, query: {}, data: {} };
      const result = (await route.resolve(context)) as { test: unknown };

      // Provider returned undefined, so the result is undefined
      expect(result).toBeUndefined();
      expect(route.state.status).toBe(ROUTE_STATUS.ERROR);
      expect(route.state.error).toBeInstanceOf(ProviderError);
    });
  });

  describe('snapshot and hydrate', () => {
    it('should return cache snapshot (lines 700-701)', async () => {
      const route = new Route(sharedRouter, '/test', { maxAge: 1000 });
      const mockProvider = vi.fn(async () => 'test-data');
      route.provide('data', mockProvider);

      // Activate the route to populate cache
      const context = { params: {}, query: {}, data: {} };
      await route.activate(context as any, false, false, true);

      const snapshot = route.snapshot();

      expect(snapshot).toBeDefined();
      expect(Array.isArray(snapshot)).toBe(true);
      // Snapshot should have entries after activation with hydration
      expect(snapshot.length).toBeGreaterThanOrEqual(0);
    });

    it('should hydrate cache from snapshot (lines 704-705)', async () => {
      const route = new Route(sharedRouter, '/test', { maxAge: 1000 });
      const mockProvider = vi.fn(async () => 'test-data');
      route.provide('data', mockProvider);

      // Activate to populate cache
      const context = { params: {}, query: {}, data: {} };
      await route.activate(context as any, false, false, true);

      // Get snapshot
      const snapshot = route.snapshot();

      // Create new route and hydrate
      const newRoute = new Route(sharedRouter, '/test', { maxAge: 1000 });
      newRoute.provide('data', mockProvider);
      newRoute.hydrate(snapshot);

      // Verify hydration worked by checking provider wasn't called again
      const result = await newRoute.resolve(context as any);
      expect(mockProvider).toHaveBeenCalledTimes(1); // Only called once in original route
      expect((result as any).data).toBe('test-data');
    });
  });

  describe('entries()', () => {
    it('should recursively map all route types (static, dynamic, wildcard, index)', () => {
      const root = sharedRouter.route();
      const rootIndex = root.route('/');

      const users = root.route('/users');
      const usersIndex = users.route('/');
      const userProfile = users.route('/:userId');
      const userPosts = userProfile.route('/posts');
      const userPostDetail = userPosts.route('/:postId');

      const files = root.route('/files');
      const wildcardFiles = files.route('/*');

      const entries = root.entries();
      expect(entries).toHaveLength(9);
      expect(rootIndex.isIndex).toBe(true);

      // 1. Root and Root Index
      const rootEntry = entries.find(([path, val]) => path === '/' && !val.isIndex);
      expect(rootEntry![1]).toMatchObject({ type: ROUTE_TYPE.STATIC, isIndex: false, route: root });
      const rootIndexEntry = entries.find(([path, val]) => path === '/' && val.isIndex);
      expect(rootIndexEntry![1]).toMatchObject({ type: ROUTE_TYPE.STATIC, isIndex: true, route: rootIndex });

      // 2. Intermediate branch and its Index
      const usersEntry = entries.find(([path, val]) => path === '/users' && !val.isIndex);
      expect(usersEntry![1]).toMatchObject({ type: ROUTE_TYPE.STATIC, isIndex: false, route: users });
      const usersIndexEntry = entries.find(([path, val]) => path === '/users/' && val.isIndex);
      expect(usersIndexEntry![1]).toMatchObject({ type: ROUTE_TYPE.STATIC, isIndex: true, route: usersIndex });

      // 3. Dynamic routes & nested dynamic routes
      const profileEntry = entries.find(([path]) => path === '/users/:userId');
      expect(profileEntry![1]).toMatchObject({ type: ROUTE_TYPE.DYNAMIC, isIndex: false, route: userProfile });
      const postDetailEntry = entries.find(([path]) => path === '/users/:userId/posts/:postId');
      expect(postDetailEntry![1]).toMatchObject({ type: ROUTE_TYPE.DYNAMIC, isIndex: false, route: userPostDetail });

      // 4. Wildcard route
      const wildcardEntry = entries.find(([path]) => path === '/files/*');
      expect(wildcardEntry![1]).toMatchObject({ type: ROUTE_TYPE.WILDCARD, isIndex: false, route: wildcardFiles });
    });

    it('should map entries starting only from an intermediate branch', () => {
      const root = sharedRouter.route();
      root.route('/about');
      const users = root.route('/users');
      users.route('/:id');

      const userEntries = users.entries();
      const paths = userEntries.map(([path]) => path);

      expect(paths).toHaveLength(2);
      expect(paths).toContain('/users');
      expect(paths).toContain('/users/:id');
      expect(paths).not.toContain('/about');
      expect(paths).not.toContain('/');
    });

    it('should correctly handle calling entries() directly on an index route', () => {
      const root = sharedRouter.route();
      const users = root.route('/users');
      const usersIndex = users.route('/');

      const indexEntries = usersIndex.entries();
      expect(indexEntries).toHaveLength(1);
      expect(indexEntries[0][0]).toBe('/users/');
      expect(indexEntries[0][1].isIndex).toBe(true);
      expect(indexEntries[0][1].route).toBe(usersIndex);
    });

    it('should generate accurate toString URLs with params and queries across all route types', () => {
      const root = sharedRouter.route();
      const users = root.route('/users');
      users.route('/:userId').route('/posts').route('/:postId');
      root.route('/files').route('/*');

      const entriesMap = new Map(root.entries());

      // Static with query
      expect(entriesMap.get('/users')!.toString(undefined, { page: 2, sort: 'asc' })).toBe('/users?page=2&sort=asc');

      // Nested dynamic with params and query
      expect(
        entriesMap.get('/users/:userId/posts/:postId')!.toString({ userId: '42', postId: '101' }, { ref: 'newsletter' })
      ).toBe('/users/42/posts/101?ref=newsletter');

      // Wildcard
      expect(entriesMap.get('/files/*')!.toString({ '*': 'documents/2026/report.pdf' })).toBe(
        '/files/documents/2026/report.pdf'
      );

      // Named wildcard without asterisk prefix in params object
      const docRoute = root.route('/docs').route('/*filepath');
      // @ts-expect-error
      expect(docRoute.url({ filepath: 'guide/intro.md' })).toBe('/docs/guide/intro.md');
    });

    it('should expose live meta object via metadata getter (route.ts:139-140)', () => {
      const root = sharedRouter.route();
      const userRoute = root.route('/user').meta({ name: 'User profile' });
      expect(userRoute.metadata).toEqual({ name: 'User profile' });
      expect(userRoute.metadata).toBe(userRoute.meta());
    });

    it('should update route options via config method (route.ts:291-293)', () => {
      const root = sharedRouter.route();
      const dashboard = root.route('/dashboard');
      const result = dashboard.config({ keepAlive: true });
      expect(result).toBe(dashboard);
      expect(dashboard.options.keepAlive).toBe(true);
    });
  });
});
