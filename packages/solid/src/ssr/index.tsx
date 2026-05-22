import '../server/index.js';
import {
  type AsyncKey,
  AsyncStore,
  type AsyncValue,
  createLifecycle,
  decodeCookies,
  isBrowser,
  setCookieContext,
  withIsolation,
} from '@anchorlib/core';
import { GuardError, NotFoundError, ProviderError, Redirect, redirectUrl, type Router } from '@anchorlib/router';
import type { JSX } from 'solid-js/jsx-runtime';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';

/**
 * The output of the SSR process.
 */
export type SSROutput = {
  /** The rendered HTML body. */
  html: string;
  /** The rendered HTML head, including styles, meta tags, and hydration scripts. */
  head: string;
  /** The status code of the response. */
  status: number;
  /** An array of set-cookie headers. */
  cookies: string[];
  /** The redirect URL if a redirect was triggered during rendering. */
  redirect?: string;
};

/**
 * The context for the SSR process, which can be an array of key-value pairs or an AsyncStore.
 */
export type SSRContext = Array<[AsyncKey, AsyncValue]> | AsyncStore;

/**
 * A function that renders a URL to a string.
 * @param url - The URL to render.
 * @param cookie - The cookie string.
 * @param context - Optional: The context for the SSR process.
 */
export type SSRRenderer = (url: string, cookie: string, context?: SSRContext) => Promise<SSROutput>;

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
  return async (url: string, cookie: string, context?: SSRContext) => {
    const storage = context instanceof AsyncStore ? context : new AsyncStore(context as SSRContext);

    let html = '';
    let head = '';
    let status = 200;
    let cookies: string[] = [];
    let redirect: string | undefined;

    await withIsolation(
      async () => {
        const jar = decodeCookies(cookie);
        setCookieContext(jar);

        const ssr = createLifecycle();
        await ssr.runAsync(async () => {
          try {
            const snapshot = await router.activate(url, true);
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

        cookies = jar.encode();
        ssr.destroy();
      },
      true,
      storage
    );

    return { html, head, status, redirect, cookies };
  };
}
