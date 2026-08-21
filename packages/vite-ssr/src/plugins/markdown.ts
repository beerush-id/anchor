import fs from 'node:fs';
import path from 'node:path';
import type { LogLevel } from '@beerush/logger';
import type { Plugin } from 'vite';
import { color, setLogLevel, taggedLogger } from '../logger.js';
import { AIR_ENV, initEnv } from '../modules/env.js';
import { MDX_DEFAULT_OPTIONS, type MdxModuleOptions, mdxEntryWrapper, mdxFile } from '../modules/markdown.js';

const log = taggedLogger('air-markdown');

export type AirMarkdownOptions = MdxModuleOptions & { logLevel?: LogLevel };

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
    const { page, pageMdx, layout, layoutMdx } = AIR_ENV.files;

    if (!isMdxFile(file) || !file.startsWith(pagesRoot + path.sep)) return false;
    return [page, pageMdx, layout, layoutMdx].some((entry) => file.endsWith(entry));
  };

  const isPlainMdx = (id: string) => {
    return isMdxFile(id) && !isEntryFile(id);
  };

  const isMdxFile = (id: string) => {
    const idExt = path.extname(id);
    return $options.include.some((ext) => ext === idExt);
  };

  return [
    {
      name: 'air-pages:mdx:init',
      enforce: 'pre',
      configResolved(config) {
        initEnv(config);
        setLogLevel(options.logLevel);
        pagesRoot = path.resolve(config.root, AIR_ENV.pagesDir);
      },
      transform(code, id) {
        if (!isMdxFile(id)) return;
        if (!CHUNK_ENTRIES.has(id)) {
          CHUNK_ENTRIES.set(id, { id, code });
          log.verbose(color.event('Registered'), color.file(relFile(id)), 'entry');
        }
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:entry',
      enforce: 'pre',
      transform(code, id) {
        if (isChunkFile(id) || !isMdxFile(id) || !isChunkable(id, code)) return;

        const chunk = CHUNK_ENTRIES.get(id)!;
        const baseName = path.basename(id);
        const chunkName = `./${baseName}${CHUNK_ALIAS}`;
        const chunkFile = path.join(path.dirname(id), `./${baseName}${CHUNK_SUFFIX}`);

        if (isPlainMdx(id)) {
          chunk.entry = [
            `import AirMdxPage from '${chunkName}';`,
            `export * from '${chunkName}';`,
            'if (import.meta.hot)' + ' import.meta.hot.accept();',
            'export default AirMdxPage;',
          ].join('\n');
          chunk.chunk = chunkFile;

          CHUNK_ENTRIES.set(chunkFile, chunk);
          log.verbose(color.event('Created standalone chunk for'), color.file(relFile(id)));
          return chunk.entry;
        }

        const route = AIR_ENV.routes.resolve(id);
        if (!route) {
          const entry = path.relative(pagesRoot, id.split('?')[0]);
          throw new Error(`[air-pages] No route resolution for markdown entry: ${entry}`);
        }

        const routeName = route.exportName;

        log.verbose(color.event('Resolved'), 'route for', color.file(relFile(id)));
        log.verbose(color.event('Wired'), color.file(relFile(id)), 'to', routeName);

        const { framework, files } = AIR_ENV;

        chunk.entry = mdxEntryWrapper({ file: id, route, framework, files, chunkName });
        chunk.chunk = chunkFile;

        CHUNK_ENTRIES.set(chunkFile, chunk);
        log.verbose(color.event('Created'), 'chunk for', color.file(relFile(id)));
      },
    } as Plugin,
    {
      name: 'air-pages:mdx:chunk',
      enforce: 'pre',
      async resolveId(id, importer) {
        if (!isChunkAlias(id)) return;

        const [file] = id.split('?');
        const resolution = await this.resolve(file, importer, { skipSelf: true });
        if (resolution) {
          log.verbose(color.event('Resolved'), 'chunk alias for', color.file(relFile(resolution.id)));
          return `${resolution.id}${CHUNK_SUFFIX}`;
        }

        return id;
      },
      async load(id) {
        if (!isChunkFile(id)) return;
        const chunk = CHUNK_ENTRIES.get(id);

        if (chunk?.body) {
          log.info(color.event('Loaded'), 'compiled chunk for', color.file(relFile(chunk.id)));
          return chunk.body;
        }

        const src = id.replace(CHUNK_SUFFIX, '');
        const entry = CHUNK_ENTRIES.get(src);
        const text = entry?.code ?? fs.readFileSync(src, 'utf-8');
        const { code } = await mdxFile(src, text, $options);
        if (entry) entry.body = code;
        return code;
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
        if (!isMdxFile(file)) return;

        log.debug(color.event('HMR:'), color.file(relFile(file)), 'changed — recompiling');
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

/** The id relative to the pages directory, for log identifiers. */
function relFile(id: string) {
  return path.relative(pagesRoot, id.split('?')[0]);
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
