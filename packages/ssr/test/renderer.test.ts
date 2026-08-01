import { AsyncStore } from '@anchorlib/core';
import { GuardError, NotFoundError, ProviderError, Redirect, type Router } from '@anchorlib/router';
import { describe, expect, it, vi } from 'vitest';
import { createRenderer, ssrRenderToString } from '../src/index.js';
import type { SSRRenderView } from '../src/types.js';

describe('ssrRenderToString', () => {
  const mockRenderView: SSRRenderView = vi.fn(async () => ({ html: '<div></div>', head: '<title>Test</title>' }));

  function createMockRouter(options?: any): Router {
    return {
      activate: vi.fn(),
      createHydrationScript: vi.fn(() => '<script>hydrate()</script>'),
      sitemap: vi.fn(async () => '<urlset></urlset>'),
      cleanup: vi.fn(),
      context: options?.context || {},
    } as any;
  }

  it('handles sitemap request when configured with object', async () => {
    const router = createMockRouter();
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/sitemap.xml', undefined, {
      sitemap: {},
    });

    expect(result.html).toBe('<urlset></urlset>');
    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.status).toBe(200);
  });

  it('handles sitemap request when configured with true', async () => {
    const router = createMockRouter();
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/sitemap.xml', undefined, {
      sitemap: true,
    });

    expect(result.html).toBe('<urlset></urlset>');
    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.status).toBe(200);
  });

  it('handles sitemap request with relative url', async () => {
    const router = createMockRouter();
    const result = await ssrRenderToString(router, mockRenderView, '/sitemap.xml', undefined, { sitemap: {} });

    expect(result.html).toBe('<urlset></urlset>');
    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.status).toBe(200);
  });

  it('handles sitemap request with relative url without leading slash', async () => {
    const router = createMockRouter();
    const result = await ssrRenderToString(router, mockRenderView, 'sitemap.xml', undefined, { sitemap: {} });

    expect(result.html).toBe('<urlset></urlset>');
    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.status).toBe(200);
  });

  it('ignores sitemap request when sitemap is false', async () => {
    const router = createMockRouter();
    await ssrRenderToString(router, mockRenderView, 'http://localhost/sitemap.xml', undefined, { sitemap: false });

    expect(router.sitemap).not.toHaveBeenCalled();
  });

  it('renders successfully', async () => {
    const router = createMockRouter();
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/');

    expect(result.html).toBe('<div></div>');
    expect(result.head).toBe('<title>Test</title><script>hydrate()</script>');
    expect(result.status).toBe(200);
    expect(router.cleanup).toHaveBeenCalled();
  });

  it('handles NotFoundError exception from router', async () => {
    const router = createMockRouter({ context: { exception: new NotFoundError('Not found') } });
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/');

    expect(result.status).toBe(404);
  });

  it('handles GuardError exception from router', async () => {
    const router = createMockRouter({ context: { exception: new GuardError('Forbidden') } });
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/');

    expect(result.status).toBe(403);
  });

  it('handles ProviderError exception from router', async () => {
    const router = createMockRouter({ context: { exception: new ProviderError('Bad Request') } });
    const result = await ssrRenderToString(router, mockRenderView, 'http://localhost/');

    expect(result.status).toBe(400);
  });

  it('handles Redirect error from renderView', async () => {
    const router = createMockRouter();
    const redirectRenderView = vi.fn(async () => {
      throw new Redirect({ path: '/login' } as any);
    });

    const result = await ssrRenderToString(router, redirectRenderView, 'http://localhost/');

    expect(result.status).toBe(302);
    expect(result.redirect).toBe('/login');
  });

  it('handles generic error from renderView', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createMockRouter();
    const errorRenderView = vi.fn(async () => {
      throw new Error('Boom');
    });

    const result = await ssrRenderToString(router, errorRenderView, 'http://localhost/');

    expect(result.status).toBe(500);
    expect(result.html).toContain('Internal SSR Render Error');
    vi.restoreAllMocks();
  });
});

describe('createRenderer', () => {
  const mockRenderView: SSRRenderView = vi.fn(async () => ({ html: '<div></div>', head: '<title>Test</title>' }));
  function createMockRouter(): Router {
    return {
      activate: vi.fn(),
      createHydrationScript: vi.fn(() => ''),
      cleanup: vi.fn(),
      context: {},
    } as any;
  }

  it('calls ssrRenderToString directly when isolated is true', async () => {
    const router = createMockRouter();
    const renderer = createRenderer(router, mockRenderView);

    const result = await renderer({ url: 'http://localhost/', isolated: true });

    expect(result.html).toBe('<div></div>');
    expect(result.cookies).toBeUndefined(); // ssrRenderToString doesn't return cookies
  });

  it('wraps ssrRenderToString with isolation and cookies when isolated is false', async () => {
    const router = createMockRouter();
    const renderer = createRenderer(router, mockRenderView);

    const result = await renderer({ url: 'http://localhost/', cookie: 'session=abc' });

    expect(result.html).toBe('<div></div>');
    expect(result.cookies).toEqual(expect.any(Array));
  });

  it('uses provided AsyncStore context', async () => {
    const router = createMockRouter();
    const renderer = createRenderer(router, mockRenderView);
    const store = new AsyncStore([]);

    const result = await renderer({ url: 'http://localhost/', context: store });
    expect(result.html).toBe('<div></div>');
  });
});
