import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { AIR_ENV } from '../modules/env.js';
import { MDX_DEFAULT_OPTIONS, type MdxModuleOptions, mdxFile } from '../modules/markdown.js';

export type AirMarkdownOptions = MdxModuleOptions;

/**
 * Vite plugin pipeline for markdown pages. Each entry is split into a compiled
 * chunk module and a routed entry module — the page wrapper bound to the route
 * resolved from the central route tree — with HMR refresh wired on change.
 *
 * @param options Compilation options; `include` lists the markdown extensions
 *   treated as pages.
 */
export function airMarkdown(options: Partial<AirMarkdownOptions> = {}) {
  const $options = { ...MDX_DEFAULT_OPTIONS, ...options };

  const isEntryFile = (id: string) => {
    const [file] = id.split('?');
    const { files } = AIR_ENV;

    if (!file.startsWith(pagesRoot + path.sep)) return false;

    return [files.page, files.pageMdx, files.layout, files.layoutMdx].some(
      (f) => file.endsWith(f) && $options.include.some((ext) => f.endsWith(ext))
    );
  };

  return [
    {
      name: 'air-pages:mdx:init',
      enforce: 'pre',
      configResolved(config) {
        pagesRoot = path.resolve(config.root, AIR_ENV.pagesDir);
      },
      transform(code, id) {
        if (!isEntryFile(id)) return;
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
        if (!isEntryFile(id)) return;
        if (!isChunkable(id, code)) return;

        const resolution = AIR_ENV.routes.resolve(id);
        if (!resolution) {
          const entry = path.relative(pagesRoot, id.split('?')[0]);
          throw new Error(`[air-pages] No route resolution for markdown entry: ${entry}`);
        }

        const baseName = path.basename(id);
        const routeName = resolution.exportName;
        const routePath = `./${AIR_ENV.files.route}`;

        const chunkName = `./${baseName}${CHUNK_ALIAS}`;
        const chunkFile = path.join(path.dirname(id), `./${baseName}${CHUNK_SUFFIX}`);

        const chunk = CHUNK_ENTRIES.get(id)!;
        chunk.entry = [
          `import { page as __airPage } from '@anchorlib/${AIR_ENV.framework}';`,
          `import { ${routeName} as __airRoute } from '${routePath}';`,
          `if (import.meta.hot) import.meta.hot.accept();`,
          `export default __airPage(__airRoute).renderAsync(async () => {`,
          `  const chunkModule = await import('${chunkName}')`,
          `  return chunkModule.default;`,
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
        if (!isEntryFile(id)) return;

        const chunk = CHUNK_ENTRIES.get(id)!;
        const { code } = await mdxFile(id, chunk.code, $options);

        chunk.body = chunk.entry ? [code, 'export default AirMdxPage;'].join('\n') : code;
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:compose',
      transform(_code, id) {
        if (!isEntryFile(id)) return;

        const chunk = CHUNK_ENTRIES.get(id)!;

        if (isChunkFile(id)) {
          return chunk.body;
        }

        return chunk.entry ?? chunk.body;
      },
      handleHotUpdate({ file, server, modules }) {
        if (!isEntryFile(file)) return;

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

type AirChunkEntry = {
  id: string;
  code: string;
  body?: string;
  entry?: string;
  chunk?: string;
};

const CHUNK_ALIAS = '?chunk';
const CHUNK_SUFFIX = '.tsx?chunk';
const CHUNK_ENTRIES = new Map<string, AirChunkEntry>();

let pagesRoot = '';

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
