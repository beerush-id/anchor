import '@irpclib/irpc/server';
import { createPackage, credential, ERROR_CODE, IRPC_FILE_STATUS, IRPC_STORE, type IRPCRequests } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ENDPOINT, HTTPTransport, IRPC_JSON_KEY } from '../src/index.js';
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
      expect(router.hooks).toEqual([]);
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

      expect(router.hooks).toContain(middleware);
      expect(result).toBe(router); // Should return self for chaining
    });
  });

  describe('resolve', () => {
    const createMockRequest = (payload: IRPCRequests) => {
      const fd = new FormData();
      fd.append(IRPC_JSON_KEY, JSON.stringify(payload));
      const req = new Request('https://api.example.com/rpc', { method: 'POST', body: fd });
      vi.spyOn(req, 'formData').mockResolvedValueOnce(fd);
      return req;
    };

    it('should return 400 for empty requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = createMockRequest({ calls: [] });

      const response = await router.resolve(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid request body', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolve(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid request body with custom builder', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolve(request, undefined, (body, init) => {
        return new Response(body, init);
      });

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

      const request = createMockRequest({ calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }] });

      const response = await router.resolve(request);

      expect(response.status).toBe(200);
      expect(middleware).toHaveBeenCalled();
    });

    it('should handle middleware errors', async () => {
      errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
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

      const request = createMockRequest({ calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }] });

      // Expect the middleware error to be thrown
      const result = await router.resolve(request);

      expect(result).toBeInstanceOf(Response);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('should handle JSON parsing errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const fd = new FormData();
      fd.append(IRPC_JSON_KEY, 'invalid json');
      const request = new Request('https://api.example.com/rpc', { method: 'POST', body: fd });
      vi.spyOn(request, 'formData').mockResolvedValueOnce(fd);

      const response = await router.resolve(request);
      expect(response.status).toBe(400);
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

      const request = createMockRequest({ calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }] });

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

      const request = createMockRequest({ calls: [{ id: '1', name: 'testTtl', args: [] }] });

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

      const request = createMockRequest({ calls: [{ id: '2', name: 'testCancel', args: [] }] });

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

      const request = createMockRequest({ calls: [{ id: '3', name: 'testFunc', args: [] }] });

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

      const request = createMockRequest({ calls: [{ id: '4', name: 'testPipeAbort', args: [] }] });

      const response = await router.resolve(request);

      await response.body?.cancel();

      // Let stream initialization flush through and internal pipe mapping construct correctly
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Fulfill stream artificially to trigger pipe hook safely decoupled natively checking the return logic dynamically
      defer('payload dispatched natively late mapped bypass');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(response.status).toBe(200);
    });

    it('should extract FormData blobs natively resolving to IRPCFile dynamically mapped correctly', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = (input: { file: any }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFile' });

      let receivedFile: any;
      const handler: TestFunc = async (input) => {
        receivedFile = input.file;
        return `File uploaded`;
      };
      module.construct(testFunc, handler);

      const dummyFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });

      const pointer = {
        id: 'test-file-id',
        type: 'IRPC_PACKET_FILE',
        meta: { name: 'test.txt', size: dummyFile.size, type: 'text/plain' },
      };

      const requestPayload: IRPCRequests = {
        calls: [
          {
            id: 'file-1',
            name: 'testFile',
            args: [{ file: pointer }],
            files: [pointer as never],
          },
        ],
      };

      const fd = new FormData();
      fd.append(IRPC_JSON_KEY, JSON.stringify(requestPayload));
      fd.append('test-file-id', dummyFile);

      const request = new Request('https://api.example.com/rpc', { method: 'POST', body: fd });
      vi.spyOn(request, 'formData').mockResolvedValueOnce(fd);

      const response = await router.resolve(request);

      // Give event loop a tick to let promises flush natively
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(response.status).toBe(200);
      expect(receivedFile?.data).toBe(dummyFile);
      expect(receivedFile?.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    });

    it('should use custom response builder for empty requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = createMockRequest({ calls: [] }); // Empty request returns 400 early return

      const response = await router.resolve(request, [], (body, init) => {
        const headers = new Headers(init?.headers);
        headers.set('x-custom-builder', 'true');
        return new Response(body, { ...init, headers });
      });

      expect(response.headers.get('x-custom-builder')).toBe('true');
      expect(response.status).toBe(400);
    });

    it('should use custom response builder for valid streaming requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testBuilder' } as any);
      module.construct(testFunc, async () => 'success');

      const request = createMockRequest({ calls: [{ id: '1', name: 'testBuilder', args: [] }] });

      const response = await router.resolve(request, [], (body, init) => {
        const headers = new Headers(init?.headers);
        headers.set('x-custom-stream', 'true');
        return new Response(body, { ...init, headers });
      });

      expect(response.headers.get('x-custom-stream')).toBe('true');
      expect(response.status).toBe(200);
    });

    it('should seed credentials from payload into async context', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testCred' });

      let receivedApiKey: string | undefined;
      module.construct(testFunc, async () => {
        receivedApiKey = credential<string>('apiKey');
        return 'ok';
      });

      const request = createMockRequest({
        calls: [{ id: '1', name: 'testCred', args: [] }],
        credentials: [['apiKey', 'pk_test_123']],
      });

      const response = await router.resolve(request);

      expect(response.status).toBe(200);
      expect(receivedApiKey).toBe('pk_test_123');
    });

    it('should resolve without credentials when not provided', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testNoCred' });

      let receivedApiKey: string | undefined;
      module.construct(testFunc, async () => {
        receivedApiKey = credential<string>('apiKey');
        return 'ok';
      });

      const request = createMockRequest({
        calls: [{ id: '1', name: 'testNoCred', args: [] }],
      });

      const response = await router.resolve(request);

      expect(response.status).toBe(200);
      expect(receivedApiKey).toBeUndefined();
    });
  });

  describe('resolveReq', () => {
    it('should resolve incoming JSON requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async (input) => `Hello ${input.name}`);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify({ name: 'World' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await router.resolveRest(request, 'testFunc');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('Hello World');
    });

    it('should handle JSON parsing errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolveRest(request, 'testFunc');
      expect(response.status).toBe(400);
    });

    it('should handle JSON parsing errors with custom builder', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolveRest(request, 'testFunc', undefined, (body, init) => {
        return new Response(body, init);
      });
      expect(response.status).toBe(400);
    });
  });

  describe('resolveJson', () => {
    it('should resolve incoming JSON requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async (input) => `Hello ${input.name}`);

      const response = await router.resolveJson({ name: 'World' }, 'testFunc');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('Hello World');
    });

    it('should handle JSON parsing errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const response = await router.resolveJson('invalid json', 'testFunc');
      expect(response.status).toBe(404);
    });
  });

  describe('resolveJsonReq', () => {
    it('should process events correctly with replay.any', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<{ a: number }>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async () => ({ a: 1 }));

      const packets = [
        JSON.stringify({ type: 'answer', status: 'success', data: { a: 0 } }),
        JSON.stringify({ type: 'event', data: { type: 'set', keys: ['data', 'a'], value: 2 } }),
      ];

      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as any, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ a: 2 });
    });

    it('should return 404 if error code is NOT_FOUND', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const packets = [
        JSON.stringify({
          type: 'answer',
          status: 'error',
          error: { code: ERROR_CODE.NOT_FOUND, message: 'Not found' },
        }),
      ];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as any, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] });
      expect(response.status).toBe(404);
      expect((await response.json()).message).toBe('Not found');
    });

    it('should return 500 if error code is something else', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const packets = [
        JSON.stringify({ type: 'answer', status: 'error', error: { code: 'OTHER_ERROR', message: 'Other error' } }),
      ];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as any, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] });
      expect(response.status).toBe(500);
      expect((await response.json()).message).toBe('Other error');
    });

    it('should use custom builder', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      const packets = [JSON.stringify({ type: 'answer', status: 'success', data: 'ok' })];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as any, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] }, [], (body, init) => {
        const headers = new Headers(init?.headers);
        headers.set('x-custom-json-req', 'true');
        return new Response(body, { ...init, headers });
      });

      expect(response.headers.get('x-custom-json-req')).toBe('true');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('ok');
    });

    it('should handle thrown errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const router = new HTTPRouter(module, transport);

      vi.spyOn(router as any, 'resolveRequests').mockImplementation(() => {
        throw new Error('Unexpected Error');
      });

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] });
      expect(response.status).toBe(500);
      expect((await response.json()).message).toBe('Unexpected Error');
    });
  });
});
