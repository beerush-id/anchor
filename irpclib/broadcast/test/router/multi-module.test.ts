import '@irpclib/irpc/server';
import { createPackage, IRPC_STATUS } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { BroadcastRouter } from '../../src/router.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastRouter Multi-Module Behavior', () => {
  let mockChannel: AnyType;

  beforeEach(() => {
    mockChannel = createMockBroadcastChannel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should derive modules from transport and resolve requests across multiple packages via req.package metadata', async () => {
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const billingPkg = createPackage({ name: 'billing', version: '1.0.0' });
    const transport = new BroadcastTransport({ channel: 'test-multi' });

    authPkg.use(transport);
    billingPkg.use(transport);

    const router = new BroadcastRouter(transport);

    expect(router.packages.size).toBe(2);
    expect(router.packages.has(authPkg)).toBe(true);
    expect(router.packages.has(billingPkg)).toBe(true);

    type AuthFunc = (input: { user: string }) => Promise<string>;
    const loginStub = authPkg.declare<AuthFunc>({ name: 'login', seed: () => '' });
    authPkg.construct(loginStub, async (input) => `Welcome ${input.user}`);

    type BillingFunc = (input: { amount: number }) => Promise<string>;
    const chargeStub = billingPkg.declare<BillingFunc>({ name: 'charge', seed: () => '' });
    billingPkg.construct(chargeStub, async (input) => `Charged ${input.amount}`);

    await router.resolve({
      id: 'call-1',
      name: 'login',
      package: { name: 'auth', version: '1.0.0' },
      args: [{ user: 'Alice' }],
    } as AnyType);

    await router.resolve({
      id: 'call-2',
      name: 'charge',
      package: { name: 'billing', version: '1.0.0' },
      args: [{ amount: 100 }],
    } as AnyType);

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
    expect(mockChannel.postMessage.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: 'call-1', data: 'Welcome Alice', status: IRPC_STATUS.SUCCESS })
    );
    expect(mockChannel.postMessage.mock.calls[1][0]).toEqual(
      expect.objectContaining({ id: 'call-2', data: 'Charged 100', status: IRPC_STATUS.SUCCESS })
    );
  });

  it('should fallback to iterating packages when req.package is absent', async () => {
    const pkgA = createPackage({ name: 'pkgA', version: '1.0.0' });
    const pkgB = createPackage({ name: 'pkgB', version: '1.0.0' });
    const transport = new BroadcastTransport({ channel: 'test-fallback' });

    pkgA.use(transport);
    pkgB.use(transport);

    const router = new BroadcastRouter(transport);

    type UniqueFunc = () => Promise<string>;
    const uniqueStub = pkgB.declare<UniqueFunc>({ name: 'uniqueInB', seed: () => '' });
    pkgB.construct(uniqueStub, async () => 'Found in B');

    await router.resolve({
      id: 'call-fallback',
      name: 'uniqueInB',
      args: [],
    } as AnyType);

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
    expect(mockChannel.postMessage.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: 'call-fallback', data: 'Found in B', status: IRPC_STATUS.SUCCESS })
    );
  });

  it('should emit error packet when targeted package does not exist', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const transport = new BroadcastTransport({ channel: 'test-err' });
    authPkg.use(transport);

    const router = new BroadcastRouter(transport);

    await router.resolve({
      id: 'missing-call',
      name: 'ghostFunc',
      package: { name: 'nonexistent', version: '9.9.9' },
      args: [],
    } as AnyType);

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
    const response = mockChannel.postMessage.mock.calls[0][0];
    expect(response.id).toBe('missing-call');
    expect(response.status).toBe(IRPC_STATUS.ERROR);
  });
});
