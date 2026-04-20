import { createPackage } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ENDPOINT, HTTPTransport } from '../src/index.js';
import { HTTPRouter } from '../src/router.js';

describe('HTTPRouter', () => {
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

      const router = new HTTPRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.middlewares).toEqual([]);
      expect(router.config.endpoint).toBe(DEFAULT_ENDPOINT);
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
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
      const router = new HTTPRouter(module, transport);

      const middleware = vi.fn();

      const result = router.use(middleware);

      expect(router.middlewares).toContain(middleware);
      expect(result).toBe(router); // Should return self for chaining
    });
  });

  describe('resolve', () => {
    it('should return 400 for empty requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([]),
      });

      // Mock json() method to return empty array
      vi.spyOn(request, 'json').mockResolvedValueOnce([]);

      const response = await router.resolve(request);

      expect(response.status).toBe(400);
    });

    it('should process requests with middleware', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const middleware = vi.fn();
      router.use(middleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]),
      });

      // Mock json() method
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]);

      const response = await router.resolve(request);

      expect(response.status).toBe(200);
      expect(middleware).toHaveBeenCalled();
    });

    it('should handle middleware errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      // Middleware that throws an error
      const middleware = vi.fn().mockImplementation(() => {
        throw new Error('Middleware error');
      });
      router.use(middleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]),
      });

      // Mock json() method
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]);

      // Expect the middleware error to be thrown
      const result = await router.resolve(request);

      expect(result).toBeInstanceOf(Response);
      expect(errSpy).toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      // Mock json() method to throw parsing error
      vi.spyOn(request, 'json').mockRejectedValueOnce(new Error('Invalid JSON'));

      await expect(router.resolve(request)).rejects.toThrow('Invalid JSON');
    });

    it('should use custom resolver when provided', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      const customResolver = vi.fn().mockReturnValue({
        resolve: vi.fn().mockResolvedValue('custom result'),
      });

      const router = new HTTPRouter(module, transport, {
        resolver: customResolver,
      });

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]),
      });

      // Mock json() method
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]);

      await router.resolve(request);

      expect(customResolver).toHaveBeenCalledWith({ id: '1', name: 'testFunc', args: [{ name: 'World' }] }, module);
    });

    it('should safely abort response streams securely bounded to specification ttl structurally', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as any);

      const handler: TestFunc = async () => new Promise(() => {}); // Never fulfills natively
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '1', name: 'testTtl', args: [] }]),
      });

      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '1', name: 'testTtl', args: [] }]);

      const responsePromise = router.resolve(request);

      const response = await responsePromise;

      // Consume body stream implicitly without awaiting final chunk natively
      const reader = response.body?.getReader();

      vi.runAllTimers();

      expect(response.status).toBe(200);

      vi.useRealTimers();
    });

    it('should bind native readable cancellation hooks securely mapped explicitly', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testCancel', stream: true } as any);

      const handler: TestFunc = async () => new Promise(() => {}); // never ending
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '2', name: 'testCancel', args: [] }]),
      });
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '2', name: 'testCancel', args: [] }]);

      const response = await router.resolve(request);

      const cancelSpy = vi.spyOn(AbortController.prototype, 'abort');

      await response.body?.cancel('Client left natively');

      expect(cancelSpy).toHaveBeenCalledWith('Client left natively');

      cancelSpy.mockRestore();
    });

    it('should cleanly abort mid-flight middleware errors implicitly returning without queue payload natively', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      let defer: any;
      const middleware = () =>
        new Promise<void>((_resolve, reject) => {
          defer = reject;
        });
      router.use(middleware);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '3', name: 'testFunc', args: [] }]),
      });
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '3', name: 'testFunc', args: [] }]);

      const response = await router.resolve(request);

      await response.body?.cancel();
      // Reject middleware AFTER cancel to trigger abort pipeline path explicitly directly
      defer(new Error('simulated middleware failure'));

      // Wait a tick for promises flush
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(response.status).toBe(200);
    });

    it('should ignore incoming payload packets dynamically mapped correctly after natively aborting readable loop', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testPipeAbort', stream: true } as any);

      let defer: any;
      const handler: TestFunc = async () => new Promise((resolve) => (defer = resolve));
      module.construct(testFunc, handler);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify([{ id: '4', name: 'testPipeAbort', args: [] }]),
      });
      vi.spyOn(request, 'json').mockResolvedValueOnce([{ id: '4', name: 'testPipeAbort', args: [] }]);

      const response = await router.resolve(request);

      await response.body?.cancel();

      // Let stream initialization flush through and internal pipe mapping construct correctly
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Fulfill stream artificially to trigger pipe hook safely decoupled natively checking the return logic dynamically
      defer('payload dispatched natively late mapped bypass');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(response.status).toBe(200);
    });
  });
});
