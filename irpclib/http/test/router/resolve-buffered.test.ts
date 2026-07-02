import '@irpclib/irpc/server';
import { COOKIE_JAR_KEY, COOKIE_JAR_WRITABLE, cookies, getScope } from '@anchorlib/core';
import {
  createPackage,
  credential,
  IRPC_FILE_STATUS,
  IRPC_STORE,
  type IRPCRequests,
  type RemoteState,
  stream,
} from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IRPC_WEB_PATH } from '../../src/enum.js';
import { COOKIES_SYNC_KEY, HTTPTransport, IRPC_JSON_KEY } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPRouter resolveBuffered', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  const createBufferedRequest = (payload: IRPCRequests, cookie = '') => {
    const fd = new FormData();
    fd.append(IRPC_JSON_KEY, JSON.stringify(payload));
    const headers: Record<string, string> = {};
    if (cookie) headers['cookie'] = cookie;
    const req = new Request(`https://api.example.com/irpc${IRPC_WEB_PATH}/login`, {
      method: 'POST',
      body: fd,
      headers,
    });
    vi.spyOn(req, 'formData').mockResolvedValueOnce(fd);
    return req;
  };

  it('should route to resolveBuffered when URL matches web path', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'ok');

    const resolveBufferedSpy = vi.spyOn(router, 'resolveBuffered');

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    await router.resolve(request);

    expect(resolveBufferedSpy).toHaveBeenCalled();
    resolveBufferedSpy.mockRestore();
  });

  it('should not route to resolveBuffered for non-web-path URLs', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const resolveBufferedSpy = vi.spyOn(router, 'resolveBuffered');

    const fd = new FormData();
    fd.append(IRPC_JSON_KEY, JSON.stringify({ calls: [] }));
    const request = new Request('https://api.example.com/irpc', { method: 'POST', body: fd });
    vi.spyOn(request, 'formData').mockResolvedValueOnce(fd);

    await router.resolve(request);

    expect(resolveBufferedSpy).not.toHaveBeenCalled();
    resolveBufferedSpy.mockRestore();
  });

  it('should return JSON response with resolved data', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = (input: { user: string }) => Promise<{ token: string }>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => ({ token: '' }) });
    module.construct(testFunc, async (input) => ({ token: `tok_${input.user}` }));

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [{ user: 'admin' }] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.data).toEqual({ token: 'tok_admin' });
    expect(body.status).toBe('success');
  });

  it('should set cookie jar as writable and decode cookies from request', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    let jarWritable: boolean | undefined;
    let jarKey: any;

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => {
      jarWritable = getScope<boolean>(COOKIE_JAR_WRITABLE);
      jarKey = getScope(COOKIE_JAR_KEY);
      return 'ok';
    });

    const request = createBufferedRequest(
      { calls: [{ id: '1', name: 'login', args: [] } as AnyType] },
      'anchor-cookie://session={"user":"admin"}'
    );

    await router.resolveBuffered(request);

    expect(jarWritable).toBe(true);
    expect(jarKey).toBeDefined();
  });

  it('should include Set-Cookie headers when cookies are mutated', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => {
      const session = cookies('session', { token: '' });
      session.token = 'new_token';
      return 'ok';
    });

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(200);
    expect(response.headers.has('Set-Cookie')).toBe(true);
    expect(response.headers.get(COOKIES_SYNC_KEY)).toBe('1');
  });

  it('should not include cookie sync header when no cookies are mutated', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'no cookies touched');

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(200);
    expect(response.headers.has(COOKIES_SYNC_KEY)).toBe(false);
  });

  it('should return error response for non-existent function', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'nonExistent', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(404);
  });

  it('should return 500 for handler errors', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => {
      throw new Error('Auth failed');
    });

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(500);
  });

  it('should use custom response builder', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'ok');

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request, [], (body, init) => {
      const headers = new Headers(init?.headers);
      headers.set('x-custom-buffered', 'true');
      return new Response(body, { ...init, headers });
    });

    expect(response.headers.get('x-custom-buffered')).toBe('true');
    expect(response.status).toBe(200);
  });

  it('should run hooks before resolving', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    const hookFn = vi.fn();
    router.use(hookFn);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'ok');

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    await router.resolveBuffered(request);

    expect(hookFn).toHaveBeenCalled();
  });

  it('should handle hook errors gracefully', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    router.use(() => {
      throw new Error('Hook failed');
    });

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'ok');

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.status).toBe('error');
  });

  it('should seed credentials from payload', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });

    let receivedApiKey: string | undefined;
    module.construct(testFunc, async () => {
      receivedApiKey = credential<string>('apiKey');
      return 'ok';
    });

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
      credentials: [['apiKey', 'pk_test_456']],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(200);
    expect(receivedApiKey).toBe('pk_test_456');
  });

  it('should decode files from FormData in buffered requests', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = (input: { file: any }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });

    let receivedFile: any;
    module.construct(testFunc, async (input) => {
      receivedFile = input.file;
      return 'uploaded';
    });

    const dummyFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const pointer = {
      id: 'file-id-1',
      type: 'IRPC_PACKET_FILE',
      meta: { name: 'test.txt', size: dummyFile.size, type: 'text/plain' },
    };

    const fd = new FormData();
    fd.append(
      IRPC_JSON_KEY,
      JSON.stringify({
        calls: [
          {
            id: '1',
            name: 'login',
            args: [{ file: pointer }],
            files: [pointer],
          },
        ],
      })
    );
    fd.append('file-id-1', dummyFile);

    const req = new Request(`https://api.example.com/irpc${IRPC_WEB_PATH}/login`, {
      method: 'POST',
      body: fd,
    });
    vi.spyOn(req, 'formData').mockResolvedValueOnce(fd);

    const response = await router.resolveBuffered(req);

    await new Promise((r) => setTimeout(r, 0));

    expect(response.status).toBe(200);
    expect(receivedFile?.data).toBe(dummyFile);
    expect(receivedFile?.status).toBe(IRPC_FILE_STATUS.SUCCESS);
  });

  it('should return 500 when withContext throws unexpectedly', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => '' });
    module.construct(testFunc, async () => 'ok');

    vi.spyOn(router as AnyType, 'resolveHooks').mockImplementation(() => {
      throw new Error('Context exploded');
    });

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.type).toBe('resolve');
  });

  it('should replay EVENT packets into final result via RemoteState', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    module.use(transport);

    const router = new HTTPRouter(module, transport);

    type TestFunc = () => RemoteState<{ count: number }>;
    const testFunc = module.declare<TestFunc>({ name: 'login', seed: () => ({ count: 0 }), stream: true } as AnyType);

    module.construct(testFunc, () => {
      return stream<{ count: number }>(
        (state, accept) => {
          state.data = { count: 1 };
          setTimeout(() => {
            state.data.count = 42;
            accept();
          }, 10);
        },
        { count: 0 }
      );
    });

    const request = createBufferedRequest({
      calls: [{ id: '1', name: 'login', args: [] } as AnyType],
    });

    const response = await router.resolveBuffered(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.count).toBe(42);
  });
});
