import '@irpclib/irpc/server';
import { createPackage, IRPC_STATUS } from '@irpclib/irpc';
import { describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from '../../src/index.js';
import { WebSocketRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketRouter Multi-Module Behavior', () => {
  it('should derive modules from transport and resolve requests across multiple packages via req.package metadata', async () => {
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const billingPkg = createPackage({ name: 'billing', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

    authPkg.use(transport);
    billingPkg.use(transport);

    const router = new WebSocketRouter(transport);

    expect(router.packages.size).toBe(2);
    expect(router.packages.has(authPkg)).toBe(true);
    expect(router.packages.has(billingPkg)).toBe(true);

    type AuthFunc = (input: { user: string }) => Promise<string>;
    const loginStub = authPkg.declare<AuthFunc>({ name: 'login', seed: () => '' });
    authPkg.construct(loginStub, async (input) => `Welcome ${input.user}`);

    type BillingFunc = (input: { amount: number }) => Promise<string>;
    const chargeStub = billingPkg.declare<BillingFunc>({ name: 'charge', seed: () => '' });
    billingPkg.construct(chargeStub, async (input) => `Charged ${input.amount}`);

    const sentMessages: string[] = [];
    const ws = {
      readyState: 1,
      send: vi.fn().mockImplementation((msg: string) => {
        sentMessages.push(msg);
      }),
    } as AnyType;

    await router.resolve(
      JSON.stringify({
        call: {
          id: 'call-1',
          name: 'login',
          package: { name: 'auth', version: '1.0.0' },
          args: [{ user: 'Alice' }],
        },
        credentials: [],
      }),
      ws
    );

    await router.resolve(
      JSON.stringify({
        call: {
          id: 'call-2',
          name: 'charge',
          package: { name: 'billing', version: '1.0.0' },
          args: [{ amount: 100 }],
        },
        credentials: [],
      }),
      ws
    );

    expect(sentMessages).toHaveLength(2);
    expect(JSON.parse(sentMessages[0])).toEqual(
      expect.objectContaining({ id: 'call-1', data: 'Welcome Alice', status: IRPC_STATUS.SUCCESS })
    );
    expect(JSON.parse(sentMessages[1])).toEqual(
      expect.objectContaining({ id: 'call-2', data: 'Charged 100', status: IRPC_STATUS.SUCCESS })
    );
  });

  it('should fallback to iterating packages when req.package is absent', async () => {
    const pkgA = createPackage({ name: 'pkgA', version: '1.0.0' });
    const pkgB = createPackage({ name: 'pkgB', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

    pkgA.use(transport);
    pkgB.use(transport);

    const router = new WebSocketRouter(transport);

    type UniqueFunc = () => Promise<string>;
    const uniqueStub = pkgB.declare<UniqueFunc>({ name: 'uniqueInB', seed: () => '' });
    pkgB.construct(uniqueStub, async () => 'Found in B');

    const sentMessages: string[] = [];
    const ws = {
      readyState: 1,
      send: vi.fn().mockImplementation((msg: string) => {
        sentMessages.push(msg);
      }),
    } as AnyType;

    await router.resolve(
      JSON.stringify({
        call: {
          id: 'call-fallback',
          name: 'uniqueInB',
          args: [],
        },
        credentials: [],
      }),
      ws
    );

    expect(sentMessages).toHaveLength(1);
    expect(JSON.parse(sentMessages[0])).toEqual(
      expect.objectContaining({ id: 'call-fallback', data: 'Found in B', status: IRPC_STATUS.SUCCESS })
    );
  });

  it('should emit error packet when targeted package does not exist', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
    authPkg.use(transport);

    const router = new WebSocketRouter(transport);

    const sentMessages: string[] = [];
    const ws = {
      readyState: 1,
      send: vi.fn().mockImplementation((msg: string) => {
        sentMessages.push(msg);
      }),
    } as AnyType;

    await router.resolve(
      JSON.stringify({
        call: {
          id: 'missing-call',
          name: 'ghostFunc',
          package: { name: 'nonexistent', version: '9.9.9' },
          args: [],
        },
        credentials: [],
      }),
      ws
    );

    expect(sentMessages).toHaveLength(1);
    const parsed = JSON.parse(sentMessages[0]);
    expect(parsed.id).toBe('missing-call');
    expect(parsed.status).toBe(IRPC_STATUS.ERROR);
    vi.restoreAllMocks();
  });
});
