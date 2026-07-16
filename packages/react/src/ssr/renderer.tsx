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
import { GuardError, NotFoundError, ProviderError, Redirect, redirectUrl, type Router } from '@anchorlib/router';
import { renderToString } from 'react-dom/server';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { AppShell, SSRContext, SSROptions, SSROutput, SSRRenderer } from './types.js';

/**
 * Creates an SSR renderer function.
 *
 * @param router - The router instance to use for navigation.
 * @param RootLayout - The root layout component of the application.
 * @param defaultOptions - Optional default SSR options.
 */
export function createSSR(
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  defaultOptions?: SSROptions
): SSRRenderer {
  return ((
    url: string,
    cookie: string,
    context?: SSRContext,
    controller?: AbortController,
    Shell?: AppShell,
    isolated?: boolean,
    options?: SSROptions
  ) => {
    const mergedOptions = options ?? defaultOptions;
    if (isolated)
      return ssrRenderToString(router, RootLayout, url, controller, Shell, mergedOptions) as Promise<SSROutput>;

    const storage = context instanceof AsyncStore ? context : new AsyncStore(context as SSRContext);
    return withIsolation(
      async () => {
        let cookies: string[] = [];

        const jar = getCookieJar() ?? decodeCookies(cookie);
        setScope(COOKIE_JAR_WRITABLE, true);
        setCookieContext(jar);

        const result = await ssrRenderToString(router, RootLayout, url, controller, Shell, mergedOptions);

        cookies = jar.encode();
        return { ...result, cookies } as SSROutput;
      },
      true,
      storage
    );
  }) as never;
}

/**
 * Renders a route to an HTML string within a managed lifecycle.
 *
 * Activates the router, renders the component tree and head elements,
 * and maps route exceptions to HTTP status codes. Used internally by
 * `createSSR`; exported for advanced use cases that need direct access
 * to the render pipeline without cookie/isolation management.
 *
 * @param router - The router instance.
 * @param RootLayout - The root layout component.
 * @param url - The URL to render.
 * @param controller - Optional abort controller for cancellation.
 * @param Shell - Optional shell component to wrap the root layout.
 * @param options - Optional SSR rendering options.
 */
export async function ssrRenderToString(
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  url: string,
  controller?: AbortController,
  Shell?: AppShell,
  options?: SSROptions
): Promise<Omit<SSROutput, 'cookies'>> {
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
      const script = router.createHydrationScript(snapshot);

      const { exception } = router.context;

      if (exception instanceof NotFoundError) {
        status = 404;
      } else if (exception instanceof GuardError) {
        status = 403;
      } else if (exception instanceof ProviderError) {
        status = 400;
      }

      const application = Shell ? (
        <Shell>
          <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
        </Shell>
      ) : (
        <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
      );

      html = renderToString(application);
      head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));
      head += script;
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
