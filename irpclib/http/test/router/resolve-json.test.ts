import { createPackage } from '@irpclib/irpc';
import { describe, expect, it, vi } from 'vitest';
import { HTTPTransport } from '../../src/index.js';
import { HTTPRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPRouter resolveJson & resolveRest', () => {
  describe('resolveReq', () => {
    it('should resolve incoming JSON requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => '' });
      module.construct(testFunc, async (input) => `Hello ${input.name}`);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: JSON.stringify({ name: 'World' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await router.resolveRest(request, 'testFunc');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('Hello World');
    });

    it('should handle JSON parsing errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolveRest(request, 'testFunc');
      expect(response.status).toBe(400);
    });

    it('should handle JSON parsing errors with custom builder', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const request = new Request('https://api.example.com/rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await router.resolveRest(request, 'testFunc', undefined, (body, init) => {
        return new Response(body, init);
      });
      expect(response.status).toBe(400);
    });
  });

  describe('resolveJson', () => {
    it('should resolve incoming JSON requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => '' });
      module.construct(testFunc, async (input) => `Hello ${input.name}`);

      const response = await router.resolveJson({ name: 'World' }, 'testFunc');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('Hello World');
    });

    it('should handle JSON parsing errors for unknown functions', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const response = await router.resolveJson('invalid json', 'unknownFunc');
      expect(response.status).toBe(404);
    });
  });

  describe('resolveJsonReq', () => {
    it('should process events correctly with replay.any', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      type TestFunc = () => Promise<{ a: number }>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc', seed: () => ({ a: 0 }) });
      module.construct(testFunc, async () => ({ a: 1 }));

      const packets = [
        JSON.stringify({ type: 'answer', status: 'success', data: { a: 0 } }),
        JSON.stringify({ type: 'event', data: { type: 'set', keys: ['data', 'a'], value: 2 } }),
      ];

      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as AnyType, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] } as AnyType);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ a: 2 });
    });

    it('should return 404 if error code is NOT_FOUND', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const packets = [
        JSON.stringify({
          type: 'answer',
          status: 'error',
          error: { type: 'resolve', code: 'not_found', message: 'Not found' },
        }),
      ];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as AnyType, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] } as AnyType);
      expect(response.status).toBe(404);
      expect((await response.json()).message).toBe('Not found');
    });

    it('should return 500 if error code is something else', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const packets = [
        JSON.stringify({ type: 'answer', status: 'error', error: { code: 'OTHER_ERROR', message: 'Other error' } }),
      ];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as AnyType, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] } as AnyType);
      expect(response.status).toBe(500);
      expect((await response.json()).message).toBe('Other error');
    });

    it('should use custom builder', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      const packets = [JSON.stringify({ type: 'answer', status: 'success', data: 'ok' })];
      const mockResponse = new Response(packets.join('\n'));
      vi.spyOn(router as AnyType, 'resolveRequests').mockReturnValue(mockResponse);

      const response = await router.resolveJsonReq(
        { id: '1', name: 'testFunc', args: [] } as AnyType,
        [],
        (body, init) => {
          const headers = new Headers(init?.headers);
          headers.set('x-custom-json-req', 'true');
          return new Response(body, { ...init, headers });
        }
      );

      expect(response.headers.get('x-custom-json-req')).toBe('true');
      expect(response.status).toBe(200);
      expect(await response.json()).toBe('ok');
    });

    it('should handle thrown errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      module.use(transport);

      const router = new HTTPRouter(module, transport);

      vi.spyOn(router as AnyType, 'resolveRequests').mockImplementation(() => {
        throw new Error('Unexpected Error');
      });

      const response = await router.resolveJsonReq({ id: '1', name: 'testFunc', args: [] } as AnyType);
      expect(response.status).toBe(500);
      expect((await response.json()).message).toBe('Unexpected Error');
    });
  });
});
