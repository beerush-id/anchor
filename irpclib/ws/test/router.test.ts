import '@irpclib/irpc/server';
import { createPackage, encode, type IRPCData, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeFileFrame } from '../src/frame.js';
import { WebSocketTransport } from '../src/index.js';
import { WebSocketRouter } from '../src/router.js'; // Mock WebSocketTransport

// Mock WebSocketTransport
vi.mock('../src/transport.js', () => {
  return {
    WebSocketTransport: vi.fn().mockImplementation(() => ({
      endpoint: 'ws://localhost:8080',
    })),
  };
});

describe('WebSocketRouter', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create router with module and transport', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      const router = new WebSocketRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.middlewares).toEqual([]);
      expect(router.config.endpoint).toBe('ws://localhost:8080');
      expect(router.endpoint).toBeDefined();
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const customResolver = vi.fn();

      const router = new WebSocketRouter(module, transport, {
        endpoint: 'ws://custom',
        resolver: customResolver,
      });

      expect(router.config.endpoint).toBe('ws://custom');
      expect(router.config.resolver).toBe(customResolver);
    });
  });

  describe('use', () => {
    it('should add middleware', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const middleware = async () => undefined;

      const result = router.use(middleware);

      expect(router.middlewares).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      router.use('invalid_middleware' as any);

      const ws = { readyState: 1, send: vi.fn() } as any;
      await router.resolve(JSON.stringify([{ id: '1', name: 'testFunc', args: [] }]), ws);

      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('should process requests and send response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn().mockImplementation((message) => {
          expect(message.includes('"data":"Hello World"')).toBe(true);
        }),
      } as any;

      const message = JSON.stringify([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]);
      await router.resolve(message, ws);
    });

    it('should handle middleware errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const middleware = vi.fn().mockImplementation(async () => {
        throw new Error('Middleware error');
      });
      router.use(middleware);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn(),
      } as any;

      const message = JSON.stringify({ id: '1', name: 'testFunc', args: [] });

      await router.resolve(message, ws);

      expect(errSpy).toHaveBeenCalled();
    });

    it('should execute valid middleware and cleanly proceed to route resolution', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const validMiddleware = vi.fn().mockResolvedValue(undefined);
      router.use(validMiddleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async () => `Hello!`);

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '1', name: 'testFunc', args: [] }]);

      await router.resolve(message, ws);

      expect(validMiddleware).toHaveBeenCalled();
      expect(ws.send).toHaveBeenCalled();
    });

    it('should not send if ws is not open', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = {
        readyState: 2, // CLOSING
        send: vi.fn(),
      } as any;

      await router.resolve('[]', ws);

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should correctly abort running stream configurations when evaluating late specification ttl bounds explicitly naturally', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as any);
      module.construct(testFunc, async () => new Promise(() => {}));

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '1', name: 'testTtl', args: [] }]);

      router.resolve(message, ws);

      // Fast forward to implicitly cause internal cancellation asynchronously
      await vi.advanceTimersByTimeAsync(60);

      // Verify the stream correctly bounded itself off natively
      const controller = router['abortControllers'].get('1');
      expect(controller?.signal.aborted).toBe(true);

      vi.useRealTimers();
    });

    it('should correctly intercept target CANCEL stream envelopes proactively gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const abortSpy = vi.fn();
      router['abortControllers'].set('2', { abort: abortSpy } as any);

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '2', type: 'cancel' }]); // WS_MESSAGE_TYPE.CANCEL

      await router.resolve(message, ws);

      expect(abortSpy).toHaveBeenCalled();
      expect(router['abortControllers'].has('2')).toBe(false);
    });

    it('should safely swallow invalid malformed payload parsing operations explicitly quietly natively', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = { readyState: 1, send: vi.fn() } as any;

      await router.resolve('{malformed json}', ws);

      expect(errSpy).toHaveBeenCalled();
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should buffer binary frames and automatically discard orphaned frames via TTL natively', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = { readyState: 1, send: vi.fn() } as any;
      const frame = encodeFileFrame('isolated-file-id', new Uint8Array([1, 2, 3]).buffer);

      await router.resolve(frame, ws);

      // Verify the frame is buffered
      expect(router['fileBuffer'].has('isolated-file-id')).toBe(true);
      expect(router['fileBuffer'].get('isolated-file-id')).toBeInstanceOf(Uint8Array);

      // Fast forward past the TTL window seamlessly
      vi.advanceTimersByTime(30005);

      // Verify cleanup worked autonomously natively
      expect(router['fileBuffer'].has('isolated-file-id')).toBe(false);

      vi.useRealTimers();
    });

    it('should correlate pre-buffered files efficiently processing stream decoding natively correctly', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      type TestFileFunc = (input: { blob: IRPCFile }) => Promise<string>;
      const testFileFunc = module.declare<TestFileFunc>({ name: 'testFileFunc' });

      let incomingBlobSize = 0;
      module.construct(testFileFunc, async (input) => {
        incomingBlobSize = input.blob.data.size;
        return 'success';
      });

      const ws = { readyState: 1, send: vi.fn() } as any;

      const fileId = 'target-file-id';
      const fileData = new Uint8Array([1, 2, 3, 4, 5]).buffer; // 5 bytes
      const frame = encodeFileFrame(fileId, fileData);

      // Manually buffer the binary envelope first simulating physical arrival orders
      await router.resolve(frame, ws);

      const fileReqObj = {
        blob: new IRPCFile({ type: 'text/plain', name: 'dummy.txt', size: 5 }, new Blob([fileData])),
      };
      const encoded = encode([fileReqObj] as IRPCData);

      // Mutate the generated file pointer ID to strictly match the frame we injected.
      if (encoded.json.files?.length) {
        encoded.json.files[0].id = fileId;
      }

      const filePointerReq = [
        {
          id: '1',
          name: 'testFileFunc',
          args: encoded.json.data,
          files: encoded.json.files,
        },
      ];

      await router.resolve(JSON.stringify(filePointerReq), ws);

      // Ensure the handler was executed mapping the size logically
      expect(incomingBlobSize).toBe(5);

      // Assure the buffer flushed consumed payload accurately gracefully
      expect(router['fileBuffer'].has(fileId)).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should flush and immediately clean natively evaluated target controllers functionally globally', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();

      router['abortControllers'].set('1', { abort: abortSpy1 } as any);
      router['abortControllers'].set('2', { abort: abortSpy2 } as any);

      router.disconnect();

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
      expect(router['abortControllers'].size).toBe(0);
    });
  });
});
