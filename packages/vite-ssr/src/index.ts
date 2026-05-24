import fs from 'node:fs';
import path from 'node:path';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/core';
import type { HTTPRouter } from '@irpclib/http/router';
import type { WebSocketRouter } from '@irpclib/ws/router';
import type { Plugin, ViteDevServer } from 'vite';
import { sendWebResponse, toWebRequest } from './utils.js';

type SSROutput = {
  html: string;
  head: string;
  status: number;
  cookies: string[];
  redirect?: string;
};

type IsolatedRenderer = (
  url: string,
  cookie: string,
  context?: unknown,
  controller?: AbortController,
  isolated?: boolean
) => Promise<SSROutput>;

type RendererFactory = (router: unknown, layout: unknown) => IsolatedRenderer | Promise<IsolatedRenderer>;

export type ViteSSROptions = {
  /** Path to the router module. Must `export default` a `Router` instance. */
  router: string;
  /** Path to the root layout module. Must `export default` a `RouteComponent`. */
  layout: string;
  /**
   * Path to the renderer module (e.g., `'@anchorlib/react/ssr'`).
   * Must export `createSSR(router, layout) => SSRRenderer`.
   */
  renderer: string;

  /**
   * IRPC configuration. If provided, POST requests to the transport
   * endpoint are routed through the HTTPRouter.
   */
  irpc?: {
    /** IRPC instance. String loads `export default`, object loads a named export. */
    module: ModuleRef;
    /** HTTP Transport instance. */
    transport: ModuleRef;
    /** WebSocket Transport instance (optional). */
    wsTransport?: ModuleRef;
    /** Handler modules to load (e.g., ['./src/pages/constructor.ts']). */
    handlers?: string[];
  };

  /** Placeholder for rendered head. Defaults to `<!--ssr-head-->`. */
  headTag?: string;
  /** Placeholder for rendered body. Defaults to `<!--ssr-outlet-->`. */
  bodyTag?: string;
};

/** A module reference — string for default export, object for named export. */
type ModuleRef = string | { path: string; name: string };

/**
 * Vite plugin for Anchor SSR.
 *
 * Replaces manual `server.ts` and `entry-server.tsx` with a single plugin call.
 * Handles SSR renderer construction, IRPC routing, request isolation,
 * abort signal propagation, and template transformation.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { airSSR } from '@anchorlib/vite-ssr';
 *
 * export default defineConfig({
 *   plugins: [
 *     airSSR({
 *       router: './src/lib/router.ts',
 *       layout: './src/pages/layout.tsx',
 *       renderer: '@anchorlib/react/ssr',
 *       irpc: {
 *         module: './src/lib/irpc.ts',
 *         transport: './src/lib/transport.ts',
 *         handlers: ['./src/pages/constructor.ts'],
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export function airSSR(options: ViteSSROptions): Plugin {
  const {
    router: routerPath,
    layout: layoutPath,
    renderer: rendererPath,
    irpc: irpcConfig,
    headTag = '<!--ssr-head-->',
    bodyTag = '<!--ssr-outlet-->',
  } = options;

  let router: HTTPRouter | undefined;
  let templatePath: string;
  let rendererFactory: RendererFactory;

  return {
    name: 'air-ssr',
    configureServer(server: ViteDevServer) {
      templatePath = path.resolve(server.config.root, 'index.html');

      // Initialize server-side support before handling requests.
      const ready = (async () => {
        await server.ssrLoadModule('@irpclib/irpc/server').catch(() => {});

        // Load renderer factory from the framework-specific module.
        rendererFactory = (await server.ssrLoadModule(rendererPath)).createSSR;

        if (irpcConfig) {
          router = await initRouter(server, irpcConfig);

          if (irpcConfig.wsTransport) {
            await initWsRouter(server, irpcConfig);
          }

          const { IRPC_STORE } = await server.ssrLoadModule('@irpclib/irpc');
          IRPC_STORE.subscribe(() => {
            IRPC_STORE.print();
          });
        }
      })();

      // Return a function to install as post-middleware (after Vite's static/HMR handlers).
      return () => {
        server.middlewares.use(async (req, res, next) => {
          await ready;

          const controller = new AbortController();
          req.on('close', () => controller.abort());

          try {
            const url = req.originalUrl ?? req.url ?? '/';

            // IRPC routing — POST to transport endpoint
            if (router && req.method === 'POST' && url.startsWith(router.transport.endpoint)) {
              // Re-load handlers to pick up HMR changes (cached when unchanged).
              if (irpcConfig?.handlers) {
                for (const handler of irpcConfig.handlers) {
                  await server.ssrLoadModule(handler);
                }
              }

              const request = toWebRequest(req, controller);
              const cookie = req.headers.cookie ?? '';
              const response = await router.resolve(request, [['cookie', cookie]]);
              await sendWebResponse(res, response);
              return;
            }

            // Skip non-page requests
            if (url.includes('.')) {
              return next();
            }

            let template = fs.readFileSync(templatePath, 'utf-8');
            template = await server.transformIndexHtml(url, template);

            // Load router + layout per-request (picks up HMR changes; cached when unchanged).
            const { default: pageRouter } = await server.ssrLoadModule(routerPath);
            const { default: RootLayout } = await server.ssrLoadModule(layoutPath);
            const render = (await rendererFactory(pageRouter, RootLayout)) as IsolatedRenderer;
            const cookie = req.headers.cookie ?? '';

            let ssrResult: SSROutput;

            if (router) {
              // Isolate SSR render with IRPC context (abort signal, cookie, hooks).
              const cookieJar = decodeCookies(cookie);
              ssrResult = await router.isolate(
                () => render(url, cookie, undefined, controller, true),
                controller,
                [['cookie', cookie]],
                () => {
                  setCookieContext(cookieJar);
                }
              );
            } else {
              ssrResult = await render(url, cookie, undefined, controller);
            }

            const { html, head, status, redirect, cookies } = ssrResult;

            if (redirect) {
              res.writeHead(302, { Location: redirect });
              res.end();
              return;
            }

            const headers: Record<string, string | string[]> = { 'Content-Type': 'text/html' };
            if (cookies?.length) {
              headers['Set-Cookie'] = cookies;
            }

            const page = template.replace(headTag, head).replace(bodyTag, html);
            res.writeHead(status ?? 200, headers);
            res.end(page);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

/**
 * Loads an export from a module reference.
 * String path loads the default export; { path, name } loads a named export.
 */
