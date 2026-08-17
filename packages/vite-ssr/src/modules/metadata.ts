import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { color, taggedLogger } from '../logger.js';
import type { AnyType } from '../types.js';
import { matchFrontmatter, parseFrontmatterBlock } from '../utils/frontmatter.js';
import { hashBlock } from '../utils/hash.js';
import { GENERATED_MARKER, importSpecifier } from '../utils/mapper.js';
import { bootPackage, ensureSymlink, writeIfChanged } from '../utils/sync.js';
import type { FolderNode } from './folder-node.js';
import { MarkdownNode } from './markdown-node.js';

const log = taggedLogger('air-metadata');

/**
 * Represents a node in the metadata tree.
 * Responsible for tracking MDX files within its directory scope and generating
 * an index.ts file that aggregates their metadata exports.
 */
export class MetadataNode extends EventEmitter {
  public children = new Map<string, MetadataNode>();
  private markdownNodes = new Map<string, MarkdownNode>();

  private readonly metadataDir: string;

  /**
   * Initializes a new metadata node.
   *
   * @param folderNode The folder this node tracks — its MDX files and child folders.
   * @param parent Optional parent metadata node.
   * @param viteRoot Absolute path to the Vite root (`config.root`).
   * @param pagesDir Absolute path to the pages directory.
   */
  constructor(
    public readonly folderNode: FolderNode,
    public readonly parent: MetadataNode | undefined,
    private readonly viteRoot: string,
    private readonly pagesDir: string
  ) {
    super();
    this.metadataDir = path.join(viteRoot, '.airstack', 'metadata');

    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);

    folderNode.on('fileAdded', this.handleFileAdded);
    folderNode.on('fileRemoved', this.handleFileRemoved);
    folderNode.on('fileChanged', this.handleFileChanged);
  }

  /**
   * Boots the metadata node by processing existing MDX files and booting child nodes.
   * While booting, child change events are not regenerated — every fresh write
   * would cascade a full index rebuild; the single `generate()` at the end is
   * the only one needed.
   */
  public boot() {
    this.booting = true;
    try {
      this.ensureInstalled();

      for (const file of this.folderNode.files) {
        if (file.endsWith('.mdx')) {
          this.addMarkdownNode(file);
        }
      }

      for (const childFolder of this.folderNode.children.values()) {
        this.handleChildAdded(childFolder);
      }
    } finally {
      this.booting = false;
    }

    this.generate();
  }

  private booting = false;

  /**
   * Re-creates the `.airstack` package and symlink when missing — boot-only
   * originally, but a deleted `.airstack` mid-run must self-heal on the next
   * generate instead of leaving imports broken until restart.
   */
  private ensureInstalled() {
    if (this.parent) return;
    bootPackage(this.metadataDir, '@airstack/metadata', { '.': './index.ts', './*': './*.ts' });
    ensureSymlink(this.viteRoot);
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    const child = new MetadataNode(childFolder, this, this.viteRoot, this.pagesDir);
    this.children.set(childFolder.segment, child);

    child.on('change', (file, kind) => {
      this.emit('change', file, kind);
      if (!this.booting) this.generate();
    });

    child.boot();
  };

  private handleChildRemoved = (childFolder: FolderNode) => {
    const child = this.children.get(childFolder.segment);
    if (!child) return;
    this.children.delete(childFolder.segment);
    child.destroy();
  };

  private handleFileAdded = (name: string) => {
    if (!name.endsWith('.mdx')) return;
    this.addMarkdownNode(name);
    this.generate();
  };

  private handleFileRemoved = (name: string) => {
    if (!name.endsWith('.mdx')) return;
    const absPath = path.join(this.folderNode.dir, name);
    const mdxNode = this.markdownNodes.get(absPath);
    if (mdxNode) {
      this.markdownNodes.delete(absPath);
      mdxNode.destroy();
      this.generate();
    }
  };

  private handleFileChanged = (name: string) => {
    if (!name.endsWith('.mdx')) return;
    const absPath = path.join(this.folderNode.dir, name);
    const mdxNode = this.markdownNodes.get(absPath);
    if (mdxNode) {
      mdxNode.update();
      this.generate();
    }
  };

  private addMarkdownNode(name: string) {
    const absPath = path.join(this.folderNode.dir, name);
    if (this.markdownNodes.has(absPath)) return;

    const mdxNode = new MarkdownNode(absPath, this.pagesDir, this.metadataDir);
    this.markdownNodes.set(absPath, mdxNode);

    mdxNode.on('change', (file, kind) => this.emit('change', file, kind));

    mdxNode.update();
  }

  /**
   * Generates the index.ts file for this metadata directory,
   * aggregating imports from all MDX files and child metadata nodes.
   */
  public generate() {
    this.ensureInstalled();
    const indexPath = path.join(this.metadataDir, this.folderNode.rel, 'index.ts');

    const items = Array.from(this.markdownNodes.values())
      .map((mdxNode) => ({
        path: mdxNode.itemPath,
        varName: mdxNode.varName,
        fromPath: importSpecifier(indexPath, mdxNode.generatedFilePath),
      }))
      .sort((a, b) => a.fromPath.localeCompare(b.fromPath));

    const childImports: { varName: string; fromPath: string }[] = [];
    for (const [segment] of this.children) {
      const childIndexPath = path.join(this.metadataDir, this.folderNode.rel, segment, 'index.ts');
      if (fs.existsSync(childIndexPath)) {
        const varName = `${segment}Meta`;
        childImports.push({
          varName,
          fromPath: importSpecifier(indexPath, childIndexPath),
        });
      }
    }

    log.verbose(
      color.event('Collected metadata entries'),
      color.file(this.folderNode.rel || 'root'),
      items.length,
      'files,',
      childImports.length,
      'children'
    );

    if (items.length === 0 && childImports.length === 0 && this.parent !== undefined) {
      try {
        if (fs.existsSync(indexPath)) {
          fs.unlinkSync(indexPath);
          log.debug(color.event('Removed metadata index'), color.file(this.folderNode.rel));
          this.emitChange('update');
        }
      } catch {}
      return;
    }

    const imports = [
      ...items.map((item) => `import ${item.varName} from '${item.fromPath}';`),
      ...childImports.map((c) => `import ${c.varName} from '${c.fromPath}';`),
    ];
    const lines = [
      GENERATED_MARKER,
      ...imports,
      '',
      'export default [',
      ...items.map((item) => `  { path: '${item.path}', meta: ${item.varName} },`),
      ...childImports.map((c) => `  ...${c.varName},`),
      '];',
      '',
    ];

    const content = lines.join('\n');

    if (writeIfChanged(indexPath, content)) {
      log.debug(color.event('Generated metadata index'), color.file(this.folderNode.rel || 'root'));
      this.emitChange('update');
    }
  }

  /**
   * Closes listeners and recursively destroys child metadata and markdown nodes.
   */
  public destroy() {
    this.folderNode.removeListener('childAdded', this.handleChildAdded);
    this.folderNode.removeListener('childRemoved', this.handleChildRemoved);
    this.folderNode.removeListener('fileAdded', this.handleFileAdded);
    this.folderNode.removeListener('fileRemoved', this.handleFileRemoved);
    this.folderNode.removeListener('fileChanged', this.handleFileChanged);

    for (const mdxNode of this.markdownNodes.values()) {
      mdxNode.destroy();
    }
    this.markdownNodes.clear();

    for (const child of this.children.values()) {
      child.destroy();
    }
    this.children.clear();

    const dirPath = path.join(this.metadataDir, this.folderNode.rel);
    const indexPath = path.join(dirPath, 'index.ts');
    try {
      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
        this.emitChange('update');
      }
      if (this.folderNode.rel && fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch {}

    this.emit('destroy');
    this.removeAllListeners();
  }

  private emitChange(kind: 'update' | 'reload') {
    const indexPath = path.join(this.metadataDir, this.folderNode.rel, 'index.ts');
    this.emit('change', indexPath, kind);
  }
}

