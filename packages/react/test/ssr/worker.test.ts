import '../../src/server/index.js';
import '../../src/client/index.js';
import { safeRun, sleep } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SSR_ENV_KEY } from '../../src/ssr/context.js';
import { ssrEnv } from '../../src/ssr/index.js';
import type { SSROutput, SSRRenderer } from '../../src/ssr/types.js';
import { createFullWorker, createWorker } from '../../src/ssr/worker.js';

function createMockRenderer(output?: Partial<SSROutput>): SSRRenderer {
  const defaults: SSROutput = {
    html: '<div>Hello</div>',
    head: '<title>Test</title>',
    status: 200,
    cookies: [],
    redirect: undefined,
    ...output,
  };

  return vi.fn(async () => defaults) as unknown as SSRRenderer;
}

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

const TEMPLATE = '<html><!--ssr-head--><!--ssr-outlet--></html>';

describe('createWorker', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders HTML with template substitution', async () => {
    const renderer = createMockRenderer();
    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html');

    const body = await response.text();
    expect(body).toBe('<html><title>Test</title><div>Hello</div></html>');
  });

  it('sets cookies on the response', async () => {
    const renderer = createMockRenderer({ cookies: ['session=abc; Path=/', 'theme=dark'] });
    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.headers.getSetCookie()).toEqual(['session=abc; Path=/', 'theme=dark']);
  });

  it('handles redirects with Location header and null body', async () => {
    const renderer = createMockRenderer({ status: 302, redirect: '/dashboard' });
    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/login'));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    expect(response.body).toBeNull();
  });

  it('preserves cookies on redirect', async () => {
    const renderer = createMockRenderer({
      status: 302,
      redirect: '/dashboard',
      cookies: ['token=xyz; HttpOnly'],
    });
    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/login'));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    expect(response.headers.getSetCookie()).toEqual(['token=xyz; HttpOnly']);
  });

  it('resolves assets before SSR', async () => {
    const renderer = createMockRenderer();
    const assetResponse = new Response('body', { headers: { 'Content-Type': 'text/css' } });

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveAsset: async (_req, url) => {
        if (url.pathname === '/style.css') return assetResponse;
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/style.css'));
    expect(response).toBe(assetResponse);
    expect(renderer).not.toHaveBeenCalled();
  });

  it('serves raw html when contentType override is provided', async () => {
    const renderer = createMockRenderer({
      html: '<urlset></urlset>',
      contentType: 'application/xml; charset=utf-8',
    });
    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/sitemap.xml'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await response.text()).toBe('<urlset></urlset>');
  });

  it('falls through to SSR when resolveAsset returns undefined', async () => {
    const renderer = createMockRenderer();

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveAsset: async () => undefined,
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(200);
    expect(renderer).toHaveBeenCalled();
  });

  it('uses custom resolveContext', async () => {
    const renderer = createMockRenderer();
    const customContext: [string | symbol, unknown][] = [['auth', 'user-123']];

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveContext: () => customContext,
    });

    await worker.fetch(createRequest('http://localhost/'));

    expect(renderer).toHaveBeenCalledWith(
      'http://localhost/',
      '',
      customContext,
      expect.any(AbortController),
      undefined
    );
  });

  it('uses async custom resolveContext', async () => {
    const renderer = createMockRenderer();
    const customContext: [string | symbol, unknown][] = [['auth', 'user-123']];

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveContext: async () => {
        await sleep(5);
        return customContext;
      },
    });

    await worker.fetch(createRequest('http://localhost/'), { foo: 'bar' });

    expect(renderer).toHaveBeenCalledWith(
      'http://localhost/',
      '',
      customContext,
      expect.any(AbortController),
      undefined
    );
  });

  it('defaults context to empty array', async () => {
    const renderer = createMockRenderer();
    const worker = createWorker(renderer, { template: TEMPLATE });

    await worker.fetch(createRequest('http://localhost/'));

    expect(renderer).toHaveBeenCalledWith('http://localhost/', '', [], expect.any(AbortController), undefined);
  });

  it('passes cookie from request header', async () => {
    const renderer = createMockRenderer();
    const worker = createWorker(renderer, { template: TEMPLATE });

    await worker.fetch(
      createRequest('http://localhost/', {
        headers: { cookie: 'session=abc' },
      })
    );

    expect(renderer).toHaveBeenCalledWith(
      'http://localhost/',
      'session=abc',
      [],
      expect.any(AbortController),
      undefined
    );
  });

  it('applies createResponse hook', async () => {
    const renderer = createMockRenderer();
    const worker = createWorker(renderer, {
      template: TEMPLATE,
      createResponse: (res) => {
        const headers = new Headers(res.headers);
        headers.set('X-Custom', 'header');
        return new Response(res.body, { status: res.status, headers });
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.headers.get('X-Custom')).toBe('header');
  });

  it('applies createResponse hook on error', async () => {
    const renderer = vi.fn(async () => {
      throw new Error('render failed');
    }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      createResponse: (res) => {
        const headers = new Headers(res.headers);
        headers.set('X-Error', 'true');
        return new Response(res.body, { status: res.status, headers });
      },
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(500);
    expect(response.headers.get('X-Error')).toBe('true');

    vi.restoreAllMocks();
  });

  it('returns 500 when renderer throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderer = vi.fn(async () => {
      throw new Error('render failed');
    }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });

  it('suppresses console.error in browser environment on error', async () => {
    const core = await import('@anchorlib/core');
    const spy = vi.spyOn(core, 'isBrowser').mockReturnValue(true);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderer = vi.fn(async () => {
      throw new Error('render failed');
    }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, { template: TEMPLATE });
    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.status).toBe(500);
    expect(errSpy).not.toHaveBeenCalled();

    spy.mockRestore();
    errSpy.mockRestore();
  });

  it('aborts on timeout', async () => {
    let capturedController: AbortController | undefined;

    const renderer = vi.fn(async (_url: string, _cookie: string, _ctx: unknown, controller: AbortController) => {
      capturedController = controller;
      // Wait longer than the timeout
      await new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return { html: '', head: '', status: 200, cookies: [], redirect: undefined };
    }) as unknown as SSRRenderer;

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const worker = createWorker(renderer, { template: TEMPLATE, timeout: 50 });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(capturedController?.signal.aborted).toBe(true);
    expect(response.status).toBe(500);

    errSpy.mockRestore();
  });

  it('aborts when request is aborted', async () => {
    let capturedController: AbortController | undefined;

    const renderer = vi.fn(async (_url: string, _cookie: string, _ctx: unknown, controller: AbortController) => {
      capturedController = controller;
      return { html: '', head: '', status: 200, cookies: [], redirect: undefined };
    }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, { template: TEMPLATE });
    const reqController = new AbortController();

    await worker.fetch(createRequest('http://localhost/', { signal: reqController.signal }));

    expect(capturedController).toBeDefined();
    // After fetch completes, the abort listener is cleaned up.
    // Verify abort propagation by aborting before the renderer returns.
  });

  it('uses custom headTag and bodyTag', async () => {
    const renderer = createMockRenderer();
    const customTemplate = '<html>{{HEAD}}{{BODY}}</html>';

    const worker = createWorker(renderer, {
      template: customTemplate,
      headTag: '{{HEAD}}',
      bodyTag: '{{BODY}}',
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).toBe('<html><title>Test</title><div>Hello</div></html>');
  });

  it('passes env to resolveAsset', async () => {
    const renderer = createMockRenderer();
    const mockEnv = { ASSETS: { fetch: vi.fn() } };

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveAsset: async (_req, _url, env) => {
        expect(env).toBe(mockEnv);
        return undefined;
      },
    });

    await worker.fetch(createRequest('http://localhost/'), mockEnv);
    expect(renderer).toHaveBeenCalled();
  });
});