async function loadExport(server: ViteDevServer, ref: ModuleRef): Promise<unknown> {
  if (typeof ref === 'string') {
    return (await server.ssrLoadModule(ref)).default;
  }
  return (await server.ssrLoadModule(ref.path))[ref.name];
}

/**
 * Initializes the IRPC HTTP router by loading the module and handlers.
 */
async function initRouter(
  server: ViteDevServer,
  config: NonNullable<ViteSSROptions['irpc']>
): Promise<HTTPRouter | undefined> {
  try {
    const irpc = await loadExport(server, config.module);
    const transport = await loadExport(server, config.transport);

    if (!irpc || !transport) {
      server.config.logger.warn('[air-ssr] IRPC module and transport are required.');
      return;
    }

    // Load handler modules (side-effect imports that call irpc.construct)
    if (config.handlers) {
      for (const handler of config.handlers) {
        await server.ssrLoadModule(handler);
      }
    }

    const { HTTPRouter } = await server.ssrLoadModule('@irpclib/http/router');
    const router = new HTTPRouter(irpc, transport);

    // Provide CookieJar to IRPC handlers (same pattern as createFullWorker)
    router.use(() => {
      const cookieJar = decodeCookies(getContext('cookie', ''));
      setCookieContext(cookieJar);
    });

    server.config.logger.info(
      `[air-ssr] IRPC HTTP router initialized at ${(transport as { endpoint: string }).endpoint}`
    );
    return router;
  } catch (error) {
    server.config.logger.error('[air-ssr] Failed to initialize IRPC HTTP router:');
    server.config.logger.error(String(error));
    return;
  }
}

/**
 * Initializes the IRPC WebSocket router and attaches it to the Vite dev server.
 *
 * Creates a WebSocketServer on the same HTTP server (noServer mode),
 * intercepts upgrade requests at the WS transport endpoint, and routes
 * messages through WebSocketRouter.
 */
async function initWsRouter(
  server: ViteDevServer,
  config: NonNullable<ViteSSROptions['irpc']>
): Promise<WebSocketRouter | undefined> {
  if (!config.wsTransport) return;

  try {
    const irpc = await loadExport(server, config.module);
    const wsTransport = await loadExport(server, config.wsTransport);

    if (!irpc || !wsTransport) {
      server.config.logger.warn('[air-ssr] IRPC module and wsTransport are required for WebSocket.');
      return;
    }

    const { WebSocketRouter } = await server.ssrLoadModule('@irpclib/ws/router');
    const wsRouter = new WebSocketRouter(irpc, wsTransport) as WebSocketRouter;

    // Provide CookieJar to WS handlers
    wsRouter.use(() => {
      const cookieJar = decodeCookies(getContext('cookie', ''));
      setCookieContext(cookieJar);
    });

    const endpoint = (wsTransport as { endpoint: string }).endpoint;

    // Create a WebSocketServer in noServer mode — shares Vite's HTTP server.
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ noServer: true });

    server.httpServer?.on('upgrade', (req, socket, head) => {
      if (req.url === endpoint) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    });

    wss.on('connection', (ws, req) => {
      const cookie = req.headers.cookie ?? '';

      ws.on('message', async (data) => {
        // Re-load handlers to pick up HMR changes.
        if (config.handlers) {
          for (const handler of config.handlers) {
            await server.ssrLoadModule(handler);
          }
        }

        const message = data instanceof ArrayBuffer ? data : data.toString();
        await wsRouter.resolve(message, ws as unknown as WebSocket, [['cookie', cookie]]);
      });

      ws.on('close', () => {
        wsRouter.disconnect();
      });
    });

    server.config.logger.info(`[air-ssr] IRPC WebSocket router initialized at ${endpoint}`);
    return wsRouter;
  } catch (error) {
    server.config.logger.error('[air-ssr] Failed to initialize IRPC WebSocket router:');
    server.config.logger.error(String(error));
    return;
  }
}
