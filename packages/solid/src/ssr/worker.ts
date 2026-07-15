import { type AnyType, decodeCookies, isBrowser, setCookieContext } from '@anchorlib/core';
import type { HTTPTransport } from '@irpclib/http';
import type { HTTPRouter } from '@irpclib/http/router';
import { SSR_ENV_KEY } from './context.js';
import type {
  AppShell,
  AssetResolver,
  SSRContext,
  SSRContextSeed,
  SSROutput,
  SSRRenderer,
  WorkerOptions,
  WsSender,
} from './types.js';

/**
 * Creates a standalone SSR worker that handles asset resolution, rendering,
 * cookie forwarding, and timeout management.
 *
 * Use this when your application does not use IRPC. For full-stack applications
 * with IRPC, use {@link createFullWorker} instead.
 *
 * @param renderer - The SSR renderer created by `createSSR`.
 * @param options - Worker configuration.
 * @param Shell - The app shell component.
 * @returns A worker object with a Web Standard `fetch` handler.
 */
// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export function createWorker<E = any>(renderer: SSRRenderer, options: WorkerOptions<E>, Shell?: AppShell) {
  return {
    options,
    async fetch(request: Request, env?: E) {
      const {
        template = '',
        headTag = '<!--ssr-head-->',
        bodyTag = '<!--ssr-outlet-->',
        timeout,
        resolveAsset = defaultAssetResolver,
        resolveContext,
        createResponse = createDefaultResponse,
      } = options;

      const controller = new AbortController();

      const abort = (reason: unknown) => controller.abort(reason);
      request.signal.addEventListener('abort', abort, { once: true });

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      const timerId: any = timeout ? setTimeout(() => abort('timeout'), timeout) : null;

      try {
        const cookie = request.headers.get('cookie') ?? '';
        const url = new URL(request.url);
        const contextSeed: SSRContextSeed = (await resolveContext?.(request, url, env)) ?? [];
        if (env) contextSeed.push([SSR_ENV_KEY, env]);

        if (url.pathname !== '/' && typeof resolveAsset === 'function') {
          const asset = await resolveAsset(request, url, env);
          if (asset) return asset;
        }

        const { html, head, status, cookies, redirect, contentType } = await renderer(
          url.pathname,
          cookie,
          contextSeed,
          controller,
          Shell
        );
        const body = contentType ? html : template.replace(headTag, head).replace(bodyTag, html);

        const headers = new Headers({
          'Content-Type': contentType ?? 'text/html',
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
        /* v8 ignore next */
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
  Shell?: AppShell,
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
 * @param Shell - The app shell component.
 * @returns A worker object with a Web Standard `fetch` handler.
 */
// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export function createFullWorker<E = any>(
  router: HTTPRouter,
  renderer: SSRRenderer,
  options: WorkerOptions<E>,
  Shell?: AppShell
) {
  return {
    options,
    async fetch(request: Request, env?: E) {
      const {
        template = '',
        headTag = '<!--ssr-head-->',
        bodyTag = '<!--ssr-outlet-->',
        timeout,
        resolveAsset = defaultAssetResolver,
        resolveContext,
        createResponse = createDefaultResponse,
      } = options;

      const controller = new AbortController();

      const abort = (reason: unknown) => controller.abort(reason);
      request.signal.addEventListener('abort', abort, { once: true });

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      let timerId: any;

      try {
        const cookie = request.headers.get('cookie') ?? '';
        const url = new URL(request.url);
        const contextSeed: SSRContextSeed = (await resolveContext?.(request, url, env)) ?? [];
        if (env) contextSeed.push([SSR_ENV_KEY, env]);

        if (request.method === 'POST' && url.pathname.startsWith((router.transport as HTTPTransport).endpoint)) {
          const response = await router.resolve(request, contextSeed);
          return createResponse(response);
        }

        if (url.pathname !== '/' && typeof resolveAsset === 'function') {
          const asset = await resolveAsset(request, url, env);
          if (asset) return asset;
        }

        timerId = timeout ? setTimeout(() => abort('timeout'), timeout) : null;

        let cookies: string[] = [];
        const cookieJar = decodeCookies(cookie);

        const response = await router.isolate(
          async () => {
            const { html, head, status, redirect, contentType } = await (renderer as IsolatedRenderer)(
              url.pathname,
              cookie,
              undefined,
              controller,
              Shell,
              true
            );

            const body = contentType ? html : template.replace(headTag, head).replace(bodyTag, html);
            const headers = new Headers({
              'Content-Type': contentType ?? 'text/html',
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
        /* v8 ignore next */
      } finally {
        request.signal.removeEventListener('abort', abort);
        clearTimeout(timerId);
      }
    },
    async upgrade(request: Request, env?: E) {
      if (!options.wsRouter) {
        throw new Error(
          "[AIR Stack] WebSocket upgrade failed: 'wsRouter' is not defined. Please pass an instance of WebSocketRouter in the worker options to enable real-time features."
        );
      }

      const cookie = request.headers.get('cookie') ?? '';
      const url = new URL(request.url);
      const contextSeed: SSRContextSeed = (await options.resolveContext?.(request, url, env)) ?? [];
      if (env) contextSeed.push([SSR_ENV_KEY, env as E]);
      contextSeed.push(['cookie', cookie]);

      // Return the generic message resolver function
      return (message: string | ArrayBuffer, sender: WsSender) => {
        return options.wsRouter!.resolve(message, sender, contextSeed);
      };
    },
  };
}

function createDefaultResponse(response: Response) {
  return response;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};

function getMimeType(pathname: string) {
  const match = pathname.match(/\.[^.]+$/);
  const ext = match ? match[0].toLowerCase() : '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export const defaultAssetResolver: AssetResolver<AnyType> = async (request, url, env) => {
  // If running in Cloudflare Pages:
  if (env?.ASSETS) {
    try {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status < 400) return asset;
    } catch (_e) {}
  }

  const filePath = `./dist/client${url.pathname}`;

  // If running in Bun:
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  // If running in Deno:
  // @ts-expect-error - Deno global is not defined in standard TS lib
  if (typeof Deno !== 'undefined') {
    try {
      // @ts-expect-error
      const stat = await Deno.stat(filePath);
      if (stat.isFile) {
        // @ts-expect-error
        const file = await Deno.open(filePath, { read: true });
        return new Response(file.readable, {
          headers: { 'Content-Type': getMimeType(url.pathname) },
        });
      }
    } catch (_e) {}
  }

  // If running in Node.js:
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fsName = 'node:fs/promises';
      const fs = await import(/* @vite-ignore */ fsName);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const buffer = await fs.readFile(filePath);
        return new Response(buffer, {
          headers: { 'Content-Type': getMimeType(url.pathname) },
        });
      }
    } catch (_e) {}
  }
};
