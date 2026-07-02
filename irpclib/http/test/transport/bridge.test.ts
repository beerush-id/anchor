import '@irpclib/irpc/server';
import { createPackage, IRPC_PACKET_TYPE, IRPC_STATUS } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPTransport } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPTransport ↔ Router Bridge', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should round-trip a standalone call through router.resolve', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      endpoint: '/rpc',
    });
    module.use(transport);
    const router = new HTTPRouter(transport);

    type LoginFunc = (input: { user: string }) => Promise<{ token: string }>;
    const loginFunc = module.declare<LoginFunc>({ name: 'login', seed: () => ({ token: '' }) });

    module.construct(loginFunc, async (input) => ({ token: `tok_${input.user}` }));

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const request = new Request(url, init);
      return router.resolve(request);
    });

    const call = {
      id: '1',
      payload: { name: 'login', package: { name: 'test', version: '1.0.0' }, args: [{ user: 'admin' }] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledTimes(1);
    const packet = call.enqueue.mock.calls[0][0];
    expect(packet.data).toEqual({ token: 'tok_admin' });
    expect(packet.status).toBe('success');

    mockFetch.mockRestore();
  });

  it('should round-trip an error through the bridge', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });
    module.use(transport);
    const router = new HTTPRouter(transport);

    type FailFunc = () => Promise<string>;
    const failFunc = module.declare<FailFunc>({ name: 'fail', seed: () => '' });
    module.construct(failFunc, async () => {
      throw new Error('Server error');
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const request = new Request(url, init);
      return router.resolve(request);
    });

    const call = {
      id: '1',
      payload: { name: 'fail', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledTimes(1);
    const packet = call.enqueue.mock.calls[0][0];
    expect(packet.type).toBe(IRPC_PACKET_TYPE.CLOSE);
    expect(packet.status).toBe(IRPC_STATUS.ERROR);

    mockFetch.mockRestore();
  });

  it('should round-trip a non-existent function through the bridge', async () => {
    const module = createPackage({ name: 'test', version: '1.0.0' });
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });
    module.use(transport);
    const router = new HTTPRouter(transport);

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const request = new Request(url, init);
      return router.resolve(request);
    });

    const call = {
      id: '1',
      payload: { name: 'nonExistent', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledTimes(1);
    const packet = call.enqueue.mock.calls[0][0];
    expect(packet.type).toBe(IRPC_PACKET_TYPE.CLOSE);
    expect(packet.status).toBe(IRPC_STATUS.ERROR);

    mockFetch.mockRestore();
  });
});
