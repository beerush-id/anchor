import { existsSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { LogLevel } from '@beerush/logger';
import type { HtmlTagDescriptor, IndexHtmlTransformContext, Plugin, ResolvedConfig } from 'vite';
import { color, setLogLevel, taggedLogger } from './logger.js';
import { AIR_ENV, initEnv } from './modules/env.js';
import { sendWebResponse, toWebRequest } from './utils.js';

const log = taggedLogger('air-worker');

export type AirWorkerOptions = {
  /**
   * Path to the worker entry module.
   * Defaults to `${srcDir}/worker.ts` ('src/worker.ts').
   */
  entry?: string;

  /**
   * Enable true static SSR by shipping zero JavaScript to the client.
   */
  noscript?: boolean;

  /**
   * Whether to automatically remove the index.html file from the client build output
   * to prevent Cloudflare from intercepting SSR routes.
   * Defaults to true.
   */
  removeIndexHtml?: boolean;

  /**
   * Ignore paths starting with a dot.
   * Defaults to true.
   */
  ignoreDotPath?: boolean;

  /**
   * Whether to automatically run SSG during build for routes with static generation enabled.
   * Defaults to true (set to false to disable).
   */
  ssg?: boolean;

  /**
   * Console log level, applied to every `air-*` tag (shared sink).
   * @default LogLevel.INFO
   */
  logLevel?: LogLevel;

  /**
   * File suffixes that close live app sockets on change, so reconnecting
   * clients rebind to fresh SSR handler snapshots. Accepts extensions
   * ('.ts') or full file names ('constructor.ts').
   * Defaults to `['.ts']`; `airPages` narrows it to the IRPC conventions
   * (constructor/function files).
   */
  hotExtensions?: string[];
};

/**
 * Vite plugin for AIR Worker integration.
 * Enables SSR, Static Site Generation (SSG), and worker injection.
 *
 * @param options Worker configuration options.
 * @returns Vite plugin.
 */
export function airWorker(options: AirWorkerOptions = {}): Plugin {
  const resolveEntry = () => resolveWorkerEntry(options);
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'air-worker',
    config(userConfig, env) {
      if (!userConfig.ssr) userConfig.ssr = {};
      const noExternal = userConfig.ssr.noExternal;
      const airModules = [/^@airlib\//, /^@irpclib\//];

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      let mergedNoExternal: any;
      if (Array.isArray(noExternal)) {
        mergedNoExternal = [...noExternal, ...airModules];
      } else if (noExternal === true) {
        mergedNoExternal = true;
      } else {
        mergedNoExternal = airModules;
      }
      userConfig.ssr.noExternal = mergedNoExternal;

      if (!userConfig.build) userConfig.build = {};
      if (!userConfig.build.rolldownOptions) userConfig.build.rolldownOptions = {};

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      const addExternal = (target: any, ids: string[]) => {
        const ext = target.external;
        if (!ext) {
          target.external = ids;
        } else if (Array.isArray(ext)) {
          for (const id of ids) {
            if (!ext.includes(id)) ext.push(id);
          }
        } else if (typeof ext === 'function') {
          target.external = (source: string, importer: string | undefined, isResolved: boolean) =>
            ids.includes(source) || ext(source, importer, isResolved);
        } else {
          target.external = [ext, ...ids];
        }
      };

      const externalIds = ['node:async_hooks', 'async_hooks'];
      addExternal(userConfig.build.rolldownOptions, externalIds);

      const ssrBuild = Boolean(
        // biome-ignore lint/suspicious/noExplicitAny: Expect any.
        (env as any)?.isSsrBuild || (env as any)?.ssrBuild || userConfig.build?.ssr || process.argv.includes('--ssr')
      );
      if (ssrBuild) {
        if (!userConfig.ssr.external) userConfig.ssr.external = [];
        addExternal(userConfig.ssr, externalIds);
      }

      if (!userConfig.appType) {
        userConfig.appType = 'custom';
      }

      if (ssrBuild && env.command === 'build') {
        if (!userConfig.build.rolldownOptions) userConfig.build.rolldownOptions = {};
        if (!userConfig.build.rolldownOptions.input) {
          userConfig.build.rolldownOptions.input = 'air-worker';
        }
      }

      return userConfig;
    },

    resolveId(id) {
      if (id === 'air-worker') {
        return 'worker';
      }
    },

    configResolved(config) {
      initEnv(config);
      setLogLevel(options.logLevel);
      resolvedConfig = config;
    },

    transformIndexHtml(_html: string, ctx: IndexHtmlTransformContext): HtmlTagDescriptor[] | undefined {
      if (!options.noscript || !ctx.bundle) return;

      let stripped = 0;
      for (const file of Object.keys(ctx.bundle)) {
        if (file.endsWith('.js')) {
          delete ctx.bundle[file];
          stripped++;
        }
      }
      log.verbose(color.event('Stripped'), `${stripped} JS entries`, '(noscript)');

      return [{ tag: 'html', attrs: { dehydrated: '' } }];
    },

    async closeBundle() {
      const isSsr = Boolean(resolvedConfig.build.ssr);
      if (isSsr) {
        if (options.removeIndexHtml !== false) {
          const indexPath = resolve(resolvedConfig.root, 'dist/client/index.html');
          try {
            if (existsSync(indexPath)) {
              unlinkSync(indexPath);
              log.verbose(color.event('Removed'), 'dist/client/index.html');
            }
          } catch (_e) {}
        }

        if (options.ssg !== false) {
          await runSsrWorkerSsg(resolvedConfig);
        }
      }
    },

    load(id) {
      if (id === 'worker') {
        log.verbose(color.event('Built'), 'worker module wrapper');
        return `
          import worker from '/${resolveEntry()}';
          import template from '/dist/client/index.html?raw';

          if (worker && worker.options) {
            worker.options.template = template;
          }

          export default worker;
        `;
      }
    },
    configureServer(server) {
      // biome-ignore lint/suspicious/noExplicitAny: Generic socket type for ws.
      const activeSockets = new Set<any>();

      server.watcher.on('change', (file) => {
        const hotExtensions = options.hotExtensions ?? ['.ts'];
        if (!hotExtensions.some((suffix) => file.endsWith(suffix))) return;

        server.ws.send('custom', { type: 'irpc:invalidate-handler' });
      });

      server.httpServer?.on('upgrade', async (req, socket, head) => {
        if (req.headers['sec-websocket-protocol'] === 'vite-hmr') return;

        try {
          const workerModule = await server.ssrLoadModule(resolveEntry());
          const worker = workerModule.default;

          if (worker && typeof worker.upgrade === 'function' && worker.options?.wsRouter) {
            const request = toWebRequest(req, new AbortController());
            const resolve = await worker.upgrade(request, {});

            const { WebSocketServer } = await import('ws');
            const wss = new WebSocketServer({ noServer: true });
            log.debug(color.event('WebSocket'), 'connection upgraded');

            wss.handleUpgrade(req, socket, head, (ws) => {
              activeSockets.add(ws);

              ws.on('message', (data) => {
                const message = data instanceof ArrayBuffer ? data : data.toString();
                resolve(message, ws);
              });

              ws.on('close', () => {
                activeSockets.delete(ws);
                if (typeof worker.options?.wsRouter?.disconnect === 'function') {
                  worker.options.wsRouter.disconnect(ws);
                }
              });

              ws.on('error', (err) => {
                log.error(`WebSocket error: ${err.message}`);
              });
            });
          }
        } catch (error) {
          log.error('WebSocket upgrade error:', error as Error);
          socket.destroy();
        }
      });

      return () => {
        server.middlewares.use(async (req, res, next) => {
          const controller = new AbortController();
          req.on('close', () => controller.abort());

          try {
            const started = performance.now();
            const urlPath = req.originalUrl ?? req.url ?? '/';
            if (options.ignoreDotPath !== false && urlPath.startsWith('/.')) return next();
            const request = toWebRequest(req, controller);

            log.debug(color.event('Request'), color.request(req.method ?? 'GET'), color.request(urlPath));

            const workerModule = await server.ssrLoadModule(resolveEntry());
            const worker = workerModule.default;

            if (!worker || typeof worker.fetch !== 'function') {
              return next();
            }

            log.verbose(color.event('Resolved'), 'worker module');

            if (worker.options) {
              const fs = await import('node:fs/promises');
              const path = await import('node:path');
              const rawHtml = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');

              worker.options.devMode = true;
              worker.options.template = await server.transformIndexHtml(urlPath, rawHtml);
            }

            const response = await worker.fetch(request);
            AIR_ENV.currentUrl = request.url;
            log.verbose(color.event('Worker fetch'), 'completed');

            await sendWebResponse(res, response);
            log.verbose(color.event('Response'), 'sent');
            log.info(
              color.request(req.method ?? 'GET'),
              color.request(urlPath),
              '→',
              response.status,
              'in',
              color.timing(`${Math.round(performance.now() - started)}ms`)
            );
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

/**
 * Resolves the worker entry path (relative to the Vite root): the explicit
 * `entry` option, or the configured worker entry under the source root.
 */
export function resolveWorkerEntry(options: AirWorkerOptions): string {
  return (options.entry ?? join(AIR_ENV.srcDir, AIR_ENV.files.workerEntry)).replace(/^\.\//, '');
}

async function runSsrWorkerSsg(config: ResolvedConfig): Promise<void> {
  const workerPath = resolve(config.root, config.build.outDir, 'worker.js');
  if (!existsSync(workerPath)) return;

  try {
    const start = performance.now();
    const { pathToFileURL } = await import('node:url');
    const workerModule = await import(pathToFileURL(workerPath).href);
    const worker = workerModule.default ?? workerModule;

    if (!worker?.router || typeof worker.fetch !== 'function') return;

    let staticPages = 0;
    let finishedPages = 0;

    const promises = [];
    const routes = worker.router.entries();

    for (const [path, info] of routes) {
      if (info.route?.options?.static) {
        const controller = new AbortController();
        const request = new Request(`http://localhost${path}`, { signal: controller.signal });

        const promise = new Promise((resolve, reject) => {
          const start = performance.now();
          const timer = setTimeout(() => {
            controller.abort();
          }, 5000);

          worker
            .fetch(request, undefined, true)
            .then((res: Response) => {
              clearTimeout(timer);
              resolve(res);
              finishedPages++;

              log.verbose(
                `SSG finished: ${finishedPages}/${staticPages}`,
                color.file(path),
                'in',
                color.timing(`${Math.round(performance.now() - start)}ms`)
              );
            })
            .catch((e: Error) => {
              clearTimeout(timer);
              reject(e);

              finishedPages++;
              log.error(`SSG failed: ${finishedPages}/${staticPages}: ${path}`, e);
            });
        });

        promises.push(promise);
        staticPages++;
      }
    }

    log.debug('Generating', staticPages, 'static pages...');
    await Promise.all(promises);

    log.info(
      color.event('SSG:'),
      'generated',
      color.file(staticPages),
      'pages in',
      color.timing(`${Math.round(performance.now() - start)}ms`)
    );
  } catch (e) {
    log.warn(`SSG generation failed during build: ${e}`);
  }
}
