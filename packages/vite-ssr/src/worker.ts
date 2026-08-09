import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { sendWebResponse, toWebRequest } from './utils.js';

export type AirWorkerOptions = {
  /**
   * Path to the worker entry module.
   * Defaults to 'src/worker.ts'.
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
};

/**
 * Vite plugin for AIR Worker integration.
 * Enables SSR, Static Site Generation (SSG), and worker injection.
 *
 * @param options Worker configuration options.
 * @returns Vite plugin.
 */
export function airWorker(options: AirWorkerOptions = {}): Plugin {
  const entry = options.entry ?? 'src/worker.ts';
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'air-worker',
    config(userConfig, env) {
      if (!userConfig.ssr) userConfig.ssr = {};
      const noExternal = userConfig.ssr.noExternal;
      const airModules = [/^@airlib\//, /^@anchorlib\//, /^@irpclib\//];

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
      resolvedConfig = config;
    },

    transformIndexHtml(html, ctx) {
      if (!options.noscript || !ctx.bundle) return;

      const lines = html.replace('<html', '<html dehydrated').split('\n');

      for (const file of Object.keys(ctx.bundle)) {
        if (!file.endsWith('.js')) continue;
        const i = lines.findIndex((l) => l.includes(file));
        if (i > -1) {
          lines.splice(i, 1);
        }
        delete ctx.bundle[file];
      }

      return lines.join('\n');
    },

    async closeBundle() {
      const isSsr = Boolean(resolvedConfig.build.ssr);
      if (isSsr) {
        if (options.removeIndexHtml !== false) {
          const indexPath = resolve(resolvedConfig.root, 'dist/client/index.html');
          try {
            if (existsSync(indexPath)) {
              unlinkSync(indexPath);
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
        return `
          import worker from '/${entry.replace('./', '')}';
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
        const mods = server.moduleGraph.getModulesByFile(file);

        if (mods && mods.size > 0) {
          let isBackend = false;

          for (const mod of mods) {
            if (mod.url.match(/\.(css|scss|sass|less|styl|pcss|postcss)($|\?)/)) {
              continue;
            }
            if (mod.ssrModule || mod.ssrTransformResult || mod.ssrError) {
              isBackend = true;
              break;
            }
          }

          if (!isBackend) return;
        }

        for (const ws of activeSockets) {
          ws.close(1001, 'Vite HMR Restart');
        }
        activeSockets.clear();
      });

      server.httpServer?.on('upgrade', async (req, socket, head) => {
        if (req.headers['sec-websocket-protocol'] === 'vite-hmr') return;

        try {
          const workerModule = await server.ssrLoadModule(entry);
          const worker = workerModule.default;

          if (worker && typeof worker.upgrade === 'function' && worker.options?.wsRouter) {
            const request = toWebRequest(req, new AbortController());
            const resolve = await worker.upgrade(request, {});

            const { WebSocketServer } = await import('ws');
            const wss = new WebSocketServer({ noServer: true });

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
                server.config.logger.error(`[air-worker] WebSocket error: ${err.message}`);
              });
            });
          }
        } catch (error) {
          server.config.logger.error('[air-worker] WebSocket upgrade error:');
          server.config.logger.error(String(error));
          socket.destroy();
        }
      });

      return () => {
        server.middlewares.use(async (req, res, next) => {
          const controller = new AbortController();
          req.on('close', () => controller.abort());

          try {
            const urlPath = req.originalUrl ?? req.url ?? '/';
            if (options.ignoreDotPath !== false && urlPath.startsWith('/.')) return next();
            const request = toWebRequest(req, controller);

            const workerModule = await server.ssrLoadModule(entry);
            const worker = workerModule.default;

            if (!worker || typeof worker.fetch !== 'function') {
              return next();
            }

            if (worker.options) {
              worker.options.devMode = true;
              if (!worker.options.template) {
                const fs = await import('node:fs/promises');
                const path = await import('node:path');
                const rawHtml = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
                worker.options.template = await server.transformIndexHtml(urlPath, rawHtml);
              }
            }

            const response = await worker.fetch(request);

            await sendWebResponse(res, response);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

async function runSsrWorkerSsg(config: ResolvedConfig): Promise<void> {
  const workerPath = resolve(config.root, config.build.outDir, 'worker.js');
  if (!existsSync(workerPath)) return;

  try {
    const { pathToFileURL } = await import('node:url');
    const workerModule = await import(pathToFileURL(workerPath).href);
    const worker = workerModule.default ?? workerModule;

    if (!worker?.router || typeof worker.fetch !== 'function') return;

    for (const [path, info] of worker.router.entries()) {
      if (info.route?.options?.static) {
        const request = new Request(`http://localhost${path}`);
        await worker.fetch(request, undefined, true);
      }
    }
  } catch (e) {
    config.logger.warn(`[air-worker] SSG generation failed during build: ${e}`);
  }
}
