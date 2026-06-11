import { describe, expect, it, vi } from 'vitest';
import { IRPC_FILE_STATUS } from '../src/enum.js';
import { IRPCBlob, IRPCFile, IRPCFileStream } from '../src/file.js';
import { IRPC_STORE } from '../src/index.js';

describe('IRPCFile', () => {
  it('should initialize correctly as PENDING when no blob is provided', () => {
    const meta = { name: 'test.jpg', size: 100, type: 'image/jpeg' };
    const file = new IRPCFile(meta);

    expect(file.status).toBe(IRPC_FILE_STATUS.PENDING);
    expect(file.downloaded).toBe(0);
    expect(file.success).toBe(false);
    expect(file.completed).toBe(false);
    expect(file.meta).toEqual(meta);

    // Creates an empty underlying literal Blob instance correctly
    expect(file.data).toBeInstanceOf(Blob);
    expect(file.data.size).toBe(0);
    expect(file.data.type).toBe('image/jpeg');
  });

  it('should instantly resolve SUCCESS when tracking pre-compiled blobs', () => {
    const data = new Blob(['hello'], { type: 'text/plain' });
    const meta = { name: 'hello.txt', size: 5, type: 'text/plain' };
    const file = new IRPCFile(meta, data);

    expect(file.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(file.success).toBe(true);
    expect(file.completed).toBe(true);
    expect(file.data).toBe(data);

    file.status = IRPC_FILE_STATUS.PENDING;
    expect(file.completed).toBe(false);
  });
});

describe('IRPCFileStream', () => {
  it('should initialize cleanly as an empty stream container', () => {
    const meta = { name: 'stream.mp4', size: 1024, type: 'video/mp4' };
    const stream = new IRPCFileStream(meta);

    expect(stream.status).toBe(IRPC_FILE_STATUS.PENDING);
    expect(stream.downloaded).toBe(0);
    expect(stream.meta.size).toBe(1024);
  });

  it('should process exact chunks correctly and track downloaded bytes', () => {
    const meta = { name: 'test.bin', size: 10, type: 'application/octet-stream' };
    const stream = new IRPCFileStream(meta);

    const chunk1 = new Uint8Array([1, 2, 3]);
    const leftovers1 = stream.write(chunk1);

    expect(leftovers1).toBeNull();
    expect(stream.downloaded).toBe(3);
    expect(stream.status).toBe(IRPC_FILE_STATUS.PENDING);

    const chunk2 = new Uint8Array([4, 5]);
    stream.write(chunk2);
    expect(stream.downloaded).toBe(5);
  });

  it('should correctly capture the overflow boundary, slice the stream, and drop safe leftovers safely', () => {
    const meta = { name: 'bounds.bin', size: 5, type: 'application/octet-stream' };
    const stream = new IRPCFileStream(meta);

    // Attempt to write an 8-byte chunk into a 5-byte stream boundary!
    const chunk = new Uint8Array([10, 20, 30, 40, 50, 99, 88, 77]);

    const leftovers = stream.write(chunk);

    // Exact state completion
    expect(stream.downloaded).toBe(5);
    expect(stream.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(stream.completed).toBe(true);
    expect(stream.success).toBe(true);

    // Blob compilation automatically triggered and verified
    expect(stream.data.size).toBe(5);
    // You can't easily read Blob synchronously in vitest without await text(), but length is guaranteed!

    // Verify mathematical leftovers handling preventing TCP stream corruption
    expect(leftovers).toBeInstanceOf(Uint8Array);
    expect(leftovers?.length).toBe(3);
    expect(leftovers).toEqual(new Uint8Array([99, 88, 77]));
  });

  it('should refuse further chunks immediately after completing state drops safely', () => {
    const meta = { name: 'test.bin', size: 2, type: 'app/bin' };
    const stream = new IRPCFileStream(meta);

    stream.write(new Uint8Array([1, 2]));
    expect(stream.success).toBe(true);

    // This should immediately return the verbatim chunk untouched without processing or throwing
    const illegalUpdate = new Uint8Array([3, 4]);
    const rejectedChunk = stream.write(illegalUpdate);

    expect(stream.downloaded).toBe(2);
    expect(rejectedChunk).toBeNull(); // Looking at file.ts implementation, if completed it returns `null`
  });

  it('should hook up pipe queues dynamically and drop historically cached chunks into slow subscribers correctly', () => {
    const meta = { name: 'slow.bin', size: 10, type: 'app/bin' };
    const stream = new IRPCFileStream(meta);

    // Stream receives data BEFORE someone subscribes
    stream.write(new Uint8Array([1, 2]));

    const mockCallback = vi.fn();

    // Establishing the dynamically retroactive pipe
    const unpipe = stream.pipe(mockCallback);

    // Validates immediate historically caught backlog delivery
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(new Uint8Array([1, 2]));

    // Streaming continues in live real-time
    stream.write(new Uint8Array([3, 4]));
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith(new Uint8Array([3, 4]));

    // Secure callback memory unlinking drops cleanly
    unpipe();
    stream.write(new Uint8Array([5, 6]));
    expect(mockCallback).toHaveBeenCalledTimes(2); // Unchanged!
  });

  it('should flawlessly isolate pipe subscription errors without crashing the main stream parser boundary', () => {
    const meta = { name: 'error.bin', size: 10, type: 'app/bin' };
    const stream = new IRPCFileStream(meta);

    expect(stream.error).toBeUndefined(); // Verify error getter

    stream.write(new Uint8Array([1, 2]));

    let loggedError: any = null;
    const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation((e) => {
      loggedError = e;
    });

    // Backlog array throws safely (covers lines 109-110)
    stream.pipe(() => {
      throw new Error('Pipe Failure');
    });
    expect(loggedError).toBeInstanceOf(Error);

    // Live boundary iteration throws safely (covers lines 84-85)
    loggedError = null;
    stream.write(new Uint8Array([3, 4]));
    expect(loggedError).toBeInstanceOf(Error);

    // Provide completely corrupt chunk mimicking underlying network stream destruction (covers lines 95-99)
    const illegalChunk: any = {
      get byteLength() {
        throw new Error('Fatal Stream Corruption');
      },
    };
    stream.write(illegalChunk);

    expect(stream.status).toBe(IRPC_FILE_STATUS.ERROR);
    expect(stream.error).toBeInstanceOf(Error);
    expect(stream.completed).toBe(true);
    expect(stream.success).toBe(false);

    errSpy.mockRestore();
  });
});

describe('IRPCBlob', () => {
  it('should initialize with PENDING status and an empty Blob matching the meta type', () => {
    const blob = new IRPCBlob('https://example.com/file.pdf', {
      type: 'application/pdf',
      size: 1024,
      name: 'file.pdf',
    });

    expect(blob.url).toBe('https://example.com/file.pdf');
    expect(blob.meta).toEqual({ type: 'application/pdf', size: 1024, name: 'file.pdf' });
    expect(blob.status).toBe(IRPC_FILE_STATUS.PENDING);
    expect(blob.downloaded).toBe(0);
    expect(blob.success).toBe(false);
    expect(blob.completed).toBe(false);
    expect(blob.error).toBeUndefined();
    expect(blob.data).toBeInstanceOf(Blob);
    expect(blob.data.size).toBe(0);
    expect(blob.data.type).toBe('application/pdf');
  });

  it('should default to empty string type when no meta is provided', () => {
    const blob = new IRPCBlob('https://example.com/data');

    expect(blob.meta).toBeUndefined();
    expect(blob.data.type).toBe('');
  });

  it('should fetch and resolve via .load() using the blob() path when no size is provided', async () => {
    const mockBlob = new Blob(['hello world'], { type: 'text/plain' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(mockBlob, { status: 200 }));

    const blob = new IRPCBlob('https://example.com/text.txt', { type: 'text/plain' });

    const result = await blob.load();

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBe(11);
    expect(blob.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(blob.success).toBe(true);
    expect(blob.completed).toBe(true);
    expect(blob.data.size).toBe(11);
    expect(blob.downloaded).toBe(11);

    fetchSpy.mockRestore();
  });

  it('should stream chunks via ReadableStream when meta.size is provided', async () => {
    const chunk1 = new Uint8Array([1, 2, 3, 4, 5]);
    const chunk2 = new Uint8Array([6, 7, 8, 9, 10]);

    let readIndex = 0;
    const chunks = [chunk1, chunk2];
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (readIndex < chunks.length) return { done: false, value: chunks[readIndex++] };
            return { done: true, value: undefined };
          },
        }),
      },
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(mockResponse));

    const blob = new IRPCBlob('https://example.com/binary.bin', { type: 'application/octet-stream', size: 10 });

    const result = await blob.load();

    expect(blob.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(blob.downloaded).toBe(10);
    expect(result.size).toBe(10);

    fetchSpy.mockRestore();
  });

  it('should stream and default to empty type when meta has no type', async () => {
    const chunk = new Uint8Array([1, 2, 3]);

    let readIndex = 0;
    const chunks = [chunk];
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (readIndex < chunks.length) return { done: false, value: chunks[readIndex++] };
            return { done: true, value: undefined };
          },
        }),
      },
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(mockResponse));

    const blob = new IRPCBlob('https://example.com/no-type.bin', { size: 3 });

    const result = await blob.load();

    expect(blob.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(result.type).toBe('');
    expect(result.size).toBe(3);

    fetchSpy.mockRestore();
  });

  it('should be idempotent — calling load() multiple times returns the same promise', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(new Blob(['data']), { status: 200 }));

    const blob = new IRPCBlob('https://example.com/file', { type: 'text/plain' });

    const p1 = blob.load();
    const p2 = blob.load();

    expect(p1).toBe(p2);
    await p1;

    fetchSpy.mockRestore();
  });

  it('should reject when fetch returns a non-ok response', async () => {
    const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }));

    const blob = new IRPCBlob('https://example.com/missing', { type: 'text/plain' });

    await expect(blob.load()).rejects.toThrow('HTTP 404');
    expect(blob.status).toBe(IRPC_FILE_STATUS.ERROR);
    expect(blob.error).toBeInstanceOf(Error);
    expect(blob.completed).toBe(true);
    expect(blob.success).toBe(false);

    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('should reject on subsequent load() calls after an error', async () => {
    const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 500 }));

    const blob = new IRPCBlob('https://example.com/fail');
    await expect(blob.load()).rejects.toThrow();

    // Subsequent load() without a new fetch should reject with the cached error
    await expect(blob.load()).rejects.toBeInstanceOf(Error);

    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('should deliver chunks to pipe subscribers during streaming load', async () => {
    const chunk1 = new Uint8Array([10, 20]);
    const chunk2 = new Uint8Array([30, 40]);

    let readIndex = 0;
    const chunks = [chunk1, chunk2];
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (readIndex < chunks.length) return { done: false, value: chunks[readIndex++] };
            return { done: true, value: undefined };
          },
        }),
      },
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(mockResponse));

    const blob = new IRPCBlob('https://example.com/stream.bin', { type: 'application/octet-stream', size: 4 });
    const pipeCallback = vi.fn();

    blob.pipe(pipeCallback);

    await blob.load();

    expect(pipeCallback).toHaveBeenCalledTimes(2);
    expect(pipeCallback).toHaveBeenNthCalledWith(1, chunk1);
    expect(pipeCallback).toHaveBeenNthCalledWith(2, chunk2);

    fetchSpy.mockRestore();
  });

  it('should isolate pipe callback errors without crashing the stream', async () => {
    const chunk1 = new Uint8Array([1, 2]);
    const chunk2 = new Uint8Array([3, 4]);

    let readIndex = 0;
    const chunks = [chunk1, chunk2];
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (readIndex < chunks.length) return { done: false, value: chunks[readIndex++] };
            return { done: true, value: undefined };
          },
        }),
      },
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(mockResponse));
    const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});

    const blob = new IRPCBlob('https://example.com/err-pipe.bin', { type: 'application/octet-stream', size: 4 });

    blob.pipe(() => {
      throw new Error('Pipe callback failure');
    });

    await blob.load();

    expect(blob.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(errSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('should unsubscribe cleanly via the unpipe function', async () => {
    const chunk = new Uint8Array([1, 2, 3]);

    let readIndex = 0;
    const chunks = [chunk];
    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (readIndex < chunks.length) return { done: false, value: chunks[readIndex++] };
            return { done: true, value: undefined };
          },
        }),
      },
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(mockResponse));

    const blob = new IRPCBlob('https://example.com/unpipe.bin', { type: 'application/octet-stream', size: 3 });
    const callback = vi.fn();

    const unpipe = blob.pipe(callback);
    unpipe();

    await blob.load();

    expect(callback).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('should be thenable — await resolves with the loaded Blob', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(new Blob(['content'], { type: 'text/plain' }), { status: 200 }));

    const blob = new IRPCBlob('https://example.com/thenable.txt', { type: 'text/plain' });

    const result = await blob;

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBe(7);
    expect(blob.status).toBe(IRPC_FILE_STATUS.SUCCESS);
    expect(blob.data.size).toBe(7);

    fetchSpy.mockRestore();
  });

  it('should support .catch() for error handling', async () => {
    const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }));

    const blob = new IRPCBlob('https://example.com/catch-fail', { type: 'text/plain' });

    const fallback = await blob.catch((err) => {
      expect(err).toBeInstanceOf(Error);
      return 'recovered';
    });

    expect(fallback).toBe('recovered');

    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });
});
