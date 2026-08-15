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
  images: ImageStore;
  /**
   * Source root, relative to the Vite root.
   * @default 'src'
   */
  rootDir: string;
  /**
   * Pages directory, relative to the Vite root.
   * @default 'src/pages'
   */
  pagesDir: string;
  framework: Framework;
  /** Resolved file name map (defaults merged with user overrides). */
  files: FileMap;
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
  images: new ImageStore('', {}),
  rootDir: 'src',
  pagesDir: 'src/pages',
  framework: 'react',
  files: DEFAULT_FILE_MAP,
};
