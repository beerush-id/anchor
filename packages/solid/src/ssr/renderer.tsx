import {
  AsyncStore,
  createLifecycle,
  decodeCookies,
  getCookieJar,
  isBrowser,
  setCookieContext,
  withIsolation,
} from '@anchorlib/core';
import { GuardError, NotFoundError, ProviderError, Redirect, redirectUrl, type Router } from '@anchorlib/router';
import type { JSX } from 'solid-js/jsx-runtime';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { SSRContext, SSROutput, SSRRenderer } from './types.js';

/**
 * Creates an SSR renderer function.
 *
 * @param renderer - The function to render a SolidJS node to a string (e.g., renderToString).
 * @param router - The router instance to use for navigation.
 * @param RootLayout - The root layout component of the application.
 */
export function createSSR(
  renderer: (fn: () => JSX.Element) => string,
  router: Router,
  RootLayout: RouteComponent<AnyRoute>
): SSRRenderer {
  return ((url: string, cookie: string, context?: SSRContext, controller?: AbortController, isolated?: boolean) => {
    if (isolated) return renderToString(renderer, router, RootLayout, url, controller) as Promise<SSROutput>;

    const storage = context instanceof AsyncStore ? context : new AsyncStore(context as SSRContext);
    return withIsolation(
      async () => {
        let cookies: string[] = [];

        const jar = getCookieJar() ?? decodeCookies(cookie);
        setCookieContext(jar);

        const result = await renderToString(renderer, router, RootLayout, url, controller);

        cookies = jar.encode();
        return { ...result, cookies } as SSROutput;
      },
      true,
      storage
    );
  }) as never;
}

export async function renderToString(
  renderer: (fn: () => JSX.Element) => string,
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  url: string,
  controller?: AbortController
): Promise<Omit<SSROutput, 'cookies'>> {
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

      html = renderer(() => <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />);
      head = renderer(() => [...headings().values()].map(({ Renderer }) => <Renderer />));
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
