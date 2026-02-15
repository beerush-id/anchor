import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configure, DEFAULT_CONFIG, DYNAMIC_ROUTE_KEY, ROUTE_MAP_LINK, WILDCARD_ROUTE_KEY } from '../src/constant.js';
import type { UnknownRoute } from '../src/index.js';
import { RouteRegistry } from '../src/registry.js';
import { Route } from '../src/route.js';

describe('constant.ts', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have default baseUrl', () => {
      expect(DEFAULT_CONFIG.baseUrl).toBe('http://localhost');
    });

    it('should have default maxAge of 0', () => {
      expect(DEFAULT_CONFIG.maxAge).toBe(0);
    });

    it('should have default keepAlive of false', () => {
      expect(DEFAULT_CONFIG.keepAlive).toBe(false);
    });

    it('should have default retryMode of linear', () => {
      expect(DEFAULT_CONFIG.retryMode).toBe('linear');
    });

    it('should have default retryDelay of 0', () => {
      expect(DEFAULT_CONFIG.retryDelay).toBe(0);
    });

    it('should have default maxRetries of 0', () => {
      expect(DEFAULT_CONFIG.maxRetries).toBe(0);
    });
  });

  describe('configure', () => {
    let originalConfig: typeof DEFAULT_CONFIG;

    beforeEach(() => {
      // Store original config values
      originalConfig = { ...DEFAULT_CONFIG };
    });

    afterEach(() => {
      // Restore original config values
      Object.assign(DEFAULT_CONFIG, originalConfig);
    });

    it('should update baseUrl', () => {
      configure({ baseUrl: 'https://example.com' });
      expect(DEFAULT_CONFIG.baseUrl).toBe('https://example.com');
    });

    it('should update maxAge', () => {
      configure({ maxAge: 60000 });
      expect(DEFAULT_CONFIG.maxAge).toBe(60000);
    });

    it('should update keepAlive', () => {
      configure({ keepAlive: true });
      expect(DEFAULT_CONFIG.keepAlive).toBe(true);
    });

    it('should update retryMode', () => {
      configure({ retryMode: 'exponential' });
      expect(DEFAULT_CONFIG.retryMode).toBe('exponential');
    });

    it('should update retryDelay', () => {
      configure({ retryDelay: 1000 });
      expect(DEFAULT_CONFIG.retryDelay).toBe(1000);
    });

    it('should update maxRetries', () => {
      configure({ maxRetries: 3 });
      expect(DEFAULT_CONFIG.maxRetries).toBe(3);
    });

    it('should update multiple options at once', () => {
      configure({
        baseUrl: 'https://api.example.com',
        maxAge: 300000,
        keepAlive: true,
        retryMode: 'exponential',
        retryDelay: 1000,
        maxRetries: 3,
      });

      expect(DEFAULT_CONFIG.baseUrl).toBe('https://api.example.com');
      expect(DEFAULT_CONFIG.maxAge).toBe(300000);
      expect(DEFAULT_CONFIG.keepAlive).toBe(true);
      expect(DEFAULT_CONFIG.retryMode).toBe('exponential');
      expect(DEFAULT_CONFIG.retryDelay).toBe(1000);
      expect(DEFAULT_CONFIG.maxRetries).toBe(3);
    });

    it('should merge with existing config', () => {
      configure({ baseUrl: 'https://example.com' });
      configure({ maxAge: 60000 });

      expect(DEFAULT_CONFIG.baseUrl).toBe('https://example.com');
      expect(DEFAULT_CONFIG.maxAge).toBe(60000);
      expect(DEFAULT_CONFIG.keepAlive).toBe(false);
    });

    it('should handle empty config object', () => {
      const beforeConfig = { ...DEFAULT_CONFIG };
      configure({});
      expect(DEFAULT_CONFIG).toEqual(beforeConfig);
    });

    it('should handle partial config with undefined values', () => {
      configure({ baseUrl: 'https://example.com' });
      configure({ maxAge: undefined as never });

      expect(DEFAULT_CONFIG.baseUrl).toBe('https://example.com');
    });

    it('should allow updating to zero values', () => {
      configure({ maxAge: 1000 });
      expect(DEFAULT_CONFIG.maxAge).toBe(1000);

      configure({ maxAge: 0 });
      expect(DEFAULT_CONFIG.maxAge).toBe(0);
    });

    it('should allow updating to false values', () => {
      configure({ keepAlive: true });
      expect(DEFAULT_CONFIG.keepAlive).toBe(true);

      configure({ keepAlive: false });
      expect(DEFAULT_CONFIG.keepAlive).toBe(false);
    });

    it('should handle string baseUrl with trailing slash', () => {
      configure({ baseUrl: 'https://example.com/' });
      expect(DEFAULT_CONFIG.baseUrl).toBe('https://example.com/');
    });

    it('should handle string baseUrl without protocol', () => {
      configure({ baseUrl: 'example.com' });
      expect(DEFAULT_CONFIG.baseUrl).toBe('example.com');
    });

    it('should handle negative maxAge', () => {
      configure({ maxAge: -1000 });
      expect(DEFAULT_CONFIG.maxAge).toBe(-1000);
    });

    it('should handle large maxAge values', () => {
      configure({ maxAge: Number.MAX_SAFE_INTEGER });
      expect(DEFAULT_CONFIG.maxAge).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative retryDelay', () => {
      configure({ retryDelay: -500 });
      expect(DEFAULT_CONFIG.retryDelay).toBe(-500);
    });

    it('should handle negative maxRetries', () => {
      configure({ maxRetries: -1 });
      expect(DEFAULT_CONFIG.maxRetries).toBe(-1);
    });

    it('should handle large maxRetries values', () => {
      configure({ maxRetries: 100 });
      expect(DEFAULT_CONFIG.maxRetries).toBe(100);
    });
  });

  describe('DYNAMIC_ROUTE_KEY', () => {
    it('should be a Symbol', () => {
      expect(typeof DYNAMIC_ROUTE_KEY).toBe('symbol');
    });

    it('should have description "dynamic"', () => {
      expect(DYNAMIC_ROUTE_KEY.description).toBe('dynamic');
    });

    it('should be unique', () => {
      const symbol1 = Symbol('dynamic');
      const symbol2 = Symbol('dynamic');
      expect(symbol1).not.toBe(symbol2);
      expect(DYNAMIC_ROUTE_KEY).not.toBe(symbol1);
    });

    it('should be usable as a Map key', () => {
      const map = new Map();
      map.set(DYNAMIC_ROUTE_KEY, 'dynamic-route');
      expect(map.get(DYNAMIC_ROUTE_KEY)).toBe('dynamic-route');
    });
  });

  describe('WILDCARD_ROUTE_KEY', () => {
    it('should be a Symbol', () => {
      expect(typeof WILDCARD_ROUTE_KEY).toBe('symbol');
    });

    it('should have description "wildcard"', () => {
      expect(WILDCARD_ROUTE_KEY.description).toBe('wildcard');
    });

    it('should be unique', () => {
      const symbol1 = Symbol('wildcard');
      const symbol2 = Symbol('wildcard');
      expect(symbol1).not.toBe(symbol2);
      expect(WILDCARD_ROUTE_KEY).not.toBe(symbol1);
    });

    it('should be different from DYNAMIC_ROUTE_KEY', () => {
      expect(DYNAMIC_ROUTE_KEY).not.toBe(WILDCARD_ROUTE_KEY);
    });

    it('should be usable as a Map key', () => {
      const map = new Map();
      map.set(WILDCARD_ROUTE_KEY, 'wildcard-route');
      expect(map.get(WILDCARD_ROUTE_KEY)).toBe('wildcard-route');
    });
  });

  describe('ROUTE_MAP_LINK', () => {
    it('should be a WeakMap', () => {
      expect(ROUTE_MAP_LINK).toBeInstanceOf(WeakMap);
    });

    it('should link routes to their registries', () => {
      const route = new Route('/test');
      const registry = new RouteRegistry(route as UnknownRoute);

      expect(ROUTE_MAP_LINK.get(route)).toBe(registry);
    });

    it('should allow getting registry for a route', () => {
      const route = new Route('/test');
      const registry = new RouteRegistry(route as UnknownRoute);

      const retrievedRegistry = ROUTE_MAP_LINK.get(route);
      expect(retrievedRegistry).toBe(registry);
    });

    it('should return undefined for route without registry', () => {
      const route = new Route('/test');
      expect(ROUTE_MAP_LINK.get(route)).toBeUndefined();
    });

    it('should allow deleting route-registry link', () => {
      const route = new Route('/test');
      new RouteRegistry(route as UnknownRoute);

      ROUTE_MAP_LINK.delete(route);
      expect(ROUTE_MAP_LINK.get(route)).toBeUndefined();
    });

    it('should handle multiple routes', () => {
      const route1 = new Route('/test1');
      const route2 = new Route('/test2');
      const registry1 = new RouteRegistry(route1 as UnknownRoute);
      const registry2 = new RouteRegistry(route2 as UnknownRoute);

      expect(ROUTE_MAP_LINK.get(route1)).toBe(registry1);
      expect(ROUTE_MAP_LINK.get(route2)).toBe(registry2);
    });

    it('should not prevent garbage collection of routes', () => {
      // WeakMap allows garbage collection of keys
      const route = new Route('/test');
      new RouteRegistry(route as UnknownRoute);

      // The route can be garbage collected when no longer referenced
      // This is a property of WeakMap that we can't directly test,
      // but we can verify the WeakMap behavior
      expect(ROUTE_MAP_LINK.has(route)).toBe(true);
    });

    it('should allow checking if route has registry', () => {
      const route = new Route('/test');
      expect(ROUTE_MAP_LINK.has(route)).toBe(false);

      new RouteRegistry(route as UnknownRoute);
      expect(ROUTE_MAP_LINK.has(route)).toBe(true);
    });
  });

  describe('constant interactions', () => {
    let originalConfig: typeof DEFAULT_CONFIG;

    beforeEach(() => {
      originalConfig = { ...DEFAULT_CONFIG };
    });

    afterEach(() => {
      Object.assign(DEFAULT_CONFIG, originalConfig);
    });

    it('should work with Route using configured options', () => {
      configure({ maxAge: 5000, keepAlive: true });

      const route = new Route('/test', { maxAge: 1000 });
      expect(route.options?.maxAge).toBe(1000);
      expect(route.options?.keepAlive).toBe(true);
    });

    it('should use DEFAULT_CONFIG when route options not provided', () => {
      configure({ maxAge: 5000 });

      const route = new Route('/test');
      expect(route.options?.maxAge).toBe(5000);
    });

    it('should allow route options to override DEFAULT_CONFIG', () => {
      configure({ maxAge: 5000, retryDelay: 1000 });

      const route = new Route('/test', { maxAge: 1000 });
      expect(route.options?.maxAge).toBe(1000);
      expect(route.options?.retryDelay).toBe(1000);
    });
  });
});
