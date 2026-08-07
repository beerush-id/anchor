import {
  AsyncStore,
  COOKIE_JAR_WRITABLE,
  createLifecycle,
  decodeCookies,
  getCookieJar,
  isBrowser,
  setCookieContext,
  setScope,
  withIsolation,
} from '@anchorlib/core';
import { GuardError, NotFoundError, ProviderError, Redirect, type Router, redirectUrl } from '@anchorlib/router';
import type {
  RouterOptions,
  SSRContext,
  SSROptions,
  SSROutput,
  SSRRenderer,
  SSRRenderOptions,
  SSRRenderStringOptions,
  SSRRenderView,
} from './types.js';

export function createRenderer(
  router: Router,
  renderView: SSRRenderView,
  defaultOptions?: SSROptions & Omit<RouterOptions, 'router'>
): SSRRenderer {
  const renderer = ((options: SSRRenderOptions) => {
    const mergedOptions = options.options ?? defaultOptions;

    if (options.isolated) {
      return ssrRenderToString({
        router,
        renderView,
        url: options.url,
        controller: options.controller,
        options: mergedOptions,
        hydrated: options.hydrated,
      }) as Promise<SSROutput>;
    }

    const storage =
      options.context instanceof AsyncStore ? options.context : new AsyncStore(options.context as SSRContext);

    return withIsolation(
      async () => {
        let cookies: string[] = [];

        const jar = getCookieJar() ?? decodeCookies(options.cookie ?? '');
        setScope(COOKIE_JAR_WRITABLE, true);
        setCookieContext(jar);

        const result = await ssrRenderToString({
          router,
          renderView,
          url: options.url,
          controller: options.controller,
          options: mergedOptions,
          hydrated: options.hydrated,
        });

        cookies = jar.encode();
        return { ...result, cookies } as SSROutput;
      },
      true,
      storage
    );
  }) as never;

  Object.assign(renderer, { router, options: defaultOptions });

  return renderer;
}

export async function ssrRenderToString(renderOptions: SSRRenderStringOptions): Promise<Omit<SSROutput, 'cookies'>> {
  const { router, renderView, url, controller, options, hydrated } = renderOptions;

  if (options?.sitemap !== false && url.endsWith('sitemap.xml')) {
    const sitemapConfig = typeof options?.sitemap === 'object' ? options.sitemap : {};
    const fullUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `http://localhost${url.startsWith('/') ? url : `/${url}`}`;
    const sitemapXml = await router.sitemap({ ...sitemapConfig, url: fullUrl });
    if (sitemapXml) {
      return {
        html: sitemapXml,
        head: '',
        status: 200,
        contentType: 'application/xml; charset=utf-8',
      };
    }
  }

  let html = '';
  let head = '';
  let status = 200;
  let redirect: string | undefined;

  const ssr = createLifecycle();
  await ssr.runAsync(async () => {
    try {
      const snapshot = await router.activate(url, true, controller);
      const script = hydrated ? router.createHydrationScript(snapshot) : '';

      const { exception } = router.context;

      if (exception instanceof NotFoundError) {
        status = 404;
      } else if (exception instanceof GuardError) {
        status = 403;
      } else if (exception instanceof ProviderError) {
        status = 400;
      }

      const result = await renderView({ url });
      html = result.html;
      head = result.head + script;
    } catch (error) {
      if (error instanceof Redirect) {
        status = 302;
        redirect = redirectUrl(error);
      } else {
        head = '';
        html = `<h1>Internal SSR Render Error.</h1>`;
        status = 500;

        if (!isBrowser()) {
          console.error(error);
        }
      }
    } finally {
      router.cleanup();
    }
  });

  ssr.destroy();

  return { html, head, status, redirect };
}
