import { DEFAULT_FILE_MAP, type FileMap } from '../utils/mapper.js';
import { ImageStore } from './image-store.js';
import { META_STORE, type MetadataStore } from './metadata.js';
import { RouteStore } from './route-store.js';

export type Framework = 'react' | 'solid';

export type AirEnv = {
  /** In-memory metadata store keyed by absolute file path. */
  meta: MetadataStore;
  /** Central route registry over the parsed filesystem tree. */
  routes: RouteStore;
  /** Image encoding and caching store. */
  images: ImageStore;
  /**
   * Vite root (`config.root`) — the absolute project root. Base for every
   * relative identifier in logs and for resolving `rootDir`/`pagesDir`.
   */
  viteRoot: string;
  /**
   * Source root — where entry/client/worker files live — relative to the Vite
   * root. Not the pages directory; see `pagesDir`.
   * @default 'src'
   */
  rootDir: string;
  /**
   * Pages directory — the routing root where the file-tree scan starts —
   * relative to the Vite root. Not the source root; see `rootDir`.
   * @default 'src/pages'
   */
  pagesDir: string;
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
 * during the Vite `configResolved` hook by the `airEnv` plugin (see
 * `plugins/env.ts`), then read by every downstream module — no local closure
 * merges or guesswork anywhere.
 */
export const AIR_ENV: AirEnv = {
  meta: META_STORE,
  routes: new RouteStore(),
  images: new ImageStore(),
  viteRoot: '',
  rootDir: 'src',
  pagesDir: 'src/pages',
  framework: 'react',
  files: DEFAULT_FILE_MAP,
  linkMetadata: false,
};
