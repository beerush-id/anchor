import '../../src/server/index.js';
import '../../src/client/index.js';
import { AsyncStore } from '@anchorlib/core';
import { createRouter, GuardError, NotFoundError, ProviderError, Redirect } from '@anchorlib/router';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from '../../src/router/index.js';
import { createSSR } from '../../src/ssr/index.js';

describe('createSSR', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders standard output successfully', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);

    const renderer = vi.fn((node: ReactNode) => {
      return Array.isArray(node) ? '<head></head>' : '<html><body>Test</body></html>';
    });

    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/', '');

    expect(output.html).toBe('<html><body>Test</body></html>');
    expect(output.head).toContain('<head></head>');
    expect(output.status).toBe(200);
    expect(output.cookies).toEqual([]);
    expect(output.redirect).toBeUndefined();
  });

  it('handles NotFoundError', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    vi.spyOn(router, 'activate').mockImplementation(async () => {
      router.context.exception = new NotFoundError('Not found');
      return [];
    });

    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/not-found', '');
    expect(output.status).toBe(404);
  });

  it('handles GuardError', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    vi.spyOn(router, 'activate').mockImplementation(async () => {
      router.context.exception = new GuardError('Forbidden');
      return [];
    });

    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/forbidden', '');
    expect(output.status).toBe(403);
  });

  it('handles ProviderError', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    vi.spyOn(router, 'activate').mockImplementation(async () => {
      router.context.exception = new ProviderError('Bad Request');
      return [];
    });

    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/bad-request', '');
    expect(output.status).toBe(400);
  });

  it('handles Redirect', async () => {
    const router = createRouter<ReactNode>();
    const targetRoute = router.route('/target');
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    vi.spyOn(router, 'activate').mockImplementation(async () => {
      throw new Redirect(targetRoute as never, {} as never, { ref: 'test' } as never);
    });

    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/', '');
    expect(output.redirect).toBe('/target?ref=test');
  });

  it('handles general errors', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    vi.spyOn(router, 'activate').mockImplementation(async () => {
      throw new Error('Internal Error');
    });

    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/', '');
    expect(output.status).toBe(500);
    expect(output.html).toBe('<h1>Internal SSR Render Error.</h1>');
    expect(output.head).toBe('');
    expect(errSpy).toHaveBeenCalledWith(new Error('Internal Error'));

    errSpy.mockRestore();
  });

  it('supports passing an AsyncStore as context', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    const store = new AsyncStore();
    const renderer = vi.fn(() => '');
    const ssr = createSSR(renderer, router, RootLayout);

    const output = await ssr('http://localhost/', '', store);
    expect(output.status).toBe(200);
  });

  it('renders in isolated mode without withIsolation', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);

    const renderer = vi.fn((node: ReactNode) => {
      return Array.isArray(node) ? '<head></head>' : '<html><body>Isolated</body></html>';
    });

    const ssr = createSSR(renderer, router, RootLayout);

    // Call with isolated=true (5th arg) — this is the internal path used by createFullWorker
    const output = await (ssr as any)('http://localhost/', '', undefined, undefined, true);

    expect(output.html).toBe('<html><body>Isolated</body></html>');
    expect(output.head).toContain('<head></head>');
    expect(output.status).toBe(200);
    // Isolated mode does not return cookies
    expect(output.cookies).toBeUndefined();
  });
});
