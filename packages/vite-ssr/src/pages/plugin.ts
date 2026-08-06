import fs from 'node:fs';
import path from 'node:path';
import type { Options as MdxOptions } from '@mdx-js/rollup';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import type { Plugin, PluginOption, ResolvedConfig, ViteDevServer } from 'vite';
import { type AirImageOptions, airImage } from '../image.js';
import { type AirWorkerOptions, airWorker } from '../worker.js';
import type { Framework } from './generate.js';
import { mdxAttachForFile } from './mdx.js';
import { DEFAULT_FILE_MAP, type FileMap } from './model.js';
import { createPagesSync, type PagesSync } from './sync.js';

export type AirMdxOptions = MdxOptions;

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
  markdown?: boolean | AirMdxOptions;

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
 */
export function airPages(options: AirPagesOptions = {}): PluginOption {
  const mdxEnabled = options.markdown !== false;
  let framework: Framework = options.framework ?? detectFramework(process.cwd());
  let irpcEnabled = options.irpc;

  let config: ResolvedConfig;
  let absPagesDir = '';
  let absAppDir = '';
  let absAirStackDir = '';
  let sync: PagesSync;
  let files: FileMap = { ...DEFAULT_FILE_MAP, ...options.files };
  let pageFileNames: Set<string>;
  let irpcFileNames: Set<string>;

  const invalidateVirtual = (server: ViteDevServer) => {
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
    if (mod) server.moduleGraph.invalidateModule(mod);

    for (const [, m] of server.moduleGraph.idToModuleMap) {
      if (m.file?.includes('.airstack') || m.id?.includes('@airstack') || m.id?.includes('.airstack')) {
        server.moduleGraph.invalidateModule(m);
      }
    }
    server.ws.send({ type: 'full-reload', path: '*' });
  };

  const isWatched = (file: string) => {
    if (file.startsWith(absPagesDir)) {
      const base = path.basename(file);
      if (pageFileNames?.has(base)) return true;
      if (irpcEnabled && irpcFileNames?.has(base)) return true;
      if (options.metadata !== false && file.endsWith('.mdx')) return true;
      return false;
    }
    if (absAppDir && path.dirname(file) === absAppDir) {
      const base = path.basename(file);
      return base === files.entry || base === files.client || base === files.workerEntry;
    }
    return false;
  };

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
      if (!options.framework) framework = detectFramework(config.root);
      files = { ...DEFAULT_FILE_MAP, ...options.files };
      pageFileNames = new Set([files.page, files.pageMdx, files.layout, files.layoutMdx, files.route]);
      irpcFileNames = new Set([files.constructor]);

      const pagesDir = options.pagesDir ?? 'src/pages';
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

      if (!fs.existsSync(absRouterFile)) {
        fs.mkdirSync(path.dirname(absRouterFile), { recursive: true });
        fs.writeFileSync(
          absRouterFile,
          [
            `import { createRouter } from '@anchorlib/${framework}';`,
            '',
            'const router = createRouter();',
            'export default router;',
          ].join('\n'),
          'utf-8'
        );
      }

      if (!fs.existsSync(absPagesDir)) {
        fs.mkdirSync(absPagesDir, { recursive: true });
        const routeMod = `./${files.route.replace(/\.[^.]+$/, '.js')}`;
        fs.writeFileSync(
          path.join(absPagesDir, files.layout),
          `import { page } from '@anchorlib/${framework}';\nimport { rootRoute } from '${routeMod}';\n\nexport default page(rootRoute).render(({ children }) => children);\n`,
          'utf-8'
        );
        fs.writeFileSync(
          path.join(absPagesDir, files.page),
          `import { page } from '@anchorlib/${framework}';\nimport { indexRoute } from '${routeMod}';\n\nexport default page(indexRoute).render(() => (\n  <>\n    <h1>Welcome to AIR Stack</h1>\n    <p>This is your generated home page.</p>\n  </>\n));\n`,
          'utf-8'
        );
      }

      absAirStackDir = path.resolve(config.root, '.airstack');
      const manifestDir = path.join(absAirStackDir, 'manifest');
      const metadataDir = path.join(absAirStackDir, 'metadata');

      if (options.manifest !== false) {
        fs.mkdirSync(manifestDir, { recursive: true });
        fs.writeFileSync(
          path.join(manifestDir, 'package.json'),
          JSON.stringify(
            {
              name: '@airstack/manifest',
              type: 'module',
              exports: {
                '.': './index.ts',
              },
            },
            null,
            2
          ),
          'utf-8'
        );
      }

      if (options.metadata !== false) {
        fs.mkdirSync(metadataDir, { recursive: true });
        fs.writeFileSync(
          path.join(metadataDir, 'package.json'),
          JSON.stringify(
            {
              name: '@airstack/metadata',
              type: 'module',
              exports: {
                '.': './index.ts',
                './*': './*.ts',
              },
            },
            null,
            2
          ),
          'utf-8'
        );
      }

      const nodeModulesDir = path.resolve(config.root, 'node_modules');
      const nodeModulesAirStack = path.join(nodeModulesDir, '@airstack');

      try {
        fs.mkdirSync(nodeModulesDir, { recursive: true });

        try {
          const oldAirSsr = path.join(nodeModulesDir, '@airssr');
          fs.rmSync(oldAirSsr, { recursive: true, force: true });
        } catch {}

        let createSymlink = true;
        const isWin32 = process.platform === 'win32';
        const expectedTarget = isWin32 ? absAirStackDir : path.relative(nodeModulesDir, absAirStackDir);

        try {
          const stat = fs.lstatSync(nodeModulesAirStack);
          if (stat.isSymbolicLink()) {
            const currentTarget = fs.readlinkSync(nodeModulesAirStack);
            if (currentTarget === expectedTarget) {
              createSymlink = false;
            } else {
              fs.unlinkSync(nodeModulesAirStack);
            }
          } else {
            fs.rmSync(nodeModulesAirStack, { recursive: true, force: true });
          }
        } catch {}

        if (createSymlink) {
          fs.symlinkSync(expectedTarget, nodeModulesAirStack, isWin32 ? 'junction' : 'dir');
        }
      } catch (err) {
        config.logger.error(`[air-pages] Failed to symlink .airstack to node_modules/@airstack: ${String(err)}`);
      }

      sync = createPagesSync({
        pagesDir: absPagesDir,
        routerFile: absRouterFile,
        manifestDir,
        manifest: options.manifest,
        metadataDir,
        metadata: options.metadata,
        framework,
        scaffold: options.scaffold,
        irpc: irpcEnabled,
        files,
      });

      sync.refresh();
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
      const fileNames = includeIrpc ? `{${pageFile},${layoutFile},${consFile}}` : `{${pageFile},${layoutFile}}`;

      const glob = `/${pagesDir}/**/${fileNames}.${extensions}`;

      return [`const modules = import.meta.glob('${glob}', { eager: true });`, `export default modules;`].join('\n');
    },

    async transform(code, id) {
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

      if (!mdxEnabled) return { code, map: null };

      if (normalizedId.endsWith('.mdx')) {
        const transformed = await mdxAttachForFile({
          file: normalizedId,
          pagesDir: absPagesDir,
          tree: sync.tree,
          framework,
          files,
          code,
          parse: (c) => this.parse(c),
        });

        if (!transformed) return { code, map: null };

        return {
          code: transformed,
          map: null,
        };
      }

      return { code, map: null };
    },

    configureServer(server) {
      server.watcher.add(absPagesDir);
      if (absAppDir) server.watcher.add(absAppDir);

      server.watcher.on('add', (file) => {
        if (!isWatched(file)) return;
        if (sync.onAdd(file)) invalidateVirtual(server);
      });

      server.watcher.on('change', (file) => {
        if (!isWatched(file)) return;
        if (sync.onChange(file)) invalidateVirtual(server);
      });

      server.watcher.on('unlink', (file) => {
        if (!isWatched(file)) return;
        if (sync.onUnlink(file)) invalidateVirtual(server);
      });

      const onDir = (dir: string) => {
        if (!dir.startsWith(absPagesDir) || dir === absPagesDir) return;
        if (sync.refresh()) invalidateVirtual(server);
      };

      server.watcher.on('addDir', onDir);
      server.watcher.on('unlinkDir', onDir);
    },
  };

  const plugins: Plugin[] = [];

  if (mdxEnabled) {
    const mdxOpts = typeof options.markdown === 'object' ? options.markdown : {};
    const remarkPlugins = [remarkFrontmatter, remarkMdxFrontmatter] as MdxOptions['remarkPlugins'];

    if (mdxOpts.remarkPlugins) {
      remarkPlugins!.push(...mdxOpts.remarkPlugins);
    }

    plugins.push(
      mdx({
        jsxImportSource: framework === 'solid' ? 'solid-js' : 'react',
        ...mdxOpts,
        remarkPlugins,
      }) as Plugin
    );
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

function detectFramework(root: string): Framework {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['@anchorlib/solid']) return 'solid';
    if (deps['@anchorlib/react']) return 'react';
  } catch {}

  return 'react';
}
