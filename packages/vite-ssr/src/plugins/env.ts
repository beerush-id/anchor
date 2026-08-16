import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { color, taggedLogger } from '../logger.js';
import { AIR_ENV, type Framework } from '../modules/env.js';
import { DEFAULT_FILE_MAP } from '../utils/mapper.js';
import type { AirPagesOptions } from './pages.js';

const log = taggedLogger('air-pages');

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
      AIR_ENV.viteRoot = config.root;
      AIR_ENV.pagesDir = options.pagesDir ?? AIR_ENV.pagesDir;
      AIR_ENV.framework = options.framework ?? detectFramework(config.root);
      log.verbose(color.event('Framework:'), AIR_ENV.framework);
      AIR_ENV.files = { ...DEFAULT_FILE_MAP, ...options.files };
      log.verbose(color.event('Merged file map'), Object.keys(AIR_ENV.files).length, 'entries');
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