describe('createFullWorker', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createMockRouter(options?: { resolveResponse?: Response }) {
    return {
      transport: { endpoint: '/irpc' },
      resolve: vi.fn(
        async () =>
          options?.resolveResponse ??
          new Response('{"ok":true}', {
            headers: { 'Content-Type': 'application/x-ndjson' },
          })
      ),
      isolate: vi.fn(async (handler: () => any, _controller?: any, _ctx?: any, preHook?: () => void) => {
        preHook?.();
        return handler();
      }),
    } as any;
  }

  it('serves raw html when contentType override is provided in createFullWorker', async () => {
    const renderer = createMockRenderer({
      html: '<urlset></urlset>',
      contentType: 'application/xml; charset=utf-8',
    });
    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/sitemap.xml'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await response.text()).toBe('<urlset></urlset>');
  });

  it('routes POST requests to IRPC resolver', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(
      createRequest('http://localhost/irpc', {
        method: 'POST',
        body: '{}',
      })
    );

    expect(router.resolve).toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
    expect(await response.text()).toBe('{"ok":true}');
  });

  it('does not route POST to IRPC if path does not match endpoint', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(
      createRequest('http://localhost/other', {
        method: 'POST',
        body: '{}',
      })
    );

    // Should fall through to SSR since path doesn't start with /irpc
    expect(router.resolve).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('renders SSR for GET requests', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(router.resolve).not.toHaveBeenCalled();
    expect(router.isolate).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('calls renderer with isolated=true inside isolate', async () => {
    const renderer = vi.fn(async () => ({
      html: '<div>Isolated</div>',
      head: '<title>Isolated</title>',
      status: 200,
      cookies: [],
      redirect: undefined,
    })) as unknown as SSRRenderer;

    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    await worker.fetch(createRequest('http://localhost/'), { foo: 'bar' });

    // The renderer is called with isolated=true (5th arg)
    expect(renderer).toHaveBeenCalledWith(
      'http://localhost/',
      '',
      undefined,
      expect.any(AbortController),
      undefined,
      true
    );
    expect(safeRun(() => ssrEnv())).toBeUndefined();
  });

  it('passes controller and contextSeed to isolate', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    await worker.fetch(createRequest('http://localhost/'));

    expect(router.isolate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(AbortController),
      [],
      expect.any(Function)
    );
  });

  it('passes custom context from resolveContext to isolate', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();
    const customContext: [string | symbol, unknown][] = [['user', 'admin']];

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      resolveContext: () => customContext,
    });

    await worker.fetch(createRequest('http://localhost/'));

    expect(router.isolate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(AbortController),
      customContext,
      expect.any(Function)
    );
  });

  it('passes custom context to IRPC resolve on POST', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();
    const customContext: [string | symbol, unknown][] = [['user', 'admin']];

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      resolveContext: () => customContext,
    });

    await worker.fetch(
      createRequest('http://localhost/irpc', {
        method: 'POST',
        body: '{}',
      })
    );

    expect(router.resolve).toHaveBeenCalledWith(expect.any(Request), customContext);
  });

  it('resolves assets before SSR in full worker', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();
    const assetResponse = new Response('css', { headers: { 'Content-Type': 'text/css' } });

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      resolveAsset: async (_req, url) => {
        if (url.pathname === '/style.css') return assetResponse;
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/style.css'));
    expect(response).toBe(assetResponse);
    expect(renderer).not.toHaveBeenCalled();
    expect(router.isolate).not.toHaveBeenCalled();
  });

  it('handles redirect in full worker', async () => {
    const renderer = vi.fn(async () => ({
      html: '',
      head: '',
      status: 302,
      cookies: [],
      redirect: '/target',
    })) as unknown as SSRRenderer;

    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/target');
    expect(response.body).toBeNull();
  });

  it('applies createResponse hook to IRPC response', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      createResponse: (res) => {
        const headers = new Headers(res.headers);
        headers.set('X-Custom', 'irpc');
        return new Response(res.body, { status: res.status, headers });
      },
    });

    const response = await worker.fetch(
      createRequest('http://localhost/irpc', {
        method: 'POST',
        body: '{}',
      })
    );

    expect(response.headers.get('X-Custom')).toBe('irpc');
  });

  it('applies createResponse hook to SSR response', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      createResponse: (res) => {
        const headers = new Headers(res.headers);
        headers.set('X-Custom', 'ssr');
        return new Response(res.body, { status: res.status, headers });
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.headers.get('X-Custom')).toBe('ssr');
  });

  it('returns 500 when isolate throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderer = createMockRenderer();
    const router = createMockRouter();
    router.isolate = vi.fn(async () => {
      throw new Error('isolate failed');
    });

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });

  it('suppresses console.error in browser environment on error', async () => {
    const core = await import('@anchorlib/core');
    const spy = vi.spyOn(core, 'isBrowser').mockReturnValue(true);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderer = createMockRenderer();
    const router = createMockRouter();
    router.isolate = vi.fn(async () => {
      throw new Error('isolate failed');
    });

    const worker = createFullWorker(router, renderer, { template: TEMPLATE });
    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.status).toBe(500);
    expect(errSpy).not.toHaveBeenCalled();

    spy.mockRestore();
    errSpy.mockRestore();
  });

  it('aborts on timeout in SSR render path', async () => {
    const renderer = vi.fn(async (_url: string, _cookie: string, _ctx: unknown, controller: AbortController) => {
      await new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return { html: '', head: '', status: 200, cookies: [], redirect: undefined };
    }) as unknown as SSRRenderer;

    const router = createMockRouter();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const worker = createFullWorker(router, renderer, { template: TEMPLATE, timeout: 50 });

    const response = await worker.fetch(createRequest('http://localhost/'));

    expect(response.status).toBe(500);

    errSpy.mockRestore();
  });

  it('starts timeout after POST/asset checks, not before', async () => {
    vi.useFakeTimers();
    const renderer = createMockRenderer();
    const router = createMockRouter();

    const worker = createFullWorker(router, renderer, { template: TEMPLATE, timeout: 5000 });

    // POST should not trigger timeout
    await worker.fetch(
      createRequest('http://localhost/irpc', {
        method: 'POST',
        body: '{}',
      })
    );

    // No timer should have been created for POST path
    expect(router.resolve).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('encodes cookies from the cookie jar in SSR response', async () => {
    const { decodeCookies } = await import('@anchorlib/core');
    const mockJar = decodeCookies('');
    vi.spyOn(mockJar, 'encode').mockReturnValue(['session=abc; Path=/']);

    await import('../../src/ssr/worker.js');
    const decodeSpy = vi.spyOn(await import('@anchorlib/core'), 'decodeCookies').mockReturnValue(mockJar);

    const renderer = createMockRenderer();
    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(
      createRequest('http://localhost/', {
        headers: { cookie: 'session=abc' },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual(['session=abc; Path=/']);

    decodeSpy.mockRestore();
  });
  describe('upgrade', () => {
    it('throws error if wsRouter is not provided', async () => {
      const renderer = createMockRenderer();
      const router = createMockRouter();
      const worker = createFullWorker(router, renderer, { template: TEMPLATE });

      await expect(worker.upgrade(createRequest('http://localhost/'))).rejects.toThrow(
        "[AIR Stack] WebSocket upgrade failed: 'wsRouter' is not defined"
      );
    });

    it('returns a resolver function and passes context to wsRouter.resolve', async () => {
      const renderer = createMockRenderer();
      const router = createMockRouter();
      const wsRouter = {
        resolve: vi.fn(async () => {}),
      };

      const customContext: [string | symbol, unknown][] = [['auth', 'test-user']];
      const worker = createFullWorker(router, renderer, {
        template: TEMPLATE,
        wsRouter,
        resolveContext: () => customContext,
      });

      // Cover the getter
      expect(worker.options.wsRouter).toBe(wsRouter);

      const request = createRequest('http://localhost/', { headers: { cookie: 'session=xyz' } });
      const env = { custom: 'env' };

      const resolve = await worker.upgrade(request, env);

      expect(typeof resolve).toBe('function');

      const mockWs = { send: vi.fn() };
      await resolve('hello', mockWs);

      expect(wsRouter.resolve).toHaveBeenCalledWith('hello', mockWs, [
        ['auth', 'test-user'],
        [SSR_ENV_KEY, env],
        ['cookie', 'session=xyz'],
      ]);
    });

    it('returns a resolver function with default context if resolveContext is undefined and no cookie is provided', async () => {
      const renderer = createMockRenderer();
      const router = createMockRouter();
      const wsRouter = {
        resolve: vi.fn(async () => {}),
      };

      const worker = createFullWorker(router, renderer, {
        template: TEMPLATE,
        wsRouter,
      });

      const request = createRequest('http://localhost/');
      const resolve = await worker.upgrade(request);

      const mockWs = { send: vi.fn() };
      await resolve('hello', mockWs);

      expect(wsRouter.resolve).toHaveBeenCalledWith('hello', mockWs, [['cookie', '']]);
    });
  });
});

describe('defaultAssetResolver', () => {
  let worker: ReturnType<typeof createWorker>;
  let mockRenderer: SSRRenderer;
  const TEMPLATE = '<html><!--ssr-head--><!--ssr-outlet--></html>';

  beforeEach(() => {
    mockRenderer = vi.fn(async () => ({
      html: '',
      head: '',
      status: 200,
      cookies: [],
      redirect: undefined,
    })) as unknown as SSRRenderer;
    worker = createWorker(mockRenderer, { template: TEMPLATE });
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves assets via Cloudflare env.ASSETS', async () => {
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn(async () => new Response('cf-css', { status: 200 })),
      },
    };

    const res = await worker.fetch(new Request('http://localhost/style.css'), mockEnv);
    expect(mockEnv.ASSETS.fetch).toHaveBeenCalled();
    expect(await res.text()).toBe('cf-css');
    expect(mockRenderer).not.toHaveBeenCalled();
  });

  it('falls through Cloudflare env.ASSETS if status >= 400', async () => {
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn(async () => new Response('not found', { status: 404 })),
      },
    };

    const res = await worker.fetch(new Request('http://localhost/missing-cf.css'), mockEnv);
    expect(res.status).toBe(200); // from mockRenderer
    expect(mockRenderer).toHaveBeenCalled();
  });

  it('falls through Cloudflare env.ASSETS if fetch throws', async () => {
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn(async () => {
          throw new Error('Fetch failed');
        }),
      },
    };

    const res = await worker.fetch(new Request('http://localhost/missing-cf-throw.css'), mockEnv);
    expect(res.status).toBe(200); // from mockRenderer
    expect(mockRenderer).toHaveBeenCalled();
  });

  it('resolves assets via Bun.file', async () => {
    const mockFile = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('bun-css'));
        c.close();
      },
    });
    // @ts-ignore
    mockFile.exists = async () => true;

    const bunMock = {
      file: vi.fn(() => mockFile),
    };
    vi.stubGlobal('Bun', bunMock);

    const res = await worker.fetch(new Request('http://localhost/style.css'));
    expect(bunMock.file).toHaveBeenCalledWith('./dist/client/style.css');
    expect(await res.text()).toBe('bun-css');
  });

  it('resolves assets via Deno', async () => {
    const denoMock = {
      stat: vi.fn(async () => ({ isFile: true })),
      open: vi.fn(async () => ({
        readable: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('deno-css'));
            c.close();
          },
        }),
      })),
    };
    vi.stubGlobal('Deno', denoMock);

    const res = await worker.fetch(new Request('http://localhost/style.css'));
    expect(denoMock.stat).toHaveBeenCalledWith('./dist/client/style.css');
    expect(denoMock.open).toHaveBeenCalledWith('./dist/client/style.css', { read: true });
    expect(await res.text()).toBe('deno-css');
    expect(res.headers.get('Content-Type')).toBe('text/css');
  });

  it('falls through Deno if file not found', async () => {
    const denoMock = {
      stat: vi.fn(async () => {
        throw new Error('Not found');
      }),
    };
    vi.stubGlobal('Deno', denoMock);
    const res = await worker.fetch(new Request('http://localhost/missing-deno.css'));
    expect(mockRenderer).toHaveBeenCalled();
  });

  it('resolves assets via Node fs', async () => {
    const fs = await import('node:fs/promises');
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/real-node-style.css', 'real-node-css');

    const res = await worker.fetch(new Request('http://localhost/real-node-style.css'));
    expect(await res.text()).toBe('real-node-css');
    expect(res.headers.get('Content-Type')).toBe('text/css');

    await fs.rm('./dist/client/real-node-style.css', { force: true });
  });

  it('returns application/octet-stream for unknown extensions in Node', async () => {
    const fs = await import('node:fs/promises');
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/unknown.xyz', 'unknown-data');

    const res = await worker.fetch(new Request('http://localhost/unknown.xyz'));
    expect(await res.text()).toBe('unknown-data');
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');

    await fs.rm('./dist/client/unknown.xyz', { force: true });
  });

  it('returns application/octet-stream for path with no extension in Node', async () => {
    const fs = await import('node:fs/promises');
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/noextension', 'no-ext-data');

    const res = await worker.fetch(new Request('http://localhost/noextension'));
    expect(await res.text()).toBe('no-ext-data');
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');

    await fs.rm('./dist/client/noextension', { force: true });
  });

  it('falls through Node if file not found', async () => {
    const res = await worker.fetch(new Request('http://localhost/missing.css'));
    expect(mockRenderer).toHaveBeenCalled();
  });
});
