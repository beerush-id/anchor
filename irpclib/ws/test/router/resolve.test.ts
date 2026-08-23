import { createPackage, encode, IRPC_STORE, type IRPCData, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from '../../src/index.js';
import { WebSocketRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketRouter Resolve & Middleware', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should process requests and send response', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    type TestFunc = (input: { name: string }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
    const handler: TestFunc = async (input) => `Hello ${input.name}`;
    module.construct(testFunc, handler);

    const ws = {
      readyState: 1, // OPEN
      send: vi.fn().mockImplementation((message) => {
        expect(message.includes('"data":"Hello World"')).toBe(true);
      }),
    } as AnyType;

    const message = JSON.stringify({
      call: { id: '1', name: 'testFunc', args: [{ name: 'World' }] },
      credentials: [],
    });
    await router.resolve(message, ws);
  });

  it('should handle middleware errors', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const middleware = vi.fn().mockImplementation(async () => {
      throw new Error('Middleware error');
    });
    router.use(middleware);

    const ws = {
      readyState: 1, // OPEN
      send: vi.fn(),
    } as AnyType;

    const message = JSON.stringify({ call: { id: '1', name: 'testFunc', args: [] }, credentials: [] });

    await router.resolve(message, ws);

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('should execute valid middleware and cleanly proceed to route resolution', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const validMiddleware = vi.fn().mockResolvedValue(undefined);
    router.use(validMiddleware);

    type TestFunc = (input: { name: string }) => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
    module.construct(testFunc, async () => `Hello!`);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const message = JSON.stringify({ call: { id: '1', name: 'testFunc', args: [] }, credentials: [] });

    await router.resolve(message, ws);

    expect(validMiddleware).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalled();
  });

  it('should not send if ws is not open', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const ws = {
      readyState: 2, // CLOSING
      send: vi.fn(),
    } as AnyType;

    await router.resolve(JSON.stringify({ call: { id: '1', name: 'empty', args: [] }, credentials: [] }), ws);

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('should correctly abort running stream configurations when evaluating late specification ttl bounds explicitly naturally', async () => {
    vi.useFakeTimers();

    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    type TestFunc = () => Promise<string>;
    const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as AnyType);
    module.construct(testFunc, async () => new Promise(() => {}));

    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const message = JSON.stringify({ call: { id: '1', name: 'testTtl', args: [] }, credentials: [] });

    router.resolve(message, ws);

    await vi.advanceTimersByTimeAsync(60);

    const entry = router['abortControllers'].get('1');
    expect(entry?.controller.signal.aborted).toBe(true);

    vi.useRealTimers();
  });

  it('should correctly intercept target CANCEL stream envelopes proactively gracefully', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const abortSpy = vi.fn();
    router['abortControllers'].set('2', { controller: { abort: abortSpy } } as AnyType);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const message = JSON.stringify({ call: { id: '2', type: 'cancel' }, credentials: [] });

    await router.resolve(message, ws);

    expect(abortSpy).toHaveBeenCalled();
    expect(router['abortControllers'].has('2')).toBe(false);
  });

  it('should safely swallow invalid malformed payload parsing operations explicitly quietly natively', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;

    await router.resolve('{malformed json}', ws);

    expect(errSpy).toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('should ignore valid JSON without call property', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;

    await router.resolve(JSON.stringify({ data: 'not a call' }), ws);

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('should safely handle cancel for unknown req.id without entry', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);
    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const message = JSON.stringify({ call: { id: 'unknown-cancel-id', type: 'cancel' }, credentials: [] });

    await router.resolve(message, ws);
    expect(router['abortControllers'].has('unknown-cancel-id')).toBe(false);
  });

  it('should handle request with file pointers when no binary buffer was uploaded', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);
    const testFile = module.declare<(f: any) => Promise<string>>({ name: 'testFile' } as AnyType);
    module.construct(testFile, async (input) => input.blob?.meta?.name ?? 'no-file');

    const file = new IRPCFile({ type: 'text/plain', name: 'missing.bin', size: 10 });
    const encoded = encode([{ blob: file }] as IRPCData);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const message = JSON.stringify({
      call: {
        id: 'file-req-1',
        name: 'testFile',
        args: encoded.json.data,
        files: encoded.json.files,
      },
      credentials: [],
    });

    await router.resolve(message, ws);
    expect(ws.send).toHaveBeenCalled();
  });

  it('should not send error packet if ws is closed when hook errors', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);
    const ws = {
      readyState: 3, // CLOSED
      send: vi.fn(),
    } as AnyType;

    router.use(async () => {
      throw new Error('Hook failure on closed ws');
    });

    const message = JSON.stringify({
      call: { id: 'hook-err-closed', name: 'nonExistent', args: [] },
      credentials: [],
    });

    await router.resolve(message, ws);
    expect(ws.send).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
