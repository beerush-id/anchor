import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginOption, ResolvedConfig } from 'vite';
import { AppNode } from '../modules/app-node.js';
import type { MdxExtendedOptions } from '../modules/markdown.js';
import { DEFAULT_FILE_MAP, type FileMap } from '../utils/mapper.js';
import { airWorker, type AirWorkerOptions } from '../worker.js';
import { airEnv } from './env.js';
import { airImage, type AirImageOptions } from './image.js';
import { airMarkdown, type AirMarkdownOptions } from './markdown.js';
import { airPreprocess } from './preprocess.js';
import { airSearch, type MdxSearchOptions } from './search.js';
import { AIR_ENV, type Framework } from '../modules/env.js';

export type AirPagesOptions = {
  /**
   * Pages directory, relative to the Vite root.
   * Defaults to 'src/pages'.
   */
  pagesDir?: string;

  /**
   * Router file exporting `rootRoute`, relative to the Vite root.
   * First-level generated `route.ts` files import `rootRoute` from here.
   * Defaults to 'src/router.ts'.
   */
  routerFile?: string;

  /**
   * UI framework for scaffolds and MDX pages.
   * Defaults to auto-detection from `package.json` dependencies.
   */
  framework?: Framework;

  /**
   * Whether to scaffold starter content into newly created empty
   * `page.tsx` / `layout.tsx` / `page.mdx` files. Only ever writes to
   * 0-byte files — existing content is never touched.
   * Defaults to true.
   */
  scaffold?: boolean;

  /**
   * File name overrides.
   * Default: `{ page: 'page.tsx', pageMdx: 'page.mdx', layout: 'layout.tsx', route: 'route.ts', constructor: 'constructor.ts' }`
   */
  files?: Partial<FileMap>;

  /**
   * MDX configuration.
   * `false` to disable, `true`/omit for defaults, object to configure.
   */
  markdown?: boolean | Partial<AirMarkdownOptions>;
  extended?: boolean | Partial<MdxExtendedOptions>;
  searchIndex?: boolean | Partial<MdxSearchOptions>;

  /**
   * Enable true static SSR by shipping zero JavaScript to the client.
   */
  noscript?: boolean;

  /**
   * Defer the Javascript to load after full load to improve FCP.
   */
  deferred?: boolean | number;

  /**
   * Whether to enable automatic static site generation (SSG) during server build.
   * Defaults to true (`false` to disable).
   */
  ssg?: boolean;

  /**
   * Worker configuration.
   * `false` to disable, omit for defaults.
   */
  worker?: false | AirWorkerOptions;

  /**
   * Image configuration.
   * `false` to disable, omit for defaults.
   */
  image?: false | AirImageOptions;

  /**
   * IRPC auto-discovery.
   * `false` to disable, auto-detected from worker file by default.
   */
  irpc?: boolean;

  /**
   * Whether to generate route manifest in `.airstack/manifest`.
   * Defaults to true (`false` to disable).
   */
  manifest?: boolean;

  /**
   * Whether to generate MDX metadata in `.airstack/metadata`.
   * Defaults to true (`false` to disable).
   */
  metadata?: boolean;
};

const VIRTUAL_ROUTES = 'virtual:air/routes';
const RESOLVED_VIRTUAL_ROUTES = '\0air-pages/routes';

/**
 * File-based routing for AIR Stack applications.
 *
 * Watches the pages directory, generates per-folder `route.ts` files (folders
 * define URLs), exposes `virtual:air/routes` (eager glob of all page/layout
 * modules), transforms `page.mdx` files into routed pages with frontmatter
 * meta, scaffolds starter content into newly created empty page files, and
 * emits the `src/routes.ts` route manifest for sidebars/menus/breadcrumbs.
 *
 * Works in CSR + SSR (same glob and transforms in both environments).
 *
 * @param options Plugin configuration options.
 * @returns Vite plugin array.
 */
