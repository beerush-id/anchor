import fs from 'node:fs';
import path from 'node:path';
import type { LogLevel } from '@beerush/logger';
import type { Plugin } from 'vite';
import { color, setLogLevel, taggedLogger } from '../logger.js';
import { AIR_ENV, initEnv } from '../modules/env.js';
import { MDX_DEFAULT_OPTIONS, type MdxModuleOptions, mdxEntryWrapper, mdxFile } from '../modules/markdown.js';
import { hashBlock } from '../utils/hash.js';

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
        if (isHighlightAsset(code)) {
          const transformed = stripAndEncodeImportAttributes(code);
          if (transformed !== code) {
            log.verbose(
              color.event('Rewrote'),
              'highlight import attributes for',
              color.file(path.relative(AIR_ENV.viteRoot, id.split('?')[0]))
            );
            return { code: transformed, map: null };
          }
        }

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
        if (isChunkFile(id)) return id;

        if (isHighlightAsset(id)) {
          const [rawFile, query] = id.split('?');
          const resolution = await this.resolve(rawFile, importer, { skipSelf: true });
          const file = resolution ? resolution.id : path.resolve(path.dirname(importer ?? ''), rawFile);

          const markdown = buildHighlightMarkdown(file, query);
          const chunkFile = `${file}${CHUNK_SUFFIX}&h=${hashBlock(markdown)}`;

          CHUNK_ENTRIES.set(chunkFile, {
            id: chunkFile,
            code: markdown,
            source: file,
            query,
          });

          log.verbose(color.event('Resolved'), 'highlight for', color.file(path.relative(AIR_ENV.viteRoot, file)));
          return chunkFile;
        }

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

        const [src] = id.split(CHUNK_SUFFIX);
        const entry = CHUNK_ENTRIES.get(src);
        const text = chunk?.code ?? entry?.code ?? fs.readFileSync(src, 'utf-8');
        const { code } = await mdxFile(src, text, $options);
        if (chunk) chunk.body = code;
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
        const updates = [...modules];

        for (const [chunkId, chunk] of CHUNK_ENTRIES) {
          if (chunk.source !== file) continue;

          chunk.code = buildHighlightMarkdown(file, chunk.query);
          chunk.body = undefined;

          const highlight = server.moduleGraph.getModuleById(chunkId);

          if (highlight) {
            server.moduleGraph.invalidateModule(highlight);
            updates.push(highlight);
          }
        }

        if (!isMdxFile(file)) {
          return updates.length > modules.length ? updates : undefined;
        }

        log.debug(color.event('HMR:'), color.file(relFile(file)), 'changed — recompiling');
        const entry = CHUNK_ENTRIES.get(file);

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
  source?: string;
  query?: string;
};

const CHUNK_ALIAS = '?chunk';
const CHUNK_SUFFIX = '.tsx?chunk';
const CHUNK_ENTRIES = new Map<string, AirChunkEntry>();

let pagesRoot = '';

function isHighlightAsset(str: string): boolean {
  return str.includes('?highlight') || str.includes('&highlight');
}

function stripAndEncodeImportAttributes(code: string): string {
  const attrRegex = /(['"])([^'"]*(?:\?|&)(?:highlight)[^'"]*)\1\s*(?:with|assert)\s*\{([^}]+)\}/g;

  return code.replace(attrRegex, (_match, quote, source: string, attributes: string) => {
    const queryParams: string[] = [];
    const pairRegex = /(?:['"]?([a-zA-Z0-9_-]+)['"]?)\s*:\s*(?:['"]([^'"]*)['"]|([0-9]+|true|false))/g;

    let pairMatch: RegExpExecArray | null;
    while ((pairMatch = pairRegex.exec(attributes)) !== null) {
      const key = pairMatch[1];
      const value = pairMatch[2] ?? pairMatch[3];
      if (key && value !== undefined) {
        queryParams.push(`${key}=${value}`);
      }
    }

    if (queryParams.length === 0) {
      return `${quote}${source}${quote}`;
    }

    const separator = source.includes('?') ? '&' : '?';
    const rewrittenSource = `${source}${separator}${queryParams.join('&')}`;

    return `${quote}${rewrittenSource}${quote}`;
  });
}

function buildHighlightMarkdown(file: string, query?: string): string {
  const params = new URLSearchParams(query);
  const lang = params.get('lang') || path.extname(file).replace(/^\./, '');
  const title = params.get('title') || `/${path.relative(AIR_ENV.viteRoot, file)}`;
  const meta = params.get('meta') || '';
  const lines = params.get('lines') || '';

  const rawSource = fs.readFileSync(file, 'utf-8');
  return wrapMarkdownCode(sliceLines(rawSource, lines), lang, title, meta);
}

function sliceLines(source: string, query?: string): string {
  if (!query) return source;

  const allLines = source.split('\n');
  const ranges = query
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  if (ranges.length === 0) return source;

  const chunks: string[] = [];
  for (const range of ranges) {
    if (range.includes(':')) {
      const [startStr, endStr] = range.split(':');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = endStr ? Math.min(allLines.length, parseInt(endStr, 10)) : allLines.length;
      chunks.push(allLines.slice(start - 1, end).join('\n'));
    } else {
      const start = Math.max(1, parseInt(range, 10) || 1);
      const end = ranges.length === 1 ? allLines.length : start;
      chunks.push(allLines.slice(start - 1, end).join('\n'));
    }
  }

  return chunks.join('\n\n');
}

function wrapMarkdownCode(code: string, lang: string, title?: string, meta?: string): string {
  const backticks = code.match(/`{3,}/g);
  const maxBackticks = backticks ? Math.max(...backticks.map((b) => b.length)) : 2;
  const fence = '`'.repeat(Math.max(3, maxBackticks + 1));
  const titlePart = title ? ` [${title}]` : '';
  const metaPart = meta ? ` ${meta}` : '';
  return `${fence}${lang}${titlePart}${metaPart}\n${code}\n${fence}\n`;
}

function isChunkFile(id: string) {
  return id.includes(CHUNK_SUFFIX);
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
