import fs from 'node:fs';
import path from 'node:path';
import type { ResolvedConfig } from 'vite';
import type { ImageStore } from './image-store.js';
import { META_STORE, type MetadataStore } from './metadata.js';
import { RouteStore } from './route-store.js';

export type Framework = 'react' | 'solid';

export type FileMap = {
  page: string;
  pageMdx: string;
  layout: string;
  layoutMdx: string;
  route: string;
  router: string;
  constructor: string;
  function: string;
  entry: string;
  client: string;
  workerEntry: string;
  ambient: string;
};

export const DEFAULT_FILE_MAP: FileMap = {
  page: 'page.tsx',
  pageMdx: 'page.mdx',
  layout: 'layout.tsx',
  layoutMdx: 'layout.mdx',
  route: 'route.ts',
  router: 'router.ts',
  constructor: 'constructor.ts',
  function: 'function.ts',
  entry: 'app.tsx',
  client: 'client.tsx',
  workerEntry: 'worker.ts',
  ambient: 'global.d.ts',
};

export type AirEnv = {
  /** In-memory metadata store keyed by absolute file path. */
  meta: MetadataStore;
  /** Central route registry over the parsed filesystem tree. */
  routes: RouteStore;
  /** Image encoding and caching store. */
  images?: ImageStore;
  /**
   * Vite root (`config.root`) — the absolute project root. Base for every
   * relative identifier in logs and for resolving `srcDir`/`pagesDir`.
   */
  viteRoot: string;
  /**
   * Source entry files directory — where entry/client/worker/router files live —
   * relative to the Vite root.
   * @default 'src'
   */
  srcDir: string;
  /**
   * Pages directory — the routing root where the file-tree scan starts —
   * relative to the Vite root.
   * @default 'pages'
   */
  pagesDir: string;
  /**
   * Cache directory name relative to the Vite root.
   * @default '.airlib'
   */
  cacheDir: string;
  /**
   * Virtual package scope for the node_modules symlink.
   * @default '@airlib-cache'
   */
  cacheScope: string;
  /**
   * Root path alias prefix for project-relative imports.
   * @default '@'
   */
  rootAlias: string;
  /** UI framework for scaffolds, MDX pages, and generated code. */
  framework: Framework;
  /** Resolved file name map (defaults merged with user overrides). */
  files: FileMap;
  /** Whether to automatically link MDX frontmatter metadata to route declarations. */
  linkMetadata: boolean;
  /** Last served URL in dev, used to force SSR module refresh on MDX changes. */
  currentUrl?: string;
};

/**
 * Shared environment state for the whole file-routing pipeline. Resolved once
 * during the Vite `configResolved` hook by the `initEnv` helper, then read by
 * every downstream module.
 */
export const AIR_ENV: AirEnv = {
  meta: META_STORE,
  routes: new RouteStore(),
  viteRoot: '',
  srcDir: 'src',
  pagesDir: 'pages',
  cacheDir: '.airlib',
  cacheScope: '@airlib-cache',
  rootAlias: '@',
  framework: 'react',
  files: DEFAULT_FILE_MAP,
  linkMetadata: false,
};

/**
 * Initializes and merges the shared `AIR_ENV` state during Vite's `configResolved`.
 * Safe to be called by multiple plugins — idempotent for `viteRoot` and merges
 * caller-specific overrides.
 */
export function initEnv(config: ResolvedConfig, overrides?: Partial<AirEnv>): void {
  AIR_ENV.viteRoot = config.root;

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        // biome-ignore lint/suspicious/noExplicitAny: Generic assignment to AIR_ENV
        (AIR_ENV as any)[key] = value;
      }
    }
  }

  if (!overrides?.framework) {
    AIR_ENV.framework = detectFramework(config.root);
  }
}

/**
 * Detects UI framework from `package.json` dependencies.
 */
export function detectFramework(root: string): Framework {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['@airlib/solid']) return 'solid';
    /* istanbul ignore else */
    if (deps['@airlib/react']) return 'react';
  } catch {}

  return 'react';
}
