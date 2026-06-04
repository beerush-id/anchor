import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { CookieJar } from '@anchorlib/core';
import type { HTTPTransport } from '@irpclib/http';
import type { HTTPRouter } from '@irpclib/http/router';
import type { IRPCPackage } from '@irpclib/irpc';
import type { WebSocketTransport } from '@irpclib/ws';
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
 */
export function airSSR(options: ViteSSROptions): Plugin {
  return {
    name: 'air-ssr',
    config(userConfig) {
      if (!userConfig.ssr) userConfig.ssr = {};

      const noExternal = userConfig.ssr.noExternal;
      const airModules = [/^@irpclib\//, /^@anchorlib\//];

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      let mergedNoExternal: any;

      if (Array.isArray(noExternal)) {
        mergedNoExternal = [...noExternal, ...airModules];
      } else if (noExternal === true) {
        mergedNoExternal = true;
      } else {
        mergedNoExternal = airModules;
      }

      userConfig.ssr!.noExternal = mergedNoExternal;

      return userConfig;
    },
    async configureServer(server: ViteDevServer) {
      // Return a function to install as post-middleware (after Vite's static/HMR handlers).
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const { router } = await bootstrap(server, options);
          const controller = new AbortController();
          req.on('close', () => controller.abort());

          try {
            const url = req.originalUrl ?? req.url ?? '/';

            // IRPC routing — POST to transport endpoint
            if (router && req.method === 'POST' && url.startsWith(router.transport.endpoint)) {
              await resolveHttpCalls({ server, router, req, res, config: options.irpc });
              return;
            }

            // Skip non-page requests
            if (url.startsWith('/.')) {
              return next();
            }

            await resolveSSR({ server, req, res, options });
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

type HTTPCallOptions = {
  server: ViteDevServer;
  router: HTTPRouter;
  req: IncomingMessage;
  res: ServerResponse;
  config: ViteSSROptions['irpc'];
};

/**
 * Resolves HTTP request.
 *
 * @param server - Vite server instance.
 * @param router - HTTP router instance.
 * @param req - Request object.
 * @param res - Response object.
 * @param config - IRPC configuration.
 * @returns {Promise<void>}
 */
async function resolveHttpCalls({ server, router, req, res, config }: HTTPCallOptions): Promise<void> {
  // Re-load handlers to pick up HMR changes (cached when unchanged).
  if (config?.handlers) await bootstrapHandlers(server, config.handlers);

  const cookie = req.headers.cookie ?? '';
  const request = toWebRequest(req, new AbortController());
  const response = await router.resolve(request, [['cookie', cookie]]);

  await sendWebResponse(res, response);
}

type SSRResolveOptions = {
  server: ViteDevServer;
  req: IncomingMessage;
  res: ServerResponse;
  options: ViteSSROptions;
};

/**
 * Resolves SSR request.
 *
 * @param server - Vite server instance.
 * @param req - Request object.
 * @param res - Response object.
 * @param options - Resolve options.
 * @returns {Promise<void>}
 */
async function resolveSSR({ server, req, res, options }: SSRResolveOptions): Promise<void> {
  const { headTag = '<!--ssr-head-->', bodyTag = '<!--ssr-outlet-->' } = options;
  const { router, templatePath, rendererFactory } = await bootstrap(server, options);

  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  const urlPath = (req as any).originalUrl ?? req.url ?? '/';
  const controller = new AbortController();

  const htmlFile = fs.readFileSync(templatePath, 'utf-8');
  const template = await server.transformIndexHtml(urlPath, htmlFile);

  // Load router + layout per-request (picks up HMR changes; cached when unchanged).
  const { default: pageRouter } = await server.ssrLoadModule(options.router);
  const { default: RootLayout } = await server.ssrLoadModule(options.layout);
  const render = (await rendererFactory(pageRouter, RootLayout)) as IsolatedRenderer;
  const cookie = req.headers.cookie ?? '';

  let ssrResult: SSROutput;

  if (router) {
    const { decodeCookies, setCookieContext } = await server.ssrLoadModule('@anchorlib/core');
    const cookieJar = decodeCookies(cookie);

    // Isolate SSR render with IRPC context (abort signal, cookie, hooks).
    ssrResult = await router.isolate(
      () => render(urlPath, cookie, undefined, controller, true),
      controller,
      [['cookie', cookie]],
      () => {
        setCookieContext(cookieJar);
      }
    );
  } else {
    ssrResult = await render(urlPath, cookie, undefined, controller);
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
}

type SSRModules = {
  router: HTTPRouter | undefined;
  wsRouter: WebSocketRouter | undefined;
  templatePath: string;
  rendererFactory: RendererFactory;
};

let bootstrapped = false;
const IRPC_MODULES = {
  router: undefined,
  wsRouter: undefined,
  templatePath: undefined as never,
  rendererFactory: undefined as never,
} as SSRModules;

/**
 * Bootstraps Air SSR.
 *
 * @param {ViteDevServer} server
 * @param {ViteSSROptions} options
 * @returns {Promise<SSRModules>}
 */
async function bootstrap(server: ViteDevServer, options: ViteSSROptions): Promise<SSRModules> {
  if (!bootstrapped) {
    await server.ssrLoadModule('@irpclib/irpc/server').catch(() => {});

    if (options.irpc) {
      IRPC_MODULES.router = await initRouter(server, options.irpc);
      IRPC_MODULES.wsRouter = await initWsRouter(server, options.irpc);

      const { IRPC_STORE } = await server.ssrLoadModule('@irpclib/irpc');
      IRPC_STORE.subscribe(() => {
        IRPC_STORE.print();
      });
    }

    IRPC_MODULES.templatePath = path.resolve(server.config.root, 'index.html');
    IRPC_MODULES.rendererFactory = (await server.ssrLoadModule(options.renderer)).createSSR;

    bootstrapped = true;
  }

  if (options.irpc?.handlers) {
    await bootstrapHandlers(server, options.irpc.handlers);
  }

  return IRPC_MODULES;
}

/**
 * Initializes the IRPC HTTP router by loading the module and handlers.
 */
async function initRouter(
  server: ViteDevServer,
  config: NonNullable<ViteSSROptions['irpc']>
): Promise<HTTPRouter | undefined> {
  if (!config.transport) return;

  try {
    const irpc = (await loadExport(server, config.module)) as IRPCPackage;
    const transport = (await loadExport(server, config.transport)) as HTTPTransport;

    if (!irpc || !transport) {
      server.config.logger.warn('[air-ssr] IRPC module and transport are required.');
      return;
    }

    const { HTTPRouter } = await server.ssrLoadModule('@irpclib/http/router');
    const router = new HTTPRouter(irpc, transport) as HTTPRouter;

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
    const irpc = (await loadExport(server, config.module)) as IRPCPackage;
    const wsTransport = (await loadExport(server, config.wsTransport)) as WebSocketTransport;

    if (!irpc || !wsTransport) {
      server.config.logger.warn('[air-ssr] IRPC module and wsTransport are required for WebSocket.');
      return;
    }

    const { WebSocketRouter } = await server.ssrLoadModule('@irpclib/ws/router');
    const { decodeCookies, getContext, setCookieContext } = await server.ssrLoadModule('@anchorlib/core');
    const wsRouter = new WebSocketRouter(irpc, wsTransport) as WebSocketRouter;

    // Provide CookieJar to WS handlers
    wsRouter.use(() => {
      const cookieJar = decodeCookies(getContext('cookie', '')) as CookieJar;
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
        if (config.handlers) await bootstrapHandlers(server, config.handlers);

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
 * Bootstraps IRPC handlers, reloading them when changed.
 */
async function bootstrapHandlers(server: ViteDevServer, handlers: string[]) {
  for (const handler of handlers) {
    await server.ssrLoadModule(handler);
  }
}
