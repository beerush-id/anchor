import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { AIR_ENV, type Framework } from '../modules/env.js';
import { ImageStore } from '../modules/image-store.js';
import { DEFAULT_FILE_MAP } from '../utils/mapper.js';
import type { AirPagesOptions } from './pages.js';

export { AIR_ENV, type AirEnv, type Framework } from '../modules/env.js';

/**
 * The single resolution point for the whole file-routing pipeline. During the
 * Vite `configResolved` hook it merges the user's `airPages` options with the
 * framework defaults and freezes the result onto the shared `AIR_ENV` — every
 * downstream module reads from there and never guesses.
 */
export function airEnv(options: AirPagesOptions = {}): Plugin {
  return {
    name: 'air-pages:env',
    enforce: 'pre',
    configResolved(config) {
      AIR_ENV.pagesDir = options.pagesDir ?? AIR_ENV.pagesDir;
      AIR_ENV.framework = options.framework ?? detectFramework(config.root);
      AIR_ENV.files = { ...DEFAULT_FILE_MAP, ...options.files };
      AIR_ENV.images = new ImageStore(
        path.join(config.root, 'node_modules', '.cache', 'air-image'),
        typeof options.image === 'object' ? options.image : {}
      );
    },
  } as Plugin;
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
