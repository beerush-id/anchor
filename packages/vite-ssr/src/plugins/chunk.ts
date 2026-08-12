import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { EntryResolver } from '../utils/resolver.js';

export type AirChunkOptions = {
  rootDir: string;
  include: string[];
  exclude: string[];
};

const DEFAULT_CHUNK_OPTIONS: AirChunkOptions = {
  rootDir: 'src/pages',
  include: ['.mdx'],
  exclude: [],
};

export function airChunk(options: Partial<AirChunkOptions> = {}) {
  const { include = ['.mdx'], exclude = [] } = { ...options };

  const chunkOptions = {
    rootDir: DEFAULT_CHUNK_OPTIONS.rootDir,
    include: [...DEFAULT_CHUNK_OPTIONS.include, ...include],
    exclude: [...DEFAULT_CHUNK_OPTIONS.exclude, ...exclude],
  };

  return {
    name: 'vite-plugin-air-chunk',
    transform(code, id) {
      if (!isChunkEntry(id, chunkOptions) || id.includes('?chunk')) return;
      if (code.includes('page(') || code.includes('modal(')) return;

      const type = chunkType(id) as keyof EntryResolver;
      const isRoot = path.dirname(id).endsWith(chunkOptions.rootDir);
      const resolver = new EntryResolver(id, isRoot);
      const routeName = resolver[type];
      const routePath = `./route.ts`;

      return [
        `import { ${routeName} as __airRoute } from '${routePath}';`,
        `if (import.meta.hot) import.meta.hot.accept();`,
        `export default __airRoute.renderAsync(async () => (await import('./${resolver.baseName}?chunk')).default);`,
      ].join('\n');
    },
  } as Plugin;
}

function chunkType(id: string) {
  const dir = path.dirname(id);
  if (id.endsWith('layout.tsx') || id.endsWith('layout.mdx')) return 'route';
  if (id.endsWith('.page.tsx') || id.endsWith('.page.mdx')) return 'named';
  const hasLayout = ['layout.tsx', 'layout.mdx'].find((f) => fs.statSync(path.join(dir, f)).isFile());
  return hasLayout ? 'index' : 'route';
}

function isChunkEntry(id: string, options: AirChunkOptions) {
  const included = options.include!.some((pattern) => id.endsWith(pattern));
  const excluded = options.exclude?.some((pattern) => id.endsWith(pattern));
  return included && !excluded;
}
