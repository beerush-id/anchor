import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { AIR_ENV, type AirEnv, type Framework } from '../modules/env.js';

export type AirEnvOptions = Partial<Pick<AirEnv, 'framework'>>;

export function airEnv(options: AirEnvOptions = {}) {
  const { framework } = { ...options };

  return {
    name: 'air-pages:env',
    enforce: 'pre',
    configResolved(config) {
      AIR_ENV.rootDir = config.root;
      AIR_ENV.framework = framework ?? detectFramework(config.root);
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
