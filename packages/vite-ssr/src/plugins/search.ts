import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { LogLevel } from '@beerush/logger';
import type { Plugin } from 'vite';
import { color, setLogLevel, taggedLogger } from '../logger.js';
import { AIR_ENV, initEnv } from '../modules/env.js';
import { META_STORE } from '../modules/metadata.js';

const log = taggedLogger('air-search');

export type MdxSearchOptions = {
  pagesDir?: string;
  include?: string[];
  exclude?: string[];
  logLevel?: LogLevel;
};

export interface SearchDocument {
  /** Relative path from the pages dir — always present, acts as the entry key. */
  id: string;
  /** Frontmatter `title`, always present. */
  title: string;
  /**
   * Searchable text: page body + frontmatter `description` by default, or the
   * values of the frontmatter keys listed in `indexable: [...]` when set.
   */
  content: string;
  /** Canonical route, always present. */
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

    log.info(color.event('Indexing documents'));
    log.verbose(color.event('Walking'), 'pages directory');

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

    log.info(
      color.event('Indexed'),
      `${searchCache.size} documents`,
      'in',
      color.timing(`${Math.round(performance.now() - started)}ms`)
    );
  };

  return {
    name: 'air-pages:search',
    configResolved(config) {
      initEnv(config, {
        pagesDir: options.pagesDir,
      });
      setLogLevel(options.logLevel);
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
      log.verbose(color.event('Emitted'), 'search index', `(${searchCache.size} documents)`);
    },
    configureServer(server) {
      server.watcher.on('add', (file) => void invalidateSearchCache(file, include));
      server.watcher.on('change', (file) => void invalidateSearchCache(file, include));
      server.watcher.on('unlink', (file) => {
        searchCache.delete(file);
        META_STORE.delete(file);
        log.debug(color.event('Removed'), color.file(path.relative(searchRoot, file)), 'from the search index');
      });

      server.middlewares.use('/index.json', (_req, res) => {
        log.verbose(color.event('Served'), 'search index');
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
 * file (through the shared metadata store) and replaces its entry. The
 * `indexable` frontmatter flag controls the entry:
 * - `false` drops the file from the index entirely;
 * - an array of frontmatter keys uses their values as the searchable content
 *   instead of the page body (`indexable: ['description', 'keywords']`);
 * - `true` (or omitted) indexes the page body plus the frontmatter
 *   `description`.
 * Title and URL always ship.
 *
 * @param file Absolute path of the markdown file to re-index.
 * @param include Extensions that qualify a file for indexing.
 */
export async function invalidateSearchCache(file: string, include: string[]): Promise<void> {
  if (!isIndexedFile(file, include)) return Promise.resolve();

  const content = fs.readFileSync(file, 'utf-8');
  const meta = META_STORE.invalidate(file, content);

  if (meta.indexable === false) {
    searchCache.delete(file);
    log.debug(color.event('Skipped'), color.file(path.relative(searchRoot, file)), '(indexable: false)');
    return Promise.resolve();
  }

  searchCache.set(file, toSearchDocument(file, meta, content));
  log.debug(color.event('Re-indexed'), color.file(path.relative(searchRoot, file)));

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

  let url = rel.replace(/\.(mdx|md)$/, '');
  url = url.replace(/\.page$/, '');

  if (url === 'page') {
    url = '/';
  } else {
    url = `/${url.replace(/\/page$/, '')}`;
  }

  const clean = content
    .replace(/^\s*---\r?\n[\s\S]*?\r?\n---/, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/:::.*?:::/gs, '')
    .slice(0, 10000);

  const keys = indexableKeys(meta.indexable);
  // Default indexable text = page body + frontmatter description (curated
  // keywords, not a 1:1 body excerpt, so it deserves a search hit of its own).
  const searchContent = keys
    ? pickFrontmatter(meta, keys)
    : [clean, pickFrontmatter(meta, ['description'])].filter(Boolean).join(' ');

  return {
    id: rel,
    title: (meta.title as string) || '',
    content: searchContent,
    url,
  };
}

/**
 * Resolves the `indexable` frontmatter value to the list of frontmatter keys
 * whose values become the searchable content. `true` (or any non-array,
 * non-false value) returns `undefined`, meaning the page body is indexed.
 */
function indexableKeys(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((key): key is string => typeof key === 'string');
}

/**
 * Serializes the values of the given frontmatter keys into a single searchable
 * string — strings pass through, arrays join with spaces, missing keys are
 * skipped.
 */
function pickFrontmatter(meta: Record<string, unknown>, keys: string[]): string {
  return keys
    .map((key) => {
      const value = meta[key];
      if (Array.isArray(value))
        return value
          .filter((v) => v != null)
          .map(String)
          .join(' ');
      if (value == null) return '';
      return String(value);
    })
    .filter(Boolean)
    .join(' ');
}
