import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import type { Framework } from '../utils/mapper.js';

export type AirEnv = {
  framework: Framework;
  currentUrl?: string;
};

export const AIR_ENV: AirEnv = {
  framework: 'react',
};

export function airEnv() {
  return {
    name: 'air-pages:env',
    configResolved(config) {
      AIR_ENV.framework = detectFramework(config.root);
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