export function airPages(options: AirPagesOptions = {}): PluginOption {
  let irpcEnabled = options.irpc;
  let config: ResolvedConfig;
  let absPagesDir = '';
  let absAppDir = '';
  let app: AppNode;
  let files: FileMap = { ...DEFAULT_FILE_MAP, ...options.files };
  let shouldReload = false;
  let pagesDir = options.pagesDir ?? 'src/pages';

  const corePlugin: Plugin = {
    name: 'air-pages',

    config() {
      return {
        optimizeDeps: {
          exclude: ['@airstack/manifest', '@airstack/metadata'],
        },
        ssr: {
          noExternal: ['@airstack/manifest', '@airstack/metadata'],
        },
      };
    },

    configResolved(resolved) {
      config = resolved;
      files = { ...DEFAULT_FILE_MAP, ...options.files };

      pagesDir = options.pagesDir ?? 'src/pages';

      const routerFile = options.routerFile ?? 'src/router.ts';
      const workerFile = options.worker
        ? (options.worker.entry ?? `src/${files.workerEntry}`)
        : `src/${files.workerEntry}`;

      absPagesDir = path.resolve(config.root, pagesDir);
      const absRouterFile = path.resolve(config.root, routerFile);
      const absWorkerFile = path.resolve(config.root, workerFile);
      absAppDir = path.dirname(absRouterFile);

      if (irpcEnabled === undefined && fs.existsSync(absWorkerFile)) {
        const workerContent = fs.readFileSync(absWorkerFile, 'utf-8');
        irpcEnabled = workerContent.includes('httpRouter') || workerContent.includes('wsRouter');
      }

      app = new AppNode({
        root: config.root,
        pagesDir: absPagesDir,
        appDir: absAppDir,
        routerFile: absRouterFile,
        manifestEnabled: options.manifest,
        metadataEnabled: options.metadata,
        framework: AIR_ENV.framework,
        scaffoldEnabled: options.scaffold,
        fileMap: files,
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_ROUTES) return RESOLVED_VIRTUAL_ROUTES;
    },

    load(id, loadOpts) {
      if (id !== RESOLVED_VIRTUAL_ROUTES) return;

      const pagesDir = options.pagesDir ?? 'src/pages';
      const isSsr = Boolean(loadOpts?.ssr);
      const includeIrpc = irpcEnabled && isSsr;

      const extensions = includeIrpc ? '{tsx,mdx,ts}' : '{tsx,mdx}';
      const layoutFile = files.layout.split('.')[0];
      const pageFile = files.page.split('.')[0];
      const consFile = files.constructor.split('.')[0];
      const fileNames = includeIrpc
        ? `{${pageFile},${layoutFile},${consFile},*.${pageFile}}`
        : `{${pageFile},${layoutFile},*.${pageFile}}`;

      const glob = `/${pagesDir}/**/${fileNames}.${extensions}`;

      return [`const modules = import.meta.glob('${glob}', { eager: true });`, `export default modules;`].join('\n');
    },

    transform(code, id) {
      const { client = DEFAULT_FILE_MAP.client, workerEntry = DEFAULT_FILE_MAP.workerEntry } = options.files ?? {};
      const { entry: worker = `src/${workerEntry}` } = options.worker || {};

      const normalizedId = id.split('?')[0];
      const absClientFile = path.resolve(config.root, 'src', client);
      const absWorkerFile = path.resolve(config.root, worker);

      if (normalizedId === absClientFile || normalizedId === absWorkerFile) {
        if (!code.includes(VIRTUAL_ROUTES)) {
          code += `\nimport '${VIRTUAL_ROUTES}';\n`;
        }
      }

      return { code, map: null };
    },

    configureServer(server) {
      let reloadTimer: ReturnType<typeof setTimeout>;

      app.on('change', (file: string, kind: 'update' | 'reload') => {
        const mods = server.moduleGraph.getModulesByFile(file);
        if (mods) {
          for (const m of mods) {
            server.moduleGraph.invalidateModule(m);
          }
        }

        if (kind === 'reload') shouldReload = true;

        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          if (shouldReload) {
            const virtualMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
            if (virtualMod) server.moduleGraph.invalidateModule(virtualMod);
            server.ws.send({ type: 'full-reload', path: '*' });
          }

          shouldReload = false;
        }, 100);
      });

      app.rootFolder.watch();
    },

    handleHotUpdate() {
      // If a full reload is pending (e.g. route structure changed),
      // suppress all HMR updates so the browser doesn't try to apply them
      // using a stale module cache before the reload happens.
      if (shouldReload) return [];
    },
  };

  const plugins: Plugin[] = [airEnv(options)];
  const mdOptions = {
    rootDir: pagesDir,
    extended: options.extended,
    ...(typeof options.markdown === 'object' ? options.markdown : {}),
  } as AirMarkdownOptions;

  plugins.push(...airPreprocess({ ...mdOptions, markdown: options.markdown !== false }));

  if (options.markdown !== false) {
    plugins.push(...airMarkdown(mdOptions));
  }

  if (options.searchIndex) {
    plugins.push(airSearch(typeof options.searchIndex === 'object' ? options.searchIndex : {}));
  }

  if (options.worker !== false) {
    plugins.push(airWorker({ noscript: options.noscript, ssg: options.ssg, ...options.worker }));
  }

  if (options.image !== false) {
    plugins.push(airImage(options.image));
  }

  plugins.push(corePlugin);

  return plugins;
}
