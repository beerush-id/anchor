import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Plugin } from 'vite';
import { AIR_ENV } from '../modules/env.js';
import { META_STORE } from '../modules/metadata.js';

export type MdxSearchOptions = {
  pagesDir?: string;
  include?: string[];
  exclude?: string[];
};

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  url: string;
}

/**
 * Builds a search index over markdown pages — frontmatter title, text content,
 * and URL — emitted as `index.json` at build and served at `/index.json` in dev.
 * The tree is walked once at boot; watcher events update only the affected
 * entry. `pagesDir` is the pages directory; `include`/`exclude` filter which
 * files are indexed.
 */
export function airSearch(options: Partial<MdxSearchOptions> = {}): Plugin {
  const { include = [], exclude = [] } = { ...DEFAULT_OPTIONS, ...options };

  const buildIndex = () => {
    searchCache.clear();

    if (!searchPagesDir) return;

    const started = performance.now();

    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(abs);
        } else {
          void invalidateSearchCache(abs, include);
        }
      }
    };

    walk(searchPagesDir);

    console.log(`[air-pages] Indexed ${searchCache.size} documents in ${Math.round(performance.now() - started)}ms`);
  };

  return {
    name: 'air-pages:search',
    configResolved(config) {
      searchRoot = config.root;
      searchPagesDir = path.resolve(config.root, options.pagesDir ?? AIR_ENV.pagesDir);
      searchExclude = exclude;
      buildIndex();
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.json',
        source: serveSearchIndex(),
      });
    },
    configureServer(server) {
      server.watcher.on('add', (file) => void invalidateSearchCache(file, include));
      server.watcher.on('change', (file) => void invalidateSearchCache(file, include));
      server.watcher.on('unlink', (file) => {
        searchCache.delete(file);
        META_STORE.delete(file);
      });

      server.middlewares.use('/index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(serveSearchIndex());
      });
    },
  } as Plugin;
}

const DEFAULT_OPTIONS: { include: string[]; exclude: string[] } = {
  include: ['.md', '.mdx'],
  exclude: [],
};

/**
 * Granular search index keyed by absolute file path. The tree is walked once
 * at boot; afterwards watcher events update only the affected entry.
 */
export const searchCache: Map<string, SearchDocument> = new Map();

let searchRoot = '';
let searchPagesDir = '';
let searchExclude: string[] = [];

/**
 * Surgically updates the index entry for a single file: re-parses only that
 * file (through the shared metadata store) and replaces its entry.
 *
 * @param file Absolute path of the markdown file to re-index.
 * @param include Extensions that qualify a file for indexing.
 */
export async function invalidateSearchCache(file: string, include: string[]): Promise<void> {
  if (!isIndexedFile(file, include)) return Promise.resolve();

  const content = fs.readFileSync(file, 'utf-8');
  const meta = META_STORE.invalidate(file, content);
  searchCache.set(file, toSearchDocument(file, meta, content));

  return Promise.resolve();
}

/** Serializes the index for the client. */
export function serveSearchIndex(): string {
  return JSON.stringify(Array.from(searchCache.values()));
}

function isIndexedFile(file: string, include: string[]): boolean {
  const rel = path.relative(searchRoot, file).replace(/\\/g, '/');
  if (searchExclude.some((p) => rel.startsWith(p) || rel.match(p))) return false;

  return include.some((p) => {
    if (p.startsWith('.')) return file.endsWith(p);
    return rel.startsWith(p) || rel.match(p);
  });
}

function toSearchDocument(file: string, meta: Record<string, unknown>, content: string): SearchDocument {
  const rel = path.relative(searchPagesDir, file).replace(/\\/g, '/');

  let id = rel.replace(/\.(mdx|md)$/, '');
  if (id.endsWith('/page') || id === 'page') id = id.replace(/\/?page$/, '') || '/';
  else id = `/${id}`;

  const clean = content
    .replace(/^\s*---\r?\n[\s\S]*?\r?\n---/, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/:::.*?:::/gs, '')
    .slice(0, 10000);

  return {
    id: file,
    title: (meta.title as string) || '',
    content: clean,
    url: id,
  };
}
