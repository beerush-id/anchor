import fs from 'node:fs';
import path from 'node:path';
import type { LogLevel } from '@beerush/logger';
import type { Plugin, PluginOption, ResolvedConfig } from 'vite';
import { color, setLogLevel, taggedLogger } from '../logger.js';
import { AppNode } from '../modules/app-node.js';
import { AIR_ENV, type Framework } from '../modules/env.js';
import type { MdxExtendedOptions } from '../modules/markdown.js';
import type { FileMap } from '../utils/mapper.js';
import { airWorker, type AirWorkerOptions, resolveWorkerEntry } from '../worker.js';
import { airEnv } from './env.js';
import { airImage, type AirImageOptions } from './image.js';
import { airMarkdown, type AirMarkdownOptions } from './markdown.js';
import { airPreprocess } from './preprocess.js';
import { airSearch, type MdxSearchOptions } from './search.js';

const log = taggedLogger('air-pages');

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
   * Whether to generate route manifest in `.airlib/manifest`.
   * Defaults to true (`false` to disable).
   */
  manifest?: boolean;

  /**
   * Whether to generate MDX metadata in `.airlib/metadata`.
   * Defaults to true (`false` to disable).
   */
  metadata?: boolean;

  /**
   * Whether to link MDX frontmatter metadata to route declarations (.meta()).
   * Requires metadata generation to be enabled.
   * @default false
   */
  linkMetadata?: boolean;

  /**
   * Console log level, applied to every `air-*` tag (shared sink).
   * Authoritative over sub-plugin levels when composing via `airPages`.
   * @default LogLevel.INFO
   */
  logLevel?: LogLevel;
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
  let absClientFile = '';
  let absWorkerFile = '';
  let app: AppNode;
  let shouldReload = false;

  const corePlugin: Plugin = {
    name: 'air-pages',

    config() {
      return {
        optimizeDeps: {
          exclude: ['@airlib-cache/manifest', '@airlib-cache/metadata'],
        },
        ssr: {
          noExternal: ['@airlib-cache/manifest', '@airlib-cache/metadata'],
        },
      };
    },

    configResolved(resolved) {
      config = resolved;
      setLogLevel(options.logLevel);

      const routerFile = options.routerFile ?? 'src/router.ts';
      const workerFile = resolveWorkerEntry(typeof options.worker === 'object' ? options.worker : {});

      absPagesDir = path.resolve(config.root, AIR_ENV.pagesDir);
      absAppDir = path.dirname(path.resolve(config.root, routerFile));

      absClientFile = path.resolve(config.root, AIR_ENV.rootDir, AIR_ENV.files.client);
      absWorkerFile = path.resolve(config.root, workerFile);

      if (irpcEnabled === undefined && fs.existsSync(absWorkerFile)) {
        const workerContent = fs.readFileSync(absWorkerFile, 'utf-8');
        irpcEnabled = workerContent.includes('httpRouter') || workerContent.includes('wsRouter');
      }

      log.verbose(color.event('Resolved pages dir'), color.file(path.relative(config.root, absPagesDir)));
      log.verbose(color.event('IRPC discovery:'), irpcEnabled === true ? 'enabled' : 'disabled');

      app = new AppNode({
        root: config.root,
        pagesDir: absPagesDir,
        appDir: absAppDir,
        routerFile: path.resolve(config.root, routerFile),
        manifestEnabled: options.manifest,
        metadataEnabled: options.metadata,
        linkMetadata: options.linkMetadata ?? false,
        framework: AIR_ENV.framework,
        scaffoldEnabled: options.scaffold,
        fileMap: AIR_ENV.files,
      });

      log.verbose(color.event('air-pages initialized'));
    },

    resolveId(id) {
      if (id === VIRTUAL_ROUTES) return RESOLVED_VIRTUAL_ROUTES;
    },

    load(id, loadOpts) {
      if (id !== RESOLVED_VIRTUAL_ROUTES) return;

      const { files } = AIR_ENV;
      const isSsr = Boolean(loadOpts?.ssr);
      const includeIrpc = irpcEnabled && isSsr;

      const uiFiles = [files.page, files.pageMdx, files.layout, files.layoutMdx];
      const uiExts = Array.from(new Set(uiFiles.map((f) => f.split('.').pop()!))).join(',');
      const uiBases = Array.from(new Set(uiFiles.map((f) => f.split('.')[0]))).join(',');
      const pageBase = files.page.split('.')[0];

      const uiGlob = `/${AIR_ENV.pagesDir}/**/{${uiBases},*.${pageBase}}.{${uiExts}}`;
      const globs = [uiGlob];

      if (includeIrpc) {
        globs.push(`/${AIR_ENV.pagesDir}/**/${files.constructor}`);
      }

      log.verbose(color.event('Built'), 'routes glob', `(${isSsr ? 'ssr' : 'client'}, ${globs.length} patterns)`);

      return [
        `const modules = import.meta.glob(${JSON.stringify(globs)}, { eager: true });`,
        `export default modules;`,
      ].join('\n');
    },

    transform(code, id) {
      const normalizedId = id.split('?')[0];

      if (normalizedId === absClientFile || normalizedId === absWorkerFile) {
        if (!code.includes(VIRTUAL_ROUTES)) {
          code += `\nimport '${VIRTUAL_ROUTES}';\n`;
          log.verbose(
            color.event('Injected routes import'),
            'into',
            color.file(path.relative(config.root, normalizedId))
          );
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
            log.debug(color.event('Full reload'), '— route structure changed');
          }

          shouldReload = false;
        }, 100);
      });

      app.rootFolder.watch();
    },

    handleHotUpdate() {
      if (shouldReload) return [];
    },
  };

  const plugins: Plugin[] = [airEnv(options)];
  const mdOptions = {
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
