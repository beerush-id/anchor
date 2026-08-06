import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { FolderNode } from './folder-node.js';
import { MarkdownNode } from './markdown-node.js';
import { GENERATED_MARKER, importSpecifier } from './model.js';

export class MetadataNode extends EventEmitter {
  public children = new Map<string, MetadataNode>();
  private markdownNodes = new Map<string, MarkdownNode>(); // absPath -> MarkdownNode

  private readonly metadataDir: string;

  constructor(
    public readonly folderNode: FolderNode,
    public readonly parent: MetadataNode | undefined,
    private readonly rootDir: string,
    private readonly pagesDir: string
  ) {
    super();
    this.metadataDir = path.join(rootDir, '.airstack', 'metadata');

    // Listen to FolderNode for child additions
    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);

    // Listen to FolderNode for MDX files
    folderNode.on('fileAdded', this.handleFileAdded);
    folderNode.on('fileRemoved', this.handleFileRemoved);
    folderNode.on('fileChanged', this.handleFileChanged);
  }

  public boot() {
    if (!this.parent) {
      fs.mkdirSync(this.metadataDir, { recursive: true });
      fs.writeFileSync(
        path.join(this.metadataDir, 'package.json'),
        JSON.stringify(
          {
            name: '@airstack/metadata',
            type: 'module',
            exports: {
              '.': './index.ts',
              './*': './*.ts',
            },
          },
          null,
          2
        ),
        'utf-8'
      );
      this.setupSymlink();
    }

    // Process existing MDX files
    for (const file of this.folderNode.files) {
      if (file.endsWith('.mdx')) {
        this.addMarkdownNode(file);
      }
    }

    // Boot children
    for (const childFolder of this.folderNode.children.values()) {
      this.handleChildAdded(childFolder);
    }

    this.generate();

    for (const child of this.children.values()) {
      child.boot();
    }
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    const child = new MetadataNode(childFolder, this, this.rootDir, this.pagesDir);
    this.children.set(childFolder.segment, child);

    // Bubble child changes
    child.on('change', (file, kind) => this.emit('change', file, kind));
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
      // We don't need to regenerate index.ts unless the structure (varName/itemPath) changes,
      // but to be safe we can call generate(). It no-ops if content is same.
      this.generate();
    }
  };

  private addMarkdownNode(name: string) {
    const absPath = path.join(this.folderNode.dir, name);
    if (this.markdownNodes.has(absPath)) return;

    const mdxNode = new MarkdownNode(absPath, this.pagesDir, this.metadataDir);
    this.markdownNodes.set(absPath, mdxNode);

    // Bubble MarkdownNode changes
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

    // If there are no MDX files at this level and this isn't the root, we shouldn't emit an index.ts
    // Wait, what if it previously had MDX files and they were all deleted? We should remove the index.ts.
    if (items.length === 0 && this.parent !== undefined) {
      try {
        if (fs.existsSync(indexPath)) {
          fs.unlinkSync(indexPath);
          this.emitChange('update');
        }
      } catch {}
      return;
    }

    const imports = items.map((item) => `import ${item.varName} from '${item.fromPath}';`);
    const lines = [
      GENERATED_MARKER,
      ...imports,
      '',
      'export default [',
      ...items.map((item) => `  { path: '${item.path}', meta: ${item.varName} },`),
      '];',
      '',
    ];

    const content = lines.join('\n');
    let changed = false;
    try {
      if (fs.readFileSync(indexPath, 'utf-8') !== content) {
        changed = true;
      }
    } catch {
      changed = true;
    }

    if (changed) {
      fs.mkdirSync(path.dirname(indexPath), { recursive: true });
      fs.writeFileSync(indexPath, content);
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

  private setupSymlink() {
    const absAirStackDir = path.join(this.rootDir, '.airstack');
    const nodeModulesDir = path.join(this.rootDir, 'node_modules');
    const target = path.join(nodeModulesDir, '@airstack');
    fs.mkdirSync(nodeModulesDir, { recursive: true });

    const isWin32 = process.platform === 'win32';
    const expectedTarget = isWin32 ? absAirStackDir : path.relative(nodeModulesDir, absAirStackDir);

    try {
      const stat = fs.lstatSync(target);
      if (!stat.isSymbolicLink() || fs.readlinkSync(target) !== expectedTarget) {
        fs.rmSync(target, { recursive: true, force: true });
        fs.symlinkSync(expectedTarget, target, isWin32 ? 'junction' : 'dir');
      }
    } catch {
      fs.symlinkSync(expectedTarget, target, isWin32 ? 'junction' : 'dir');
    }
  }
}
