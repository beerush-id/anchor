/** @jsxImportSource solid-js */

import { AsyncStore, setAsyncScope } from '@airlib/core';
import { ALS_INSTANCE } from '@airlib/core/server';
import { createRouter, GuardError, NotFoundError, ProviderError, Redirect } from '@airlib/router';
import type { JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, UIRouter } from '../../src/index.js';
import { createApp, createSSR } from '../../src/ssr/index.js';

vi.mock('solid-js/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('solid-js/web')>()),
  renderToString: () => '<div></div>',
}));

setAsyncScope(ALS_INSTANCE);

describe('createSSR', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('renders standard output successfully', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const ssr = createSSR(router, RootLayout);

    const output = await ssr('http://localhost/', '');

    expect(output.html).toBe('<div></div>');
    expect(output.head).toContain('');
    expect(output.status).toBe(200);
    expect(output.cookies).toEqual([]);
    expect(output.redirect).toBeUndefined();
  });

  it('handles NotFoundError', async () => {
    const router = createRouter<JSX.Element>();
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
    const router = createRouter<JSX.Element>();
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
    const router = createRouter<JSX.Element>();
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
    const router = createRouter<JSX.Element>();
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
    vi.stubGlobal('window', undefined);

    const router = createRouter<JSX.Element>();
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

    vi.unstubAllGlobals();
    errSpy.mockRestore();
  });

  it('supports passing an AsyncStore as context', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);

    const store = new AsyncStore();
    const ssr = createSSR(router, RootLayout);

    const output = await ssr('http://localhost/', '', store);
    expect(output.status).toBe(200);
  });

  it('renders in isolated mode without withIsolation', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const ssr = createSSR(router, RootLayout);

    // Call with isolated=true (5th arg) — internal path used by createFullWorker
    const output = await (ssr as any)('http://localhost/', '', undefined, undefined, undefined, true);

    expect(output.html).toBe('<div></div>');
    expect(output.head).toContain('');
    expect(output.status).toBe(200);
    expect(output.cookies).toBeUndefined();
  });

  it('handles automatic sitemap interception and options', async () => {
    const router = createRouter<JSX.Element>({ baseUrl: 'http://localhost' });
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render(() => <div>Root</div>);
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
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const ssr = createSSR(router, RootLayout);
    const output = await ssr({ url: 'http://localhost/', cookie: '' });

    expect(output.html).toBe('<div></div>');
    expect(output.status).toBe(200);
  });
});

describe('createApp', () => {
  it('creates an app with root entry component', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const Entry = (props: { url?: string }) => <UIRouter router={router} root={RootLayout} url={props.url} />;
    const app = createApp(router, Entry, { template: '<!--ssr-outlet-->' });
    expect(app.fetch).toBeTypeOf('function');

    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div></div>');
  });
});
