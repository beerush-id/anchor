import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import { parse } from 'yaml';
import { getFrontmatter } from '../utils/frontmatter.js';
import { GENERATED_MARKER, importSpecifier } from '../utils/mapper.js';
import { bootPackage, ensureSymlink, writeIfChanged } from '../utils/sync.js';
import type { FolderNode } from './folder-node.js';
import { MarkdownNode } from './markdown-node.js';

/**
 * Represents a node in the metadata tree.
 * Responsible for tracking MDX files within its directory scope and generating
 * an index.ts file that aggregates their metadata exports.
 */
export class MetadataNode extends EventEmitter {
  public children = new Map<string, MetadataNode>();
  private markdownNodes = new Map<string, MarkdownNode>();

  private readonly metadataDir: string;

  constructor(
    public readonly folderNode: FolderNode,
    public readonly parent: MetadataNode | undefined,
    private readonly rootDir: string,
    private readonly pagesDir: string
  ) {
    super();
    this.metadataDir = path.join(rootDir, '.airstack', 'metadata');

    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);

    folderNode.on('fileAdded', this.handleFileAdded);
    folderNode.on('fileRemoved', this.handleFileRemoved);
    folderNode.on('fileChanged', this.handleFileChanged);
  }

  public boot() {
    if (!this.parent) {
      bootPackage(this.metadataDir, '@airstack/metadata', { '.': './index.ts', './*': './*.ts' });
      ensureSymlink(this.rootDir);
    }

    for (const file of this.folderNode.files) {
      if (file.endsWith('.mdx')) {
        this.addMarkdownNode(file);
      }
    }

    for (const childFolder of this.folderNode.children.values()) {
      this.handleChildAdded(childFolder);
    }

    this.generate();
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    const child = new MetadataNode(childFolder, this, this.rootDir, this.pagesDir);
    this.children.set(childFolder.segment, child);

    child.on('change', (file, kind) => {
      this.emit('change', file, kind);
      this.generate();
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

  public generate() {
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

    if (items.length === 0 && childImports.length === 0 && this.parent !== undefined) {
      try {
        if (fs.existsSync(indexPath)) {
          fs.unlinkSync(indexPath);
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
      this.emitChange('update');
    }
  }

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

/**
 * Frontmatter cache keyed by absolute file path. `resolve` parses on first
 * access; `invalidate` re-parses immediately. Every frontmatter consumer
 * funnels through this store so parsing happens once and is always
 * consistent.
 */
export class MetadataStore extends Map<string, Record<string, AnyType>> {
  public resolve(absPath: string, content: string): Record<string, AnyType> {
    if (!this.has(absPath)) {
      this.set(absPath, parseFrontmatter(content));
    }

    return this.get(absPath) as Record<string, AnyType>;
  }

  public invalidate(absPath: string, content: string): Record<string, AnyType> {
    const meta = parseFrontmatter(content);
    this.set(absPath, meta);
    return meta;
  }
}

export const META_STORE = new MetadataStore();

/**
 * Parses YAML frontmatter into a JavaScript object. Detects whether the input
 * is a full file containing `---` fenced frontmatter (extracting only the block)
 * or a bare YAML string (as produced by the MDX AST plugins), so every consumer
 * funnels through a single parser and always receives the same object shape.
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  if (/^\s*---\r?\n/.test(content)) return getFrontmatter(content);

  try {
    return parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}
