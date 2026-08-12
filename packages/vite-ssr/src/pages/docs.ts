import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import type { Options as MdxOptions } from '@mdx-js/rollup';
import type { Options as RehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { Plugin } from 'vite';
import { extractFrontmatter } from './markdown-node.js';

export type DocsPluginOptions = {
  search?: boolean | { include?: string[]; exclude?: string[] };
  remarkGfm?: RemarkGfmOptions;
  rehypeAutolinkHeadings?: RehypeAutolinkHeadingsOptions;
  rehypePrettyCode?: RehypePrettyCodeOptions;
};

export async function setupDocs(
  docsConfig: boolean | DocsPluginOptions,
  mdxOpts: MdxOptions,
  plugins: Plugin[],
  pagesDir: string = 'src/pages'
) {
  if (!docsConfig) return;

  const docsOptions = typeof docsConfig === 'object' ? docsConfig : {};
  const searchConfig = docsOptions.search;

  try {
    const [
      { default: remarkGfm },
      { default: remarkDirective },
      { default: rehypeSlug },
      { default: rehypeAutolinkHeadings },
      { default: rehypePrettyCode },
    ] = await Promise.all([
      import('remark-gfm'),
      import('remark-directive'),
      import('rehype-slug'),
      import('rehype-autolink-headings'),
      import('rehype-pretty-code'),
    ]);

    interface MarkdownNode {
      type: string;
      name?: string;
      meta?: string;
      lang?: string;
      depth?: number;
      data?: Record<string, unknown>;
      properties?: Record<string, unknown>;
      children?: MarkdownNode[];
    }

    const directiveVisitor = () => (tree: MarkdownNode) => {
      const visit = (node: MarkdownNode) => {
        const data = node.data || (node.data = {});

        if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
          data.hProperties = {
            ...node.properties,
            className: [`admonition`, node.name],
          };

          if (node.name === 'code-group') {
            data.hName = 'AirCodeGroup';
          } else {
            data.hName = 'div';
          }
        }

        if (node.children) {
          for (const child of node.children) visit(child);
        }
      };

      visit(tree);
    };

    if (!mdxOpts.remarkPlugins) mdxOpts.remarkPlugins = [];
    if (!mdxOpts.rehypePlugins) mdxOpts.rehypePlugins = [];

    mdxOpts.remarkPlugins.push([remarkGfm, docsOptions.remarkGfm], remarkDirective, directiveVisitor);
    mdxOpts.rehypePlugins.push(
      rehypeSlug,
      [rehypeAutolinkHeadings, { ...docsOptions.rehypeAutolinkHeadings, behavior: 'wrap' }],
      [
        rehypePrettyCode,
        {
          theme: {
            light: 'catppuccin-latte',
            dark: 'catppuccin-mocha',
          },
          ...docsOptions.rehypePrettyCode,
        },
      ]
    );
    mdxOpts.rehypePlugins.push(() => (tree) => {
      const visit = (node: AnyType) => {
        const data = node.data || (node.data = {});
        const props = node.properties || (node.properties = {});

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
          props.id = (props.id || '').replace(/[\-]+/g, '-');
        }

        if (node.tagName === 'code') {
          if (data.meta) {
            props['data-title'] = data.meta.replace(/\[/, '').replace(/]/, '');
          }
        }
        if (node.children) node.children.forEach(visit);
      };
      visit(tree);
    });
  } catch {
    throw new Error(
      `\n\n[AIR Stack] Docs mode is enabled, but required plugins are missing.\n` +
        `Please ensure the following plugins are in your plugin catalog and installed:\n\n` +
        `  - remark-gfm\n` +
        `  - remark-directive\n` +
        `  - rehype-slug\n` +
        `  - rehype-autolink-headings\n` +
        `  - rehype-pretty-code\n\n`
    );
  }

  if (searchConfig) {
    plugins.push(createSearchPlugin(searchConfig, pagesDir));
  }
}

function createSearchPlugin(
  searchConfig: boolean | { include?: string[]; exclude?: string[] },
  pagesDir: string
): Plugin {
  let root = '';
  let absPagesDir = '';
  const buildIndex = () => {
    const kb: Array<{ id: string; title: string; description: string; content: string }> = [];
    const includes = typeof searchConfig === 'object' && searchConfig.include ? searchConfig.include : [];
    const excludes = typeof searchConfig === 'object' && searchConfig.exclude ? searchConfig.exclude : [];

    const processDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

        if (excludes.some((e) => relPath.startsWith(e) || relPath.match(e))) continue;
        if (includes.length > 0 && !includes.some((i) => relPath.startsWith(i) || relPath.match(i))) {
          if (entry.isDirectory()) processDir(fullPath);
          continue;
        }

        if (entry.isDirectory()) {
          processDir(fullPath);
        } else if (entry.name.endsWith('.mdx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const meta = extractFrontmatter(content);
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
          else id = '/' + id;

          kb.push({ id, title, description, content: cleanContent });
        }
      }
    };

    processDir(absPagesDir);
    return JSON.stringify(kb);
  };

  return {
    name: 'air-docs-search',
    configResolved(config) {
      root = config.root;
      absPagesDir = path.resolve(root, pagesDir);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.json',
        source: buildIndex(),
      });
    },
    configureServer(server) {
      server.middlewares.use('/index.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(buildIndex());
      });
    },
  };
}
