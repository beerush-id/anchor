import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { getFrontmatter } from '../utils/frontmatter.js';

export type MdxSearchOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
};

const DEFAULT_OPTIONS: MdxSearchOptions = {
  rootDir: 'src/pages',
  include: ['.md', '.mdx'],
  exclude: [],
};

export function airSearch(options: Partial<MdxSearchOptions> = {}): Plugin {
  const { include = [], exclude = [], rootDir = 'src/pages' } = { ...DEFAULT_OPTIONS, ...options } as MdxSearchOptions;

  let root = '';
  let absPagesDir = '';

  const buildIndex = () => {
    const kb: Array<{ id: string; title: string; description: string; content: string }> = [];

    const processDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

        if (exclude.some((e) => relPath.startsWith(e) || relPath.match(e))) continue;
        if (include.length > 0 && !include.some((i) => relPath.startsWith(i) || relPath.match(i))) {
          if (entry.isDirectory()) processDir(fullPath);
          continue;
        }

        if (entry.isDirectory()) {
          processDir(fullPath);
        } else if (entry.name.endsWith('.mdx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const meta = getFrontmatter(content);
          const title = (meta.title as string) || '';
          const description = (meta.description as string) || '';

          const cleanContent = content
            .replace(/^\s*---\r?\n[\s\S]*?\r?\n---/, '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/:::.*?:::/gs, '')
            .slice(0, 10000);

          let id = path
            .relative(absPagesDir, fullPath)
            .replace(/\\/g, '/')
            .replace(/\.mdx$/, '');
          if (id.endsWith('/page') || id === 'page') id = id.replace(/\/?page$/, '') || '/';
          else id = `/${id}`;

          kb.push({ id, title, description, content: cleanContent });
        }
      }
    };

    processDir(absPagesDir);
    return JSON.stringify(kb);
  };

  return {
    name: 'air-pages:search',
    configResolved(config) {
      root = config.root;
      absPagesDir = path.resolve(root, rootDir);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.json',
        source: buildIndex(),
      });
    },
    configureServer(server) {
      server.middlewares.use('/index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(buildIndex());
      });
    },
  } as Plugin;
}
