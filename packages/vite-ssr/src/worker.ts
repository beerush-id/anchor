import type { Plugin } from 'vite';
import { sendWebResponse, toWebRequest } from './utils.js';

export type AirWorkerOptions = {
  /**
   * Path to the worker entry module.
   * Defaults to 'src/worker.ts'.
   */
  entry?: string;
};

export function airWorker(options: AirWorkerOptions = {}): Plugin {
  const entry = options.entry ?? 'src/worker.ts';

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

      // We should also set appType: 'custom' so Vite doesn't try to serve index.html statically!
      // This ensures our middleware catches the request for SSR.
      if (!userConfig.appType) {
        userConfig.appType = 'custom';
      }

      // In build mode, point Rollup to our virtual wrapper so it injects the template natively
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

    load(id) {
      if (id === 'worker') {
        // The wrapper loads the user's actual worker entry and sets the built HTML template onto it
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

      server.watcher.on('change', () => {
        for (const ws of activeSockets) {
          ws.close(1012, 'Vite HMR Restart');
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
            });
          }
        } catch (error) {
          server.config.logger.error('[air-worker] WebSocket upgrade error:');
          server.config.logger.error(String(error));
          socket.destroy();
        }
      });

      // Install as a post-middleware so Vite's internal handlers run first
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const controller = new AbortController();
          req.on('close', () => controller.abort());

          try {
            const urlPath = req.originalUrl ?? req.url ?? '/';
            const request = toWebRequest(req, controller);

            // Load the worker entry via Vite (picks up HMR automatically)
            const workerModule = await server.ssrLoadModule(entry);
            const worker = workerModule.default;

            if (!worker || typeof worker.fetch !== 'function') {
              return next();
            }

            // In Dev Mode, inject the transformed template directly into the worker's options
            // This prevents us from transforming the entire HTML page after it's rendered!
            if (worker.options && !worker.options.template) {
              const fs = await import('node:fs/promises');
              const path = await import('node:path');
              const rawHtml = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
              worker.options.template = await server.transformIndexHtml(urlPath, rawHtml);
            }

            // Forward the standard Web Request to the worker
            const response = await worker.fetch(request);

            // Just stream the response, no post-render transform needed!
            await sendWebResponse(res, response);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}
