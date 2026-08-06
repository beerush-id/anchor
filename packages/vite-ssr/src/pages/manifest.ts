import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { FolderNode } from './folder-node.js';
import { canonicalPath, deriveIndexName, deriveRouteName, GENERATED_MARKER, importSpecifier } from './model.js';
import type { RouteNode } from './route-node.js';

export class ManifestNode extends EventEmitter {
  public children = new Map<string, ManifestNode>();
  private entries = new Map<string, { path: string; name: string; from: string }>();

  private readonly manifestDir: string;

  constructor(
    public readonly routeNode: RouteNode,
    public readonly folderNode: FolderNode,
    public readonly parent: ManifestNode | undefined,
    private readonly rootDir: string,
    private readonly routeFile: string // e.g. route.ts
  ) {
    super();
    this.manifestDir = path.join(rootDir, '.airstack', 'manifest');

    // Listen for child additions from FolderNode
    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);

    // Listen for content changes on our RouteNode
    routeNode.on('change', this.handleRouteChange);
  }

  public boot() {
    if (!this.parent) {
      fs.mkdirSync(this.manifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(this.manifestDir, 'package.json'),
        JSON.stringify(
          {
            name: '@airstack/manifest',
            type: 'module',
            exports: { '.': './index.ts' },
          },
          null,
          2
        ),
        'utf-8'
      );
      this.setupSymlink();
    }

    for (const childFolder of this.folderNode.children.values()) {
      this.handleChildAdded(childFolder);
    }
    this.updateEntries();
    for (const child of this.children.values()) {
      child.boot();
    }
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    // RouteNode creates its children synchronously when FolderNode emits,
    // so we can reliably get the child RouteNode from our RouteNode
    const childRoute = this.routeNode.children.get(childFolder.segment);
    if (!childRoute) return;

    const child = new ManifestNode(childRoute, childFolder, this, this.rootDir, this.routeFile);
    this.children.set(childFolder.segment, child);

    // Bubble child changes
    child.on('change', (file, kind) => this.emit('change', file, kind));

    this.updateEntries();
  };

  private handleChildRemoved = (childFolder: FolderNode) => {
    const child = this.children.get(childFolder.segment);
    if (!child) return;
    this.children.delete(childFolder.segment);
    child.destroy();

    this.updateEntries();
  };

  private handleRouteChange = (_file: string, kind: 'update' | 'reload') => {
    this.updateEntries();
    // Manifest changes are just data updates, Vite HMR handles it
    this.emitChange('update');
  };

  private updateEntries() {
    this.entries.clear();

    // If this level has a content route, add it
    if (this.routeNode.isContent) {
      this.addEntryForRoute(this.routeNode);
    }

    // Add immediate children's content routes (or their children if they group)
    // Actually, should manifest be a flat list or per-level?
    // Plan: "I list content routes at my level."
    // Wait, the original manifest was a flat list of ALL routes in the app.
    // Let's make this ManifestNode write a per-directory index.ts that lists its content routes
    // and its children's content routes? Or should it just export its immediate children?
    // Let's mimic the plan's output:
    // export default [ { path: '/', route: indexRoute }, { path: '/blog', route: blogRoute } ]

    for (const childRoute of this.routeNode.children.values()) {
      if (childRoute.isContent) {
        this.addEntryForRoute(childRoute);
      }
    }

    this.generate();
  }

  private addEntryForRoute(route: RouteNode) {
    const name = !route.rel
      ? 'indexRoute'
      : route.page && (route.layout || route.children.size > 0) // needsIndexRoute
        ? deriveIndexName(route.rel)
        : deriveRouteName(route.rel);

    const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
    const routeFilePath = path.join(route.folderNode.dir, this.routeFile);
    const fromPath = importSpecifier(manifestFilePath, routeFilePath);

    this.entries.set(route.rel, {
      path: canonicalPath(route.rel).replace(/\(|\)/g, ''),
      name,
      from: fromPath,
    });
  }

  public generate() {
    const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
    const lines: string[] = [GENERATED_MARKER];

    const sorted = Array.from(this.entries.values()).sort((a, b) => a.from.localeCompare(b.from));

    for (const entry of sorted) {
      lines.push(`import { ${entry.name} } from '${entry.from}';`);
    }

    lines.push('');
    lines.push('export default [');
    for (const entry of sorted) {
      lines.push(`  { path: '${entry.path}', route: ${entry.name} },`);
    }
    lines.push('];');

    const content = `${lines.join('\n')}\n`;

    let changed = false;
    try {
      if (fs.readFileSync(manifestFilePath, 'utf-8') !== content) {
        changed = true;
      }
    } catch {
      changed = true;
    }

    if (changed) {
      fs.mkdirSync(path.dirname(manifestFilePath), { recursive: true });
      fs.writeFileSync(manifestFilePath, content);
      this.emitChange('update'); // Data update
    }
  }

  public destroy() {
    this.folderNode.removeListener('childAdded', this.handleChildAdded);
    this.folderNode.removeListener('childRemoved', this.handleChildRemoved);
    this.routeNode.removeListener('change', this.handleRouteChange);

    for (const child of this.children.values()) {
      child.destroy();
    }
    this.children.clear();
    this.entries.clear();

    const dirPath = path.join(this.manifestDir, this.folderNode.rel);
    const manifestFilePath = path.join(dirPath, 'index.ts');
    try {
      if (fs.existsSync(manifestFilePath)) {
        fs.unlinkSync(manifestFilePath);
        this.emitChange('update'); // Notify deletion
      }
      if (this.folderNode.rel && fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch {}

    this.emit('destroy');
    this.removeAllListeners();
  }

  private emitChange(kind: 'update' | 'reload') {
    const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
    this.emit('change', manifestFilePath, kind);
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
