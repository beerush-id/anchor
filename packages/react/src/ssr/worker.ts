import { decodeCookies, isBrowser, setCookieContext } from '@anchorlib/core';
import type { HTTPRouter } from '@irpclib/http/router';
import type { SSRContext, SSRContextSeed, SSROutput, SSRRenderer, WorkerOptions } from './types.js';

/**
 * Creates a standalone SSR worker that handles asset resolution, rendering,
 * cookie forwarding, and timeout management.
 *
 * Use this when your application does not use IRPC. For full-stack applications
 * with IRPC, use {@link createFullWorker} instead.
 *
 * @param renderer - The SSR renderer created by `createSSR`.
 * @param options - Worker configuration.
 * @returns A worker object with a Web Standard `fetch` handler.
 */
export function createWorker<E = any>(renderer: SSRRenderer, options: WorkerOptions<E>) {
  const {
    template = '',
    headTag = '<!--ssr-head-->',
    bodyTag = '<!--ssr-outlet-->',
    timeout,
    resolveAsset,
    resolveContext,
    createResponse = createDefaultResponse,
  } = options;

  return {
    async fetch(request: Request, env?: E) {
      const controller = new AbortController();

      const abort = (reason: unknown) => controller.abort(reason);
      request.signal.addEventListener('abort', abort, { once: true });

      const timerId: any = timeout ? setTimeout(() => abort('timeout'), timeout) : null;

      try {
        const cookie = request.headers.get('cookie') ?? '';
        const url = new URL(request.url);
        const contextSeed: SSRContextSeed = resolveContext?.(request, url) ?? [];

        if (typeof resolveAsset === 'function') {
          const asset = await resolveAsset(request, url, env);
          if (asset) return asset;
        }

        const { html, head, status, cookies, redirect } = await renderer(url.pathname, cookie, contextSeed, controller);
        const body = template.replace(headTag, head).replace(bodyTag, html);

        const headers = new Headers({
          'Content-Type': 'text/html',
        });
        cookies.forEach((cookie) => {
          headers.append('Set-Cookie', cookie);
        });

        if (redirect) {
          headers.append('Location', redirect);
        }

        return createResponse(new Response(redirect ? null : body, { status, headers }));
      } catch (error) {
        if (!isBrowser()) {
          console.error('Worker Error:', error);
        }

        return createResponse(new Response('Internal Server Error', { status: 500 }));
        /* v8 ignore next - false report */
      } finally {
        request.signal.removeEventListener('abort', abort);
        clearTimeout(timerId);
      }
    },
  };
}

type IsolatedRenderer = (
  url: string,
  cookie: string,
  context?: SSRContext,
  controller?: AbortController,
  isolated?: boolean
) => Promise<SSROutput>;

/**
 * Creates a full-stack SSR worker that handles IRPC routing, asset resolution,
 * SSR rendering with request isolation, cookie management, and timeout enforcement.
 *
 * This is the standard entry point for full-stack AIR applications. It routes
 * POST requests to IRPC, serves static assets, and renders SSR for everything else.
 *
 * @param router - The IRPC HTTP router instance.
 * @param renderer - The SSR renderer created by `createSSR`.
 * @param options - Worker configuration.
 * @returns A worker object with a Web Standard `fetch` handler.
 */
export function createFullWorker<E = any>(router: HTTPRouter, renderer: SSRRenderer, options: WorkerOptions<E>) {
  const {
    template = '',
    headTag = '<!--ssr-head-->',
    bodyTag = '<!--ssr-outlet-->',
    timeout,
    resolveAsset,
    resolveContext,
    createResponse = createDefaultResponse,
  } = options;

  return {
    async fetch(request: Request, env?: E) {
      const controller = new AbortController();

      const abort = (reason: unknown) => controller.abort(reason);
      request.signal.addEventListener('abort', abort, { once: true });

      let timerId: any;

      try {
        const cookie = request.headers.get('cookie') ?? '';
        const url = new URL(request.url);
        const contextSeed: SSRContextSeed = resolveContext?.(request, url) ?? [];

        if (request.method === 'POST' && url.pathname.startsWith(router.transport.endpoint)) {
          const response = await router.resolve(request, contextSeed);
          return createResponse(response);
        }

        if (typeof resolveAsset === 'function') {
          const asset = await resolveAsset(request, url, env);
          if (asset) return asset;
        }

        timerId = timeout ? setTimeout(() => abort('timeout'), timeout) : null;

        let cookies: string[] = [];
        const cookieJar = decodeCookies(cookie);

        const response = await router.isolate(
          async () => {
            const { html, head, status, redirect } = await (renderer as IsolatedRenderer)(
              url.pathname,
              cookie,
              undefined,
              controller,
              true
            );

            const body = template.replace(headTag, head).replace(bodyTag, html);
            const headers = new Headers({
              'Content-Type': 'text/html',
            });

            cookies = cookieJar.encode();
            cookies.forEach((cookie) => {
              headers.append('Set-Cookie', cookie);
            });

            if (redirect) {
              headers.append('Location', redirect);
            }

            return new Response(redirect ? null : body, { status, headers });
          },
          controller,
          contextSeed,
          () => {
            setCookieContext(cookieJar);
          }
        );

        return createResponse(response);
      } catch (error) {
        if (!isBrowser()) {
          console.error('Worker Error:', error);
        }

        return createResponse(new Response('Internal Server Error', { status: 500 }));
        /* v8 ignore next - false report */
      } finally {
        request.signal.removeEventListener('abort', abort);
        clearTimeout(timerId);
      }
    },
  };
}

function createDefaultResponse(response: Response) {
  return response;
}
