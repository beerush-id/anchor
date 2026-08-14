import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { MDX_DEFAULT_OPTIONS, mdxFile, type MdxModuleOptions } from '../modules/markdown.js';
import { EntryResolver } from '../utils/resolver.js';
import { AIR_ENV } from './env.js';

export type AirMarkdownOptions = MdxModuleOptions & {
  rootDir: string;
  include: string[];
};

const DEFAULT_OPTIONS: AirMarkdownOptions = {
  rootDir: 'src/pages',
  ...MDX_DEFAULT_OPTIONS,
};

export type AirChunkEntry = {
  id: string;
  code: string;
  body?: string;
  entry?: string;
  chunk?: string;
};

export const CHUNK_ALIAS = '?chunk';
export const CHUNK_ENTRIES = new Map<string, AirChunkEntry>();
export const CHUNK_SUFFIX = '.tsx?chunk';

export function airMarkdown(options: Partial<AirMarkdownOptions> = {}) {
  const $options = { ...DEFAULT_OPTIONS, ...options };

  return [
    {
      name: 'air-pages:mdx:init',
      enforce: 'pre',
      transform(code, id) {
        if (!isEntryFile(id, $options.include)) return;
        if (!CHUNK_ENTRIES.has(id)) CHUNK_ENTRIES.set(id, { id, code });
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:chunk',
      enforce: 'pre',
      async resolveId(id, importer) {
        if (!isChunkAlias(id)) return;

        const [file] = id.split('?');
        const resolution = await this.resolve(file, importer, { skipSelf: true });
        if (resolution) return `${resolution.id}${CHUNK_SUFFIX}`;

        return id;
      },
      async load(id) {
        if (!isChunkFile(id)) return;
        const chunk = CHUNK_ENTRIES.get(id)!;

        if (!chunk) {
          const src = id.replace(CHUNK_SUFFIX, '');
          const text = fs.readFileSync(src, 'utf-8');
          const { code } = await mdxFile(src, text, $options);
          return [code, 'export default AirMdxPage;'].join('\n');
        }

        return chunk?.body;
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:entry',
      enforce: 'pre',
      transform(code, id) {
        if (isChunkFile(id)) return;
        if (!isEntryFile(id, $options.include)) return;
        if (!isChunkable(id, code)) return;

        const type = chunkType(id) as keyof EntryResolver;
        const isRoot = path.dirname(id).endsWith($options.rootDir);
        const resolver = new EntryResolver(id, isRoot);
        const routeName = resolver[type];
        const routePath = `./route.ts`;

        const chunkName = `./${resolver.baseName}${CHUNK_ALIAS}`;
        const chunkFile = path.join(path.dirname(id), `./${resolver.baseName}${CHUNK_SUFFIX}`);

        const chunk = CHUNK_ENTRIES.get(id)!;
        chunk.entry = [
          `import { page as __airPage } from '@anchorlib/${AIR_ENV.framework}';`,
          `import { ${routeName} as __airRoute } from '${routePath}';`,
          `if (import.meta.hot) import.meta.hot.accept();`,
          `export default __airPage(__airRoute).renderAsync(async () => {`,
          `  const m = await import('${chunkName}')`,
          `  return m.default;`,
          `});`,
        ].join('\n');

        chunk.chunk = chunkFile;
        CHUNK_ENTRIES.set(chunkFile, chunk);
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:compile',
      enforce: 'pre',
      async transform(_code, id) {
        if (isChunkFile(id)) return;
        if (!isEntryFile(id, $options.include)) return;

        const chunk = CHUNK_ENTRIES.get(id)!;
        const { code } = await mdxFile(id, chunk.code, $options);

        chunk.body = chunk.entry ? [code, 'export default AirMdxPage;'].join('\n') : code;
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:compose',
      transform(_code, id) {
        if (!isEntryFile(id, $options.include)) return;

        const chunk = CHUNK_ENTRIES.get(id)!;

        if (isChunkFile(id)) {
          return chunk.body;
        }

        return chunk.entry ?? chunk.body;
      },
      handleHotUpdate({ file, server, modules }) {
        if (!isEntryFile(file, $options.include)) return;

        const entry = CHUNK_ENTRIES.get(file);
        const updates = [...modules];

        if (entry?.chunk) {
          CHUNK_ENTRIES.delete(entry.chunk);

          const chunk = server.moduleGraph.getModuleById(entry.chunk);

          if (chunk) {
            server.moduleGraph.invalidateModule(chunk);
            updates.push(chunk);
          }
        }

        CHUNK_ENTRIES.delete(file);

        if (AIR_ENV.currentUrl) {
          // Force refresh SSR modules.
          fetch(AIR_ENV.currentUrl).then(() => {});
        }

        return updates;
      },
    } as Plugin,
  ];
}

function chunkType(id: string) {
  const [file] = id.split('?');
  const dir = path.dirname(file);

  if (file.endsWith('layout.tsx') || file.endsWith('layout.mdx')) return 'route';
  if (file.endsWith('.page.tsx') || file.endsWith('.page.mdx')) return 'named';

  const hasLayout = ['layout.tsx', 'layout.mdx'].find((f) => fs.statSync(path.join(dir, f)).isFile());
  return hasLayout ? 'index' : 'route';
}

const ENTRY_NAMES = ['layout', 'page'];
function isEntryFile(id: string, include: string[]) {
  const [file] = id.split('?');

  for (const name of ENTRY_NAMES) {
    for (const ext of include) {
      if (file.endsWith(`${name}${ext}`)) return true;
    }
  }

  return false;
}

function isChunkFile(id: string) {
  return id.endsWith(CHUNK_SUFFIX);
}

function isChunkAlias(id: string) {
  return id.endsWith(CHUNK_ALIAS);
}

function isChunkable(id: string, code: string) {
  const ext = path.extname(id);
  return !(
    (ext === '.jsx' || ext === '.tsx') &&
    (code.includes('export default page(') || code.includes('export default' + ' modal('))
  );
}