type MetadataEntry = {
  /** Frontmatter block hash — the freshness signal the resolver compares against. */
  key: string;
  meta: Record<string, AnyType>;
};

/**
 * Frontmatter store keyed by absolute file path. `resolve` serves unpredictable
 * consumers — deciding hit-vs-re-parse from the frontmatter block hash — while
 * `invalidate` and `delete` are the authoritative push from nodes that know a
 * file changed or was removed. Every consumer funnels through this store so
 * parsing happens once and is always consistent.
 */
export class MetadataStore extends Map<string, MetadataEntry> {
  /**
   * Serves the frontmatter for `absPath`. Returns the cached entry when its
   * frontmatter block hash matches `content` (the file's source text) — body
   * edits never invalidate, only frontmatter changes do — and re-parses
   * otherwise.
   */
  public resolve(absPath: string, content: string): Record<string, AnyType> {
    const block = matchFrontmatter(content) ?? '';
    const key = hashBlock(block);
    const entry = this.get(absPath);
    if (entry?.key === key) return entry.meta;

    const meta = parseFrontmatterBlock(block);
    this.set(absPath, { key, meta });
    return meta;
  }

  /**
   * Re-parses `content` (the file's source text) immediately and replaces the
   * entry. Callers are nodes that know the file changed — the push counterpart
   * to `resolve`'s pull.
   */
  public invalidate(absPath: string, content: string): Record<string, AnyType> {
    const block = matchFrontmatter(content) ?? '';
    const meta = parseFrontmatterBlock(block);
    this.set(absPath, { key: hashBlock(block), meta });
    return meta;
  }
}

export const META_STORE = new MetadataStore();
