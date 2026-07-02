import '@irpclib/irpc/server';
import { createPackage } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ENDPOINT, HTTPTransport } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

describe('HTTPRouter Constructor & Use', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create router with module and transport', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      module.use(transport);

      const router = new HTTPRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.hooks).toEqual([]);
      expect(router.config.endpoint).toBe(DEFAULT_ENDPOINT);
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const customResolver = vi.fn();

      const router = new HTTPRouter(module, transport, {
        endpoint: '/custom',
        resolver: customResolver,
      });

      expect(router.config.endpoint).toBe('/custom');
      expect(router.config.resolver).toBe(customResolver);
    });
  });

  describe('use', () => {
    it('should add middleware', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const middleware = vi.fn();

      const result = router.use(middleware);

      expect(router.hooks).toContain(middleware);
      expect(result).toBe(router); // Should return self for chaining
    });
  });
});
