import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { color, taggedLogger } from '../logger.js';
import {
  canonicalPath,
  deriveNamedRouteName,
  GENERATED_MARKER,
  importSpecifier,
  namedPageName,
} from '../utils/mapper.js';
import { bootPackage, ensureSymlink, writeIfChanged } from '../utils/sync.js';
import type { FolderNode } from './folder-node.js';
import type { RouteNode } from './route-node.js';

const log = taggedLogger('air-manifest');

/**
 * Represents a node in the route manifest tree.
 * Responsible for tracking content routes and generating the index.ts files
 * that map URL paths to route objects.
 */
export class ManifestNode extends EventEmitter {
  public children = new Map<string, ManifestNode>();
  private entries = new Map<string, { path: string; name: string; from: string }>();

  private readonly manifestDir: string;

  /**
   * Initializes a new manifest node.
   *
   * @param routeNode The route node whose content routes this manifest level lists.
   * @param folderNode The folder this manifest level mirrors.
   * @param parent Optional parent manifest node.
   * @param viteRoot Absolute path to the Vite root (`config.root`).
   * @param routeFile The name of the route file (e.g., 'route.ts').
   */
  constructor(
    public readonly routeNode: RouteNode,
    public readonly folderNode: FolderNode,
    public readonly parent: ManifestNode | undefined,
    private readonly viteRoot: string,
    private readonly routeFile: string
  ) {
    super();
    this.manifestDir = path.join(viteRoot, '.airstack', 'manifest');

    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);

    routeNode.on('change', this.handleRouteChange);
  }

  /**
   * Boots the manifest node by ensuring the output directory exists,
   * handling existing children, and generating the initial index file.
   */
  public boot() {
    this.ensureInstalled();

    for (const childFolder of this.folderNode.children.values()) {
      this.addChild(childFolder);
    }
    this.updateEntries();
    for (const child of this.children.values()) {
      child.boot();
    }
  }

  /**
   * Constructs a child manifest node for a folder. Regeneration is the
   * caller's job — boot adds all children and regenerates once, while the
   * watcher path regenerates per addition.
   */
  private addChild(childFolder: FolderNode): ManifestNode | undefined {
    const childRoute = this.routeNode.children.get(childFolder.segment);
    if (!childRoute) return undefined;

    const child = new ManifestNode(childRoute, childFolder, this, this.viteRoot, this.routeFile);
    this.children.set(childFolder.segment, child);

    child.on('change', (file, kind) => this.emit('change', file, kind));

    return child;
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    if (this.addChild(childFolder)) {
      this.updateEntries();
    }
  };

  private handleChildRemoved = (childFolder: FolderNode) => {
    const child = this.children.get(childFolder.segment);
    if (!child) return;
    this.children.delete(childFolder.segment);
    child.destroy();

    this.updateEntries();
  };

  private handleRouteChange = (_file: string) => {
    this.updateEntries();
    this.emitChange('update');
  };

  /**
   * Re-creates the `.airstack` package and symlink when missing — boot-only
   * originally, but a deleted `.airstack` mid-run must self-heal on the next
   * generate instead of leaving imports broken until restart.
   */
  private ensureInstalled() {
    if (this.parent) return;
    bootPackage(this.manifestDir, '@airstack/manifest', {
      '.': './index.ts',
      './*': './*.ts',
      './*.js': './*.ts',
    });
    ensureSymlink(this.viteRoot);
  }

  private updateEntries() {
    this.entries.clear();

    if (this.routeNode.isContent) {
      this.addEntryForRoute(this.routeNode);
    }

    for (const childRoute of this.routeNode.children.values()) {
      if (childRoute.isContent) {
        this.addEntryForRoute(childRoute);
      }
    }

    log.verbose(
      color.event('Collected manifest entries'),
      color.file(this.folderNode.rel || 'root'),
      this.entries.size
    );

    this.generate();
  }

  private addEntryForRoute(route: RouteNode) {
    if (route.page || route.layout) {
      const name = route.page && route.layout ? route.indexName : route.routeName;

      const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
      const routeFilePath = path.join(route.folderNode.dir, this.routeFile);
      const fromPath = importSpecifier(manifestFilePath, routeFilePath);

      this.entries.set(route.rel, {
        path: canonicalPath(route.rel).replace(/\(|\)/g, ''),
        name,
        from: fromPath,
      });
    }

    if (route === this.routeNode && route.namedPages.size) {
      for (const namedPage of route.namedPages) {
        const pageName = namedPageName(namedPage, route.fileMap);
        const namedRel = route.rel ? `${route.rel}/${pageName}` : pageName;
        const name = deriveNamedRouteName(route.folderNode.segment, pageName);

        const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
        const routeFilePath = path.join(route.folderNode.dir, this.routeFile);
        const fromPath = importSpecifier(manifestFilePath, routeFilePath);

        this.entries.set(namedRel, {
          path: canonicalPath(namedRel).replace(/\(|\)/g, ''),
          name,
          from: fromPath,
        });
      }
    }
  }

  /**
   * Generates the index.ts file for this level of the manifest,
   * containing route imports and a default export array of routes.
   */
  public generate() {
    this.ensureInstalled();
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

    if (writeIfChanged(manifestFilePath, content)) {
      log.debug(color.event('Generated route manifest'), color.file(this.folderNode.rel || 'root'));
      this.emitChange('update');
    }
  }

  /**
   * Closes listeners and cleans up the generated manifest index file.
   */
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
    const manifestFilePath = path.join(this.manifestDir, this.folderNode.rel, 'index.ts');
    this.emit('change', manifestFilePath, kind);
  }
}
