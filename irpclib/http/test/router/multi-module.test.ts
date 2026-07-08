import { createPackage, type IRPCRequests } from '@irpclib/irpc';
import { describe, expect, it, vi } from 'vitest';
import { HTTPTransport, IRPC_JSON_KEY } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPRouter Multi-Module Behavior', () => {
  const createMockRequest = (payload: IRPCRequests) => {
    const fd = new FormData();
    fd.append(IRPC_JSON_KEY, JSON.stringify(payload));
    const req = new Request('https://api.example.com/rpc', { method: 'POST', body: fd });
    vi.spyOn(req, 'formData').mockResolvedValueOnce(fd);
    return req;
  };

  it('should derive modules from transport and resolve requests across multiple packages', async () => {
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const billingPkg = createPackage({ name: 'billing', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    authPkg.use(transport);
    billingPkg.use(transport);

    const router = new HTTPRouter(transport);

    expect(router.packages.size).toBe(2);
    expect(router.packages.has(authPkg)).toBe(true);
    expect(router.packages.has(billingPkg)).toBe(true);

    type AuthFunc = (input: { user: string }) => Promise<string>;
    const loginStub = authPkg.declare<AuthFunc>({ name: 'login', seed: () => '' });
    authPkg.construct(loginStub, async (input) => `Welcome ${input.user}`);

    type BillingFunc = (input: { amount: number }) => Promise<string>;
    const chargeStub = billingPkg.declare<BillingFunc>({ name: 'charge', seed: () => '' });
    billingPkg.construct(chargeStub, async (input) => `Charged ${input.amount}`);

    const request = createMockRequest({
      calls: [
        {
          id: 'call-1',
          name: 'login',
          package: { name: 'auth', version: '1.0.0' },
          args: [{ user: 'Alice' }],
        } as AnyType,
        {
          id: 'call-2',
          name: 'charge',
          package: { name: 'billing', version: '1.0.0' },
          args: [{ amount: 100 }],
        } as AnyType,
      ],
    });

    const response = await router.resolve(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const packets = text
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    expect(packets).toContainEqual(expect.objectContaining({ id: 'call-1', data: 'Welcome Alice' }));
    expect(packets).toContainEqual(expect.objectContaining({ id: 'call-2', data: 'Charged 100' }));
  });

  it('should emit per-call notFound error packets for missing packages in a batch without rejecting the batch', async () => {
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    authPkg.use(transport);

    const router = new HTTPRouter(transport);

    type AuthFunc = () => Promise<string>;
    const loginStub = authPkg.declare<AuthFunc>({ name: 'login', seed: () => '' });
    authPkg.construct(loginStub, async () => 'Success');

    const request = createMockRequest({
      calls: [
        {
          id: 'valid-call',
          name: 'login',
          package: { name: 'auth', version: '1.0.0' },
          args: [],
        } as AnyType,
        {
          id: 'missing-pkg-call',
          name: 'unknownMethod',
          package: { name: 'ghostPkg', version: '9.9.9' },
          args: [],
        } as AnyType,
      ],
    });

    const response = await router.resolve(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const packets = text
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    expect(packets).toContainEqual(expect.objectContaining({ id: 'valid-call', data: 'Success' }));
    expect(packets).toContainEqual(
      expect.objectContaining({
        id: 'missing-pkg-call',
        error: expect.objectContaining({ code: 'not_found' }),
      })
    );
  });

  it('should resolve REST requests using encoded <name>/<package>/<version> route format', async () => {
    const billingPkg = createPackage({ name: 'billing', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    billingPkg.use(transport);

    const router = new HTTPRouter(transport);

    type WebhookFunc = (payload: { event: string }) => Promise<string>;
    const stripeWebhook = billingPkg.declare<WebhookFunc>({ name: 'stripeWebhook', seed: () => '' });
    billingPkg.construct(stripeWebhook, async (payload) => `Received ${payload.event}`);

    const req = new Request('https://api.example.com/rest/stripeWebhook/billing/1.0.0', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.success' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await router.resolveRest(req, 'stripeWebhook/billing/1.0.0');
    expect(response.status).toBe(200);
    expect(await response.json()).toBe('Received payment.success');
  });

  it('should fallback to method lookup across modules when package/version are omitted in REST route', async () => {
    const authPkg = createPackage({ name: 'auth', version: '1.0.0' });
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    authPkg.use(transport);

    const router = new HTTPRouter(transport);

    type HookFunc = (payload: { userId: string }) => Promise<string>;
    const clerkWebhook = authPkg.declare<HookFunc>({ name: 'clerkWebhook', seed: () => '' });
    authPkg.construct(clerkWebhook, async (payload) => `Synced user ${payload.userId}`);

    const req = new Request('https://api.example.com/rest/clerkWebhook', {
      method: 'POST',
      body: JSON.stringify({ userId: 'usr_123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await router.resolveRest(req, 'clerkWebhook');
    expect(response.status).toBe(200);
    expect(await response.json()).toBe('Synced user usr_123');
  });
});
