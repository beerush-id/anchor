import { createPackage, encode, type IRPCData, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeFileFrame } from '../../src/frame.js';
import { WebSocketTransport } from '../../src/index.js';
import { WebSocketRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketRouter Binary Resolution & Disconnect', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should buffer binary frames and automatically discard orphaned frames via TTL natively', async () => {
    vi.useFakeTimers();

    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    const ws = { readyState: 1, send: vi.fn() } as AnyType;
    const frame = encodeFileFrame('isolated-file-id', new Uint8Array([1, 2, 3]).buffer);

    await router.resolve(frame, ws);

    expect(router['fileBuffer'].has('isolated-file-id')).toBe(true);
    expect(router['fileBuffer'].get('isolated-file-id')).toBeInstanceOf(Uint8Array);

    vi.advanceTimersByTime(30005);

    expect(router['fileBuffer'].has('isolated-file-id')).toBe(false);

    vi.useRealTimers();
  });

  it('should correlate pre-buffered files efficiently processing stream decoding natively correctly', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    module.use(transport);

    const router = new WebSocketRouter(module, transport);

    type TestFileFunc = (input: { blob: IRPCFile }) => Promise<string>;
    const testFileFunc = module.declare<TestFileFunc>({ name: 'testFileFunc' } as AnyType);

    let incomingBlobSize = 0;
    module.construct(testFileFunc, async (input) => {
      incomingBlobSize = input.blob.data.size;
      return 'success';
    });

    const ws = { readyState: 1, send: vi.fn() } as AnyType;

    const fileId = 'target-file-id';
    const fileData = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const frame = encodeFileFrame(fileId, fileData);

    await router.resolve(frame, ws);

    const fileReqObj = {
      blob: new IRPCFile({ type: 'text/plain', name: 'dummy.txt', size: 5 }, new Blob([fileData])),
    };
    const encoded = encode([fileReqObj] as IRPCData);

    if (encoded.json.files?.length) {
      encoded.json.files[0].id = fileId;
    }

    const filePointerReq = {
      call: {
        id: '1',
        name: 'testFileFunc',
        args: encoded.json.data,
        files: encoded.json.files,
      },
      credentials: [],
    };

    await router.resolve(JSON.stringify(filePointerReq), ws);

    expect(incomingBlobSize).toBe(5);
    expect(router['fileBuffer'].has(fileId)).toBe(false);
  });

  describe('disconnect', () => {
    it('should flush and immediately clean natively evaluated target controllers functionally globally', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      module.use(transport);

      const router = new WebSocketRouter(module, transport);

      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();

      router['abortControllers'].set('1', { controller: { abort: abortSpy1 } } as AnyType);
      router['abortControllers'].set('2', { controller: { abort: abortSpy2 } } as AnyType);

      router.disconnect();

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
      expect(router['abortControllers'].size).toBe(0);
    });

    it('should cleanly abort only streams attached to a specific websocket', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      module.use(transport);

      const router = new WebSocketRouter(module, transport);

      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();
      const abortSpy3 = vi.fn();

      const wsA = {} as WebSocket;
      const wsB = {} as WebSocket;

      router['abortControllers'].set('1', { controller: { abort: abortSpy1 }, ws: wsA } as AnyType);
      router['abortControllers'].set('2', { controller: { abort: abortSpy2 }, ws: wsB } as AnyType);
      router['abortControllers'].set('3', { controller: { abort: abortSpy3 }, ws: wsA } as AnyType);

      router.disconnect(wsA);

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).not.toHaveBeenCalled();
      expect(abortSpy3).toHaveBeenCalled();
      expect(router['abortControllers'].size).toBe(1);
      expect(router['abortControllers'].has('2')).toBe(true);
    });
  });
});
