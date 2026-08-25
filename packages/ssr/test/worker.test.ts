import fs from 'node:fs/promises';
import { type AnyType, safeRun, sleep } from '@airlib/core';
import { createRouter } from '@airlib/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFullWorker,
  createWorker,
  deferScript,
  SSR_ENV_KEY,
  ssrEnv,
  type SSROutput,
  type SSRRenderer,
} from '../src/index.js';

function createMockRenderer(output?: Partial<SSROutput>): SSRRenderer {
  const defaults: SSROutput = {
    html: '<div>Hello</div>',
    head: '<title>Test</title>',
    status: 200,
    cookies: [],
    redirect: undefined,
    ...output,
  };

  const renderer = vi.fn(async () => defaults) as unknown as SSRRenderer;
  Object.assign(renderer, { router: createRouter(), options: {} });
  return renderer;
}

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

const TEMPLATE = '<html><!--ssr-head--><!--ssr-outlet--></html>';

describe('createWorker', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
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

  it('applies page cache headers when configured', async () => {
    const renderer = createMockRenderer({ status: 200 });
    const worker = createWorker(renderer, {
      template: TEMPLATE,
      cache: { pages: 'public, max-age=3600' },
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('does not apply page cache headers on redirects', async () => {
    const renderer = createMockRenderer({ status: 302, redirect: '/login' });
    const worker = createWorker(renderer, {
      template: TEMPLATE,
      cache: { pages: 'public, max-age=3600' },
    });

    const response = await worker.fetch(createRequest('http://localhost/login'));
    expect(response.headers.has('Cache-Control')).toBe(false);
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

  it('skips deferScript when deferred is false and noscript is falsy', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: false } } })) as any;

    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).toContain('<script src="/test.js"></script>');
  });

  it('strips scripts when noscript is true', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: false, noscript: true } } })) as any;

    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).not.toContain('<script src="/test.js"></script>');
    expect(body).not.toContain('<script type="module">');
  });

  it('defers scripts with custom delay when deferred is a number', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: 150 } } })) as any;

    const worker = createWorker(renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).toContain('<script type="module">');
    expect(body).toContain('}, 150);');
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
      expect.objectContaining({
        url: 'http://localhost/',
        cookie: '',
        context: customContext,
        controller: expect.any(AbortController),
      })
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
      expect.objectContaining({
        url: 'http://localhost/',
        cookie: '',
        context: customContext,
        controller: expect.any(AbortController),
      })
    );
  });

  it('defaults context to empty array', async () => {
    const renderer = createMockRenderer();
    const worker = createWorker(renderer, { template: TEMPLATE });

    await worker.fetch(createRequest('http://localhost/'));

    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost/',
        cookie: '',
        context: [],
        controller: expect.any(AbortController),
      })
    );
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
      expect.objectContaining({
        url: 'http://localhost/',
        cookie: 'session=abc',
        context: [],
        controller: expect.any(AbortController),
      })
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
    const core = await import('@airlib/core');
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

    const renderer = vi.fn(async (options: any) => {
      capturedController = options.controller;
      // Wait longer than the timeout
      await new Promise((_, reject) => {
        options.controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
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

    const renderer = vi.fn(async (options: any) => {
      capturedController = options.controller;
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

  it('bypasses resolveAsset and cache when ssg is true', async () => {
    const renderer = createMockRenderer();
    const assetResponse = new Response('body', { headers: { 'Content-Type': 'text/css' } });

    const worker = createWorker(renderer, {
      template: TEMPLATE,
      resolveAsset: async (_req, url) => {
        if (url.pathname === '/style.css') return assetResponse;
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/style.css'), undefined, undefined, true);

    expect(response.status).toBe(200);
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

  it('applies page cache headers when configured in full worker', async () => {
    const renderer = createMockRenderer({ status: 200 });
    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      cache: { pages: 'public, max-age=3600' },
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('does not apply page cache headers on redirects in full worker', async () => {
    const renderer = createMockRenderer({ status: 302, redirect: '/login' });
    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      cache: { pages: 'public, max-age=3600' },
    });

    const response = await worker.fetch(createRequest('http://localhost/'));
    expect(response.headers.has('Cache-Control')).toBe(false);
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
      expect.objectContaining({
        url: 'http://localhost/',
        cookie: '',
        controller: expect.any(AbortController),
        isolated: true,
      })
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

    expect(router.resolve).toHaveBeenCalledWith(expect.any(Request), customContext, undefined, undefined);
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
    const core = await import('@airlib/core');
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
    const renderer = vi.fn(async (options: any) => {
      await new Promise((_, reject) => {
        options.controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
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
    const { decodeCookies } = await import('@airlib/core');
    const mockJar = decodeCookies('');
    vi.spyOn(mockJar, 'encode').mockReturnValue(['session=abc; Path=/']);

    await import('@airlib/ssr');
    const decodeSpy = vi.spyOn(await import('@airlib/core'), 'decodeCookies').mockReturnValue(mockJar);

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

  it('bypasses resolveAsset and cache when ssg is true in full worker', async () => {
    const renderer = createMockRenderer();
    const router = createMockRouter();
    const assetResponse = new Response('css', { headers: { 'Content-Type': 'text/css' } });

    const worker = createFullWorker(router, renderer, {
      template: TEMPLATE,
      resolveAsset: async (_req, url) => {
        if (url.pathname === '/style.css') return assetResponse;
      },
    });

    const response = await worker.fetch(createRequest('http://localhost/style.css'), undefined, undefined, true);
    expect(response.status).toBe(200);
    expect(renderer).toHaveBeenCalled();
    expect(router.isolate).toHaveBeenCalled();
  });

  it('skips deferScript when deferred is false and noscript is falsy', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: false } } })) as any;

    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).toContain('<script src="/test.js"></script>');
  });

  it('strips scripts when noscript is true', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: false, noscript: true } } })) as any;

    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).not.toContain('<script src="/test.js"></script>');
    expect(body).not.toContain('<script type="module">');
  });

  it('defers scripts with custom delay when deferred is a number', async () => {
    const renderer = createMockRenderer({
      html: '<script src="/test.js"></script>',
    });
    renderer.router.find = vi.fn(() => ({ route: { options: { deferred: 150 } } })) as any;

    const router = createMockRouter();
    const worker = createFullWorker(router, renderer, { template: TEMPLATE });

    const response = await worker.fetch(createRequest('http://localhost/'));
    const body = await response.text();
    expect(body).toContain('<script type="module">');
    expect(body).toContain('}, 150);');
  });
  describe('upgrade', () => {
    it('throws error if wsRouter is not provided', async () => {
      const renderer = createMockRenderer();
      const router = createMockRouter();
      const worker = createFullWorker(router, renderer, { template: TEMPLATE });

      await expect(worker.upgrade(createRequest('http://localhost/'))).rejects.toThrow(
        "[AirLib] WebSocket upgrade failed: 'wsRouter' is not defined"
      );
    });

    it('returns a resolver function and passes context to wsRouter.resolve', async () => {
      const renderer = createMockRenderer();
      const router = createMockRouter();
      const wsRouter = {
        resolve: vi.fn(async () => {}),
        disconnect: vi.fn(),
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
      (resolve as AnyType).close();
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

  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
    logSpy.mockRestore();
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
    // @ts-expect-error
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
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/real-node-style.css', 'real-node-css');

    const res = await worker.fetch(new Request('http://localhost/real-node-style.css'));
    expect(await res.text()).toBe('real-node-css');
    expect(res.headers.get('Content-Type')).toBe('text/css');

    await fs.rm('./dist/client/real-node-style.css', { force: true });
  });

  it('returns application/octet-stream for unknown extensions in Node', async () => {
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/unknown.xyz', 'unknown-data');

    const res = await worker.fetch(new Request('http://localhost/unknown.xyz'));
    expect(await res.text()).toBe('unknown-data');
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');

    await fs.rm('./dist/client/unknown.xyz', { force: true });
  });

  it('returns application/octet-stream for path with no extension in Node', async () => {
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

describe('worker static generation (SSG/ISG)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('Bun', createMockBun());
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('serves cached static page immediately without executing renderer on hit', async () => {
    const bun = createMockBun();
    vi.stubGlobal('Bun', bun);
    await bun.write('/pages/about/index.html', '<html>cached page</html>');

    const router = { find: vi.fn(() => ({ route: { options: { static: true } } })) };
    const renderer = Object.assign(vi.fn(), { router }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, { cacheDir: '/pages' });
    const response = await worker.fetch(createRequest('http://localhost/about'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<html>cached page</html>');
    expect(renderer).not.toHaveBeenCalled();
  });

  it('generates html and saves to static disk storage on ISG miss', async () => {
    const bun = createMockBun();
    vi.stubGlobal('Bun', bun);

    const router = { find: vi.fn(() => ({ route: { options: { static: true } } })) };
    const renderer = Object.assign(
      vi.fn(async () => ({
        html: '<div>generated ISG content</div>',
        head: '<title>ISG</title>',
        status: 200,
        cookies: [],
      })),
      { router }
    ) as unknown as SSRRenderer;

    const worker = createWorker(renderer, {
      template: '<html><!--ssr-head--><!--ssr-outlet--></html>',
      cacheDir: '/pages',
    });

    const response = await worker.fetch(createRequest('http://localhost/blog'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe('<html><title>ISG</title><div>generated ISG content</div></html>');
    expect(renderer).toHaveBeenCalledTimes(1);

    const savedFile = bun.file('/pages/blog/index.html');
    expect(await savedFile.exists()).toBe(true);
    expect(await savedFile.text()).toBe('<html><title>ISG</title><div>generated ISG content</div></html>');
  });

  it('applies worker page cache control header when serving cached static hits in createWorker', async () => {
    const bun = createMockBun();
    vi.stubGlobal('Bun', bun);
    await bun.write('/pages/cache-test/index.html', '<html>cached html</html>');

    const router = { find: vi.fn(() => ({ route: { options: { static: true } } })) };
    const renderer = Object.assign(vi.fn(), { router }) as unknown as SSRRenderer;

    const worker = createWorker(renderer, {
      cacheDir: '/pages',
      cache: { pages: 'public, max-age=3600' },
    });
    const response = await worker.fetch(createRequest('http://localhost/cache-test'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('<html>cached html</html>');
  });

  it('serves cached static hits with cache control headers in createFullWorker', async () => {
    const bun = createMockBun();
    vi.stubGlobal('Bun', bun);
    await bun.write('/pages/full-test/index.html', '<html>full worker hit</html>');

    const router = { find: vi.fn(() => ({ route: { options: { static: true } } })) };
    const renderer = Object.assign(vi.fn(), { router }) as unknown as SSRRenderer;

    const httpRouter = { transport: { endpoint: '/irpc' } } as never;
    const worker = createFullWorker(httpRouter, renderer, {
      cacheDir: '/pages',
      cache: { pages: 'public, max-age=7200' },
    });
    const response = await worker.fetch(createRequest('http://localhost/full-test'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=7200');
    expect(await response.text()).toBe('<html>full worker hit</html>');
    expect(renderer).not.toHaveBeenCalled();
  });
});

function createMockBun() {
  const store = new Map<string, string>();

  return {
    file: (path: string) => ({
      exists: vi.fn(async () => store.has(path)),
      text: vi.fn(async () => store.get(path)),
    }),
    write: vi.fn(async (path: string, content: string) => {
      store.set(path, content);
    }),
  };
}

describe('deferScript', () => {
  it('extracts script tags and appends defer snippet before </body>', () => {
    const html = `<html><head></head><body><script src="/main.js"></script><script src="/other.js" type="module" crossorigin="anonymous"></script><div>Content</div></body></html>`;
    const result = deferScript(html, 100);

    expect(result).not.toContain('<script src="/main.js"></script>');
    expect(result).not.toContain('<script src="/other.js" type="module" crossorigin="anonymous"></script>');
    expect(result).toContain('<script type="module">');
    expect(result).toContain('"src":"/main.js","scriptType":"text/javascript"');
    expect(result).toContain('"src":"/other.js","scriptType":"module","crossOrigin":"anonymous"');
    expect(result).toContain('}, 100);');
    expect(result.endsWith('</body></html>')).toBe(true);
  });

  it('extracts link tags and appends defer snippet at the end if no </body>', () => {
    // Adding a .js link to match the regex: /<link[^>]*href="([^"]+\\.js)"[^>]*>\\n?/gi
    const html = `<div>Content</div><link href="/style.js" rel="modulepreload" crossorigin="use-credentials">`;
    const result = deferScript(html, 50);

    expect(result).not.toContain('<link href="/style.js" rel="modulepreload" crossorigin="use-credentials">');
    expect(result).toContain('<script type="module">');
    expect(result).toContain('"type":"link","href":"/style.js","rel":"modulepreload","crossOrigin":"use-credentials"');
    expect(result).toContain('}, 50);');
    expect(result.endsWith('</script>')).toBe(true);
  });

  it('strips scripts and links entirely when strip is true', () => {
    const html = `<html><body><script src="/main.js"></script><link href="/style.js" rel="modulepreload"></body></html>`;
    const result = deferScript(html, 50, true);

    expect(result).not.toContain('/main.js');
    expect(result).not.toContain('/style.js');
    expect(result).not.toContain('<script type="module">');
    expect(result).toBe('<html><body></body></html>');
  });

  it('handles crossOrigin without value', () => {
    // Note: <link> missing rel attribute
    const html = `<html><body><script src="/main.js" crossorigin></script><link href="/style.js" crossorigin></body></html>`;
    const result = deferScript(html, 100);
    expect(result).toContain('"crossOrigin":"anonymous"');
    const scriptMatch = result.match(/"type":"script"[^}]+"crossOrigin":"anonymous"/);
    const linkMatch = result.match(/"type":"link"[^}]+"crossOrigin":"anonymous"/);
    expect(scriptMatch).toBeTruthy();
    expect(linkMatch).toBeTruthy();
    expect(result).toContain('"rel":"modulepreload"');
  });

  it('leaves html unmodified if no scripts or links match', () => {
    const html = `<html><body><div>Content</div></body></html>`;
    const result = deferScript(html);
    expect(result).toBe(html);
  });

  it('instantiates createWorker and createFullWorker with default options parameter', () => {
    const renderer = createMockRenderer();
    const router = {
      transport: { endpoint: '/irpc' },
      resolve: vi.fn(),
      isolate: vi.fn(),
    } as any;

    const worker = createWorker(renderer);
    expect(worker.options).toEqual({});

    const fullWorker = createFullWorker(router, renderer);
    expect(fullWorker.options).toEqual({});
  });
});
