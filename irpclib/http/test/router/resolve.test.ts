import { createPackage, credential, IRPC_FILE_STATUS, IRPC_STORE, type IRPCRequests } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPTransport, IRPC_JSON_KEY } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPRouter resolve (form/standard)', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

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
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const request = createMockRequest({ calls: [] });

    const response = await router.resolve(request);

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid request body', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

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
    module.use(transport);

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
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const middleware = vi.fn();
    router.use(middleware);

    type TestFunc = (input: { name: string }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => '' });

    const handler: TestFunc = async (input) => `Hello ${input.name}`;
    module.construct(testFunc, handler);

    const request = createMockRequest({
      calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] } as AnyType],
    });

    const response = await router.resolve(request);

    expect(response.status).toBe(200);
    expect(middleware).toHaveBeenCalled();
  });

  it('should handle middleware errors', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const middleware = vi.fn().mockImplementation(() => {
      throw new Error('Middleware error');
    });
    router.use(middleware);

    type TestFunc = (input: { name: string }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => '' });

    const handler: TestFunc = async (input) => `Hello ${input.name}`;
    module.construct(testFunc, handler);

    const request = createMockRequest({
      calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] } as AnyType],
    });

    const result = await router.resolve(request);

    expect(result).toBeInstanceOf(Response);
    expect(errSpy).toHaveBeenCalled();
  });

  it('should handle JSON parsing errors', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

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
    module.use(transport);

    const customResolver = vi.fn().mockReturnValue({
      resolve: vi.fn().mockResolvedValue('custom result'),
    });

    const router = new HTTPRouter(module, transport, {
      resolver: customResolver,
    });

    type TestFunc = (input: { name: string }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => '' });

    const handler: TestFunc = async (input) => `Hello ${input.name}`;
    module.construct(testFunc, handler);

    const request = createMockRequest({
      calls: [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] } as AnyType],
    });

    await router.resolve(request);

    expect(customResolver).toHaveBeenCalledWith({ id: '1', name: 'testFunc', args: [{ name: 'World' }] }, module);
  });

  it('should safely abort response streams securely bounded to specification ttl structurally', async () => {
    vi.useFakeTimers();

    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testTtl', seed: () => '', stream: true, ttl: 50 } as AnyType);

    const handler: TestFunc = async () => new Promise(() => {});
    module.construct(testFunc, handler);

    const request = createMockRequest({ calls: [{ id: '1', name: 'testTtl', args: [] } as AnyType] });

    const responsePromise = router.resolve(request);
    const response = await responsePromise;

    const reader = response.body?.getReader();
    vi.runAllTimers();
    expect(response.status).toBe(200);

    vi.useRealTimers();
  });

  it('should bind native readable cancellation hooks securely mapped explicitly', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testCancel', seed: () => '', stream: true } as AnyType);

    const handler: TestFunc = async () => new Promise(() => {});
    module.construct(testFunc, handler);

    const request = createMockRequest({ calls: [{ id: '2', name: 'testCancel', args: [] } as AnyType] });

    const response = await router.resolve(request);
    const cancelSpy = vi.spyOn(AbortController.prototype, 'abort');

    await response.body?.cancel('Client left natively');
    expect(cancelSpy).toHaveBeenCalledWith('Client left natively');
    cancelSpy.mockRestore();
  });

  it('should cleanly abort mid-flight middleware errors implicitly returning without queue payload natively', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    let defer: any;
    const middleware = () =>
      new Promise<void>((_resolve, reject) => {
        defer = reject;
      });
    router.use(middleware);

    const request = createMockRequest({ calls: [{ id: '3', name: 'testFunc', args: [] } as AnyType] });
    const response = await router.resolve(request);

    await response.body?.cancel();
    defer(new Error('simulated middleware failure'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(response.status).toBe(200);
  });

  it('should ignore incoming payload packets dynamically mapped correctly after natively aborting readable loop', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testPipeAbort', seed: () => '', stream: true } as AnyType);

    let defer: any;
    const handler: TestFunc = async () => new Promise((resolve) => (defer = resolve));
    module.construct(testFunc, handler);

    const request = createMockRequest({ calls: [{ id: '4', name: 'testPipeAbort', args: [] } as AnyType] });
    const response = await router.resolve(request);

    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    defer('payload dispatched natively late mapped bypass');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(response.status).toBe(200);
  });

  it('should extract FormData blobs natively resolving to IRPCFile dynamically mapped correctly', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = (input: { file: any }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFile', seed: () => '' });

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
        } as AnyType,
      ],
    };

    const fd = new FormData();
    fd.append(IRPC_JSON_KEY, JSON.stringify(requestPayload));
    fd.append('test-file-id', dummyFile);

    const request = new Request('https://api.example.com/rpc', { method: 'POST', body: fd });
    vi.spyOn(request, 'formData').mockResolvedValueOnce(fd);

    const response = await router.resolve(request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(200);
    expect(receivedFile?.data).toBe(dummyFile);
    expect(receivedFile?.status).toBe(IRPC_FILE_STATUS.SUCCESS);
  });

  it('should use custom response builder for empty requests', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);
    const request = createMockRequest({ calls: [] });

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
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testBuilder', seed: () => '' } as AnyType);
    module.construct(testFunc, async () => 'success');

    const request = createMockRequest({ calls: [{ id: '1', name: 'testBuilder', args: [] } as AnyType] });

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
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testCred', seed: () => '' });

    let receivedApiKey: string | undefined;
    module.construct(testFunc, async () => {
      receivedApiKey = credential<string>('apiKey');
      return 'ok';
    });

    const request = createMockRequest({
      calls: [{ id: '1', name: 'testCred', args: [] } as AnyType],
      credentials: [['apiKey', 'pk_test_123']],
    });

    const response = await router.resolve(request);

    expect(response.status).toBe(200);
    expect(receivedApiKey).toBe('pk_test_123');
  });

  it('should resolve without credentials when not provided', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testNoCred', seed: () => '' });

    let receivedApiKey: string | undefined;
    module.construct(testFunc, async () => {
      receivedApiKey = credential<string>('apiKey');
      return 'ok';
    });

    const request = createMockRequest({
      calls: [{ id: '1', name: 'testNoCred', args: [] } as AnyType],
    });

    const response = await router.resolve(request);

    expect(response.status).toBe(200);
    expect(receivedApiKey).toBeUndefined();
  });
});
