/** @jsxImportSource solid-js */

import * as core from '@airlib/core';
import { AsyncStore, setAsyncScope } from '@airlib/core';
import { ALS_INSTANCE } from '@airlib/core/server';
import { createRouter, GuardError, NotFoundError, ProviderError, Redirect } from '@airlib/router';
import { createRoot, type JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headings, page, Title, UIRouter } from '../../src/index.js';
import { createApp, createSSR } from '../../src/ssr/index.js';

vi.mock('solid-js/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('solid-js/web')>()),
  renderToString: (fn: () => unknown) => {
    if (typeof fn === 'function') {
      createRoot((dispose) => {
        const res = fn();
        if (Array.isArray(res)) {
          for (const item of res) {
            if (typeof item === 'function') (item as () => void)();
          }
        }
        dispose();
      });
    }
    return '<div></div>';
  },
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

    const output = await ssr({ url: 'http://localhost/', cookie: '' });

    expect(output.html).toBe('<div></div>');
    expect(output.head).toContain('');
    expect(output.status).toBe(200);
    expect(output.cookies).toEqual([]);
    expect(output.redirect).toBeUndefined();
  });

  it('supports positional url and cookie string parameters', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const ssr = createSSR(router, RootLayout);
    const output = await (ssr as any)('http://localhost/', 'session=123');

    expect(output.status).toBe(200);
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

    const output = await ssr({ url: 'http://localhost/not-found', cookie: '' });
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

    const output = await ssr({ url: 'http://localhost/forbidden', cookie: '' });
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

    const output = await ssr({ url: 'http://localhost/bad-request', cookie: '' });
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

    const output = await ssr({ url: 'http://localhost/', cookie: '' });
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

    const output = await ssr({ url: 'http://localhost/', cookie: '' });
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

    const output = await ssr({ url: 'http://localhost/', cookie: '', context: store });
    expect(output.status).toBe(200);
  });

  it('renders in isolated mode without withIsolation', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route();
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{props.children as any}</div>);

    const ssr = createSSR(router, RootLayout);

    const output = await ssr({ url: 'http://localhost/', cookie: '', isolated: true });

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
    const output = await ssr({ url: 'http://localhost/sitemap.xml', cookie: '' });

    expect(output.status).toBe(200);
    expect(output.contentType).toBe('application/xml; charset=utf-8');
    expect(output.html).toContain('<loc>https://example.com/about</loc>');

    const ssrDisabled = createSSR(router, RootLayout, { sitemap: false });
    const disabledOutput = await ssrDisabled({ url: 'http://localhost/sitemap.xml', cookie: '' });
    expect(disabledOutput.contentType).toBeUndefined();

    const ssrDefault = createSSR(router, RootLayout);
    const defaultOutput = await ssrDefault({ url: '/sitemap.xml', cookie: '' });
    expect(defaultOutput.contentType).toBe('application/xml; charset=utf-8');
    expect(defaultOutput.html).toContain('<loc>http://localhost/about</loc>');

    const noSlashOutput = await ssrDefault({ url: 'sitemap.xml', cookie: '' });
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
  let isBrowserSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    isBrowserSpy = vi.spyOn(core, 'isBrowser').mockReturnValue(false);
  });

  afterEach(() => {
    isBrowserSpy.mockRestore();
    headings().clear();
  });

  it('creates an app with root entry component', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route('/');
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => (
      <div>
        <Title>App Title</Title>
        {(props as any).children}
      </div>
    ));

    const Entry = (props: { url?: string }) => <UIRouter router={router} root={RootLayout} url={props.url} />;
    const app = createApp(router, Entry, { template: '<!--ssr-outlet-->' });
    expect(app.fetch).toBeTypeOf('function');

    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div></div>');
  });

  it('creates an app with default options', async () => {
    const router = createRouter<JSX.Element>();
    const rootRoute = router.route('/');
    const RootLayout = page(rootRoute);
    RootLayout.render((props) => <div>{(props as any).children as any}</div>);

    const Entry = (props: { url?: string }) => <UIRouter router={router} root={RootLayout} url={props.url} />;
    const app = createApp(router, Entry);
    expect(app.fetch).toBeTypeOf('function');

    const res = await app.fetch(new Request('http://localhost/'));
    expect(res.status).toBe(200);
  });
});
