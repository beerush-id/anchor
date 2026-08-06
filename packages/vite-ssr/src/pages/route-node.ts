import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { FolderNode } from './folder-node.js';
import type { Framework } from './generate.js';
import {
  deriveIndexName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  GENERATED_MARKER,
  importSpecifier,
  type PageKind,
} from './model.js';
import { scaffoldForFile } from './scaffold.js';

export class RouteNode extends EventEmitter {
  public page: PageKind | undefined;
  public layout = false;
  public route = false;
  public children = new Map<string, RouteNode>();
  public readonly rel: string;
  public readonly routePath: string;
  public readonly routeName: string;

  constructor(
    public readonly folderNode: FolderNode,
    public readonly parent: RouteNode | undefined,
    private readonly fileMap: FileMap,
    private readonly framework: Framework,
    private readonly routerFile: string // Absolute path to the router file
  ) {
    super();

    this.rel = folderNode.rel;
    this.routePath = deriveSegment(folderNode.segment);
    this.routeName = !this.rel ? 'rootRoute' : deriveRouteName(this.rel);

    // Initial state based on current files
    if (folderNode.files.has(fileMap.page)) {
      this.page = 'tsx';
    } else if (folderNode.files.has(fileMap.pageMdx)) {
      this.page = 'mdx';
    }

    if (folderNode.files.has(fileMap.layout) || folderNode.files.has(fileMap.layoutMdx)) {
      this.layout = true;
    }

    if (folderNode.files.has(fileMap.route)) {
      this.route = true;
    }

    // Attach listeners to folder node
    folderNode.on('fileAdded', this.handleFileAdded);
    folderNode.on('fileRemoved', this.handleFileRemoved);
    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);
  }

  public boot() {
    this.generate();

    // Scaffold any 0-byte page/layout files that existed before boot
    for (const file of this.folderNode.files) {
      if (
        file === this.fileMap.page ||
        file === this.fileMap.pageMdx ||
        file === this.fileMap.layout ||
        file === this.fileMap.layoutMdx
      ) {
        this.scaffoldFile(file);
      }
    }

    for (const childFolder of this.folderNode.children.values()) {
      this.handleChildAdded(childFolder);
    }

    for (const child of this.children.values()) {
      child.boot();
    }
  }

  private handleFileAdded = (name: string) => {
    let changed = false;

    if (name === this.fileMap.page) {
      this.page = 'tsx';
      changed = true;
    } else if (name === this.fileMap.pageMdx) {
      if (!this.page) {
        this.page = 'mdx';
        changed = true;
      }
    } else if (name === this.fileMap.layout || name === this.fileMap.layoutMdx) {
      if (!this.layout) {
        this.layout = true;
        changed = true;
      }
    }

    if (changed) {
      this.generate();
      this.emitChange('reload');
    }

    if (
      name === this.fileMap.page ||
      name === this.fileMap.pageMdx ||
      name === this.fileMap.layout ||
      name === this.fileMap.layoutMdx
    ) {
      this.scaffoldFile(name);
    }
  };

  private handleFileRemoved = (name: string) => {
    let changed = false;
    if (name === this.fileMap.page) {
      if (this.folderNode.files.has(this.fileMap.pageMdx)) {
        this.page = 'mdx';
      } else {
        this.page = undefined;
      }
      changed = true;
    } else if (name === this.fileMap.pageMdx) {
      if (this.page === 'mdx') {
        this.page = undefined;
        changed = true;
      }
    } else if (name === this.fileMap.layout || name === this.fileMap.layoutMdx) {
      if (!this.folderNode.files.has(this.fileMap.layout) && !this.folderNode.files.has(this.fileMap.layoutMdx)) {
        this.layout = false;
        changed = true;
      }
    }

    if (changed) {
      this.generate();
      this.emitChange('reload'); // Route or layout removed -> structure change
    }
  };

  private handleChildAdded = (childFolder: FolderNode) => {
    const child = new RouteNode(childFolder, this, this.fileMap, this.framework, this.routerFile);
    this.children.set(childFolder.segment, child);

    // Bubble child changes
    child.on('change', (file, kind) => this.emit('change', file, kind));

    const changed = this.generate();
    if (changed || child.isRoutable) {
      this.emitChange('reload');
    }
  };

  private handleChildRemoved = (childFolder: FolderNode) => {
    const child = this.children.get(childFolder.segment);
    if (!child) return;

    const wasRoutable = child.isRoutable;
    this.children.delete(childFolder.segment);
    child.destroy();

    const changed = this.generate();
    if (changed || wasRoutable) {
      this.emitChange('reload');
    }
  };

  public destroy() {
    this.folderNode.removeListener('fileAdded', this.handleFileAdded);
    this.folderNode.removeListener('fileRemoved', this.handleFileRemoved);
    this.folderNode.removeListener('childAdded', this.handleChildAdded);
    this.folderNode.removeListener('childRemoved', this.handleChildRemoved);

    for (const child of this.children.values()) {
      child.destroy();
    }
    this.children.clear();
    this.emit('destroy');
    this.removeAllListeners();
  }

  public get isContent(): boolean {
    if (!(this.page || this.layout)) return false;
    return !this.rel.split('/').some((segment) => segment.startsWith('[...'));
  }

  public get isRoutable(): boolean {
    return Boolean(this.page || this.layout || this.children.size > 0);
  }

  private get needsIndexRoute(): boolean {
    return Boolean(this.page && (this.layout || this.children.size > 0));
  }

  /**
   * Scaffolds starter content if page/layout file is 0-byte.
   */
  public scaffoldFile(name: string) {
    if (this.framework === undefined) return;
    const file = path.join(this.folderNode.dir, name);

    let shouldWrite = false;
    try {
      if (fs.statSync(file).size === 0) shouldWrite = true;
    } catch {
      return; // Do nothing if it doesn't exist
    }

    if (!shouldWrite) return;

    const content = scaffoldForFile({
      base: name,
      folder: this.folderNode as any, // Temporary cast until scaffold.ts is updated
      framework: this.framework,
      files: this.fileMap,
    });

    if (content) {
      // Defer the scaffold write slightly so Vite's watcher processes the route.ts
      // structural change (and issues a full reload) BEFORE seeing the page.tsx content.
      // This prevents Vite from sending an HMR update for a page that relies on a
      // route.ts module that hasn't been invalidated in the browser yet.
      setTimeout(() => {
        try {
          fs.writeFileSync(file, content);
        } catch {}
      }, 50);
    }
  }

  public generate(): boolean {
    // Only generate route.ts if this node or any child is routable
    if (!this.isRoutable) return false;

    // Prevent recreating the folder if it was just deleted by the user
    if (!fs.existsSync(this.folderNode.dir)) return false;

    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    const lines: string[] = [];

    if (this.parent) {
      let segment = this.routePath;
      const isTopLevel = segment.startsWith('(') && segment.endsWith(')');

      if (isTopLevel) {
        segment = segment.replace(/\(|\)/g, '');
        const routerImport = importSpecifier(routeFilePath, this.routerFile);
        const importLine = `import router from '${routerImport}';`;
        lines.push(importLine, '');
        lines.push(`export const ${this.routeName} = router.add('/${segment}');`);
      } else {
        const parentName = this.parent.routeName;
        const parentRouteFile = path.join(this.parent.folderNode.dir, this.fileMap.route);
        const importLine = `import ${parentName} from '${importSpecifier(routeFilePath, parentRouteFile)}';`;
        lines.push(importLine, '');
        lines.push(`export const ${this.routeName} = ${parentName}.route('/${segment}');`);
      }

      if (this.needsIndexRoute) {
        const indexRouteName = deriveIndexName(this.rel);
        lines.push(`export const ${indexRouteName} = ${this.routeName}.route('/');`);
      }

      lines.push('', GENERATED_MARKER);
      lines.push(`export default ${this.routeName};`);
    } else {
      const routerImport = importSpecifier(routeFilePath, this.routerFile);
      lines.push(`import router from '${routerImport}';`, '', `export const rootRoute = router.route();`);

      if (this.page) {
        lines.push(`export const indexRoute = rootRoute.route('/');`);
      }

      lines.push('', GENERATED_MARKER);
      lines.push(`export default rootRoute;`);
    }

    const content = `${lines.join('\n')}\n`;
    return this.writeIfChanged(routeFilePath, content);
  }

  private writeIfChanged(filePath: string, content: string): boolean {
    try {
      if (fs.readFileSync(filePath, 'utf-8') === content) return false;
    } catch {}

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return true;
  }

  private emitChange(kind: 'update' | 'reload') {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    this.emit('change', routeFilePath, kind);
  }
}
