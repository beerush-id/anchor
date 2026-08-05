import '../../src/client/index.js';
import { AsyncStore, setAsyncScope } from '@anchorlib/core';
import { ALS_INSTANCE } from '@anchorlib/core/server';
import { createRouter, GuardError, NotFoundError, ProviderError, Redirect } from '@anchorlib/router';
import type { HTMLAttributes, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, setup, UIRouter } from '../../src/index.js';
import { createApp, createSSR } from '../../src/ssr/index.js';

setAsyncScope(ALS_INSTANCE);

describe('createSSR', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders standard output successfully', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);

    const ssr = createSSR(router, RootLayout);

    const output = await ssr('http://localhost/', '');

    expect(output.html).toBe('<div></div>');
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

    const ssr = createSSR(router, RootLayout);

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

    const ssr = createSSR(router, RootLayout);

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

    const ssr = createSSR(router, RootLayout);

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

    const ssr = createSSR(router, RootLayout);

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

    const ssr = createSSR(router, RootLayout);

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
    const ssr = createSSR(router, RootLayout);

    const output = await ssr('http://localhost/', '', store);
    expect(output.status).toBe(200);
  });

  it('renders in isolated mode without withIsolation', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);

    const ssr = createSSR(router, RootLayout);

    // Call with isolated=true (5th arg) — this is the internal path used by createFullWorker
    const output = await (ssr as any)('http://localhost/', '', undefined, undefined, undefined, true);

    expect(output.html).toBe('<div></div>');
    expect(output.status).toBe(200);
    // Isolated mode does not return cookies
    expect(output.cookies).toBeUndefined();
  });

  it('renders with shell given', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);
    const Shell = setup<HTMLAttributes<HTMLElement>>((props) => <div className="shell">{props.children}</div>);

    const ssr = createSSR(router, RootLayout);

    // Call with isolated=true (5th arg) — this is the internal path used by createFullWorker
    const output = await (ssr as any)('http://localhost/', '', undefined, undefined, Shell, true);

    expect(output.html).toBe('<div class="shell"><div></div></div>');
    expect(output.status).toBe(200);
    // Isolated mode does not return cookies
    expect(output.cookies).toBeUndefined();
  });

  it('handles automatic sitemap interception and options', async () => {
    const router = createRouter<ReactNode>({ baseUrl: 'http://localhost' });
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(() => <div>Root</div>);
    rootRoute.route('/about');

    const ssr = createSSR(router, RootLayout, { sitemap: { baseUrl: 'https://example.com' } });
    const output = await ssr('http://localhost/sitemap.xml', '');

    expect(output.status).toBe(200);
    expect(output.contentType).toBe('application/xml; charset=utf-8');
    expect(output.html).toContain('<loc>https://example.com/about</loc>');

    const ssrDisabled = createSSR(router, RootLayout, { sitemap: false });
    const disabledOutput = await ssrDisabled('http://localhost/sitemap.xml', '');
    expect(disabledOutput.contentType).toBeUndefined();

    const ssrDefault = createSSR(router, RootLayout);
    const defaultOutput = await ssrDefault('/sitemap.xml', '');
    expect(defaultOutput.contentType).toBe('application/xml; charset=utf-8');
    expect(defaultOutput.html).toContain('<loc>http://localhost/about</loc>');

    const noSlashOutput = await ssrDefault('sitemap.xml', '');
    expect(noSlashOutput.contentType).toBe('application/xml; charset=utf-8');
  });

  it('supports passing SSRRenderOptions object', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);

    const ssr = createSSR(router, RootLayout);
    const output = await ssr({ url: 'http://localhost/', cookie: '' });

    expect(output.html).toBe('<div></div>');
    expect(output.status).toBe(200);
  });
});

describe('createApp', () => {
  it('creates an app with root layout', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);
    const Entry = ({ url }: { url?: string }) => <UIRouter router={router} root={RootLayout} url={url} headless={true} />;

    const app = createApp(router, Entry, { template: '<!--ssr-outlet-->' });
    expect(app.fetch).toBeTypeOf('function');

    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div></div>');
  });

  it('creates an app with shell', async () => {
    const router = createRouter<ReactNode>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute).render(({ children }) => <div>{children}</div>);
    const Shell = setup<HTMLAttributes<HTMLElement>>((props) => <div className="shell">{props.children}</div>);
    const Entry = ({ url }: { url?: string }) => (
      <Shell>
        <UIRouter router={router} root={RootLayout} url={url} headless={true} />
      </Shell>
    );

    const app = createApp(router, Entry, { template: '<!--ssr-outlet-->' });
    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div class="shell"><div></div></div>');
  });
});
