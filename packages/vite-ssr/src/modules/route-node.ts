import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import {
  deriveIndexName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  type Framework,
  importSpecifier,
  type PageKind,
} from '../utils/mapper.js';
import { scaffoldForFile } from '../utils/scaffold.js';
import type { FolderNode } from './folder-node.js';

export class RouteNode extends EventEmitter {
  public page: PageKind | undefined;
  public namedPages = new Set<string>();
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
    private readonly routerFile: string
  ) {
    super();

    this.rel = folderNode.rel;
    this.routePath = deriveSegment(folderNode.segment);
    this.routeName = !this.rel ? 'rootRoute' : deriveRouteName(this.rel);

    if (folderNode.files.has(fileMap.page)) {
      this.page = 'tsx';
    } else if (folderNode.files.has(fileMap.pageMdx)) {
      this.page = 'mdx';
    }

    for (const file of folderNode.files) {
      if (
        file !== fileMap.page &&
        file !== fileMap.pageMdx &&
        (file.endsWith('.page.tsx') || file.endsWith('.page.mdx') || file.endsWith('.page.ts'))
      ) {
        this.namedPages.add(file);
      }
    }

    if (folderNode.files.has(fileMap.layout) || folderNode.files.has(fileMap.layoutMdx)) {
      this.layout = true;
    }

    if (folderNode.files.has(fileMap.route)) {
      this.route = true;
    }

    folderNode.on('fileAdded', this.handleFileAdded);
    folderNode.on('fileRemoved', this.handleFileRemoved);
    folderNode.on('fileChanged', this.handleFileChanged);
    folderNode.on('childAdded', this.handleChildAdded);
    folderNode.on('childRemoved', this.handleChildRemoved);
  }

  public boot() {
    if (this.page || this.layout || this.namedPages.size) {
      this.ensureRouteFile();
    }

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
      const child = this.addChild(childFolder);
      child.boot();
    }
  }

  public destroy() {
    this.folderNode.removeListener('fileAdded', this.handleFileAdded);
    this.folderNode.removeListener('fileRemoved', this.handleFileRemoved);
    this.folderNode.removeListener('fileChanged', this.handleFileChanged);
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
    if (!(this.page || this.layout || this.namedPages.size > 0)) return false;
    return !this.rel.split('/').some((segment) => segment.startsWith('[...'));
  }

  public scaffoldFile(name: string) {
    if (this.framework === undefined) return;
    const file = path.join(this.folderNode.dir, name);

    let shouldWrite = false;
    try {
      if (fs.statSync(file).size === 0) shouldWrite = true;
    } catch {
      return;
    }

    if (!shouldWrite) return;

    const content = scaffoldForFile({
      base: name,
      folder: this.folderNode as AnyType,
      framework: this.framework,
      files: this.fileMap,
    });

    if (content) {
      setTimeout(() => {
        try {
          fs.writeFileSync(file, content);
        } catch {}
      }, 50);
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
    } else if (
      name !== this.fileMap.page &&
      name !== this.fileMap.pageMdx &&
      (name.endsWith('.page.tsx') || name.endsWith('.page.mdx') || name.endsWith('.page.ts'))
    ) {
      if (!this.namedPages.has(name)) {
        this.namedPages.add(name);
        changed = true;
      }
    }

    if (changed) {
      this.ensureRouteFile();

      if (this.page && this.layout) {
        this.ensureIndexRoute();
      }

      if (this.namedPages.has(name)) {
        this.ensureNamedRoute(name);
      }

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
    } else if (this.namedPages.has(name)) {
      this.namedPages.delete(name);
      changed = true;
    }

    if (changed) {
      if (!this.page || !this.layout) {
        this.removeIndexRoute();
      }

      if (name.endsWith('.page.tsx') || name.endsWith('.page.mdx') || name.endsWith('.page.ts')) {
        this.removeNamedRoute(name);
      }

      this.emitChange('reload');
    }
  };

  private handleFileChanged = (name: string) => {
    if (name === this.fileMap.route) {
      this.emitChange('reload');
    }
  };

  private addChild(childFolder: FolderNode): RouteNode {
    const child = new RouteNode(childFolder, this, this.fileMap, this.framework, this.routerFile);
    this.children.set(childFolder.segment, child);
    child.on('change', (file, kind) => this.emit('change', file, kind));
    return child;
  }

  private handleChildAdded = (childFolder: FolderNode) => {
    const child = this.addChild(childFolder);
    child.boot();
  };

  private handleChildRemoved = (childFolder: FolderNode) => {
    const child = this.children.get(childFolder.segment);
    if (!child) return;
    this.children.delete(childFolder.segment);
    child.destroy();
    this.emitChange('reload');
  };

  /** Creates route.ts if it doesn't exist. */
  private ensureRouteFile(): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);

    if (fs.existsSync(routeFilePath)) return false;
    if (!fs.existsSync(this.folderNode.dir)) return false;

    if (this.parent) {
      this.parent.ensureRouteFile();
    }

    const lines: string[] = [];

    if (this.parent) {
      let segment = this.routePath;
      const isTopLevel = segment.startsWith('(') && segment.endsWith(')');

      if (isTopLevel) {
        segment = segment.replace(/\(|\)/g, '');
        const routerImport = importSpecifier(routeFilePath, this.routerFile);
        lines.push(`import router from '${routerImport}';`);
        lines.push('');
        lines.push(`export const ${this.routeName} = router.add('/${segment}');`);
      } else {
        const parentName = this.parent.routeName;
        const parentRouteFile = path.join(this.parent.folderNode.dir, this.fileMap.route);
        lines.push(`import ${parentName} from '${importSpecifier(routeFilePath, parentRouteFile)}';`);
        lines.push('');
        lines.push(`export const ${this.routeName} = ${parentName}.route('/${segment}');`);
      }

      if (this.page && this.layout) {
        lines.push(`export const ${deriveIndexName(this.rel)} = ${this.routeName}.route('/');`);
      }

      for (const namedPage of this.namedPages) {
        const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
        const namedSegment = deriveSegment(name);
        const namedRouteName = deriveRouteName(`${this.rel}/${name}`);
        lines.push(`export const ${namedRouteName} = ${this.routeName}.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(`export default ${this.routeName};`);
    } else {
      const routerImport = importSpecifier(routeFilePath, this.routerFile);
      lines.push(`import router from '${routerImport}';`);
      lines.push('');
      lines.push(`export const rootRoute = router.route();`);

      if (this.page && this.layout) {
        lines.push(`export const indexRoute = rootRoute.route('/');`);
      }

      for (const namedPage of this.namedPages) {
        const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
        const namedSegment = deriveSegment(name);
        const namedRouteName = deriveRouteName(name);
        lines.push(`export const ${namedRouteName} = rootRoute.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(`export default rootRoute;`);
    }

    fs.mkdirSync(path.dirname(routeFilePath), { recursive: true });
    fs.writeFileSync(routeFilePath, `${lines.join('\n')}\n`);
    this.route = true;
    this.emitChange('reload');
    return true;
  }

  /** Inserts the index route export if absent. */
  private ensureIndexRoute(): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    const indexRouteName = !this.rel ? 'indexRoute' : deriveIndexName(this.rel);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return false;
    }

    if (content.includes(`export const ${indexRouteName}`)) return false;

    const lines = content.split('\n');
    const baseIdx = lines.findIndex((line) => line.startsWith(`export const ${this.routeName}`));
    if (baseIdx === -1) return false;

    lines.splice(baseIdx + 1, 0, `export const ${indexRouteName} = ${this.routeName}.route('/');`);
    fs.writeFileSync(routeFilePath, lines.join('\n'));
    return true;
  }

  private removeIndexRoute(): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    const indexRouteName = !this.rel ? 'indexRoute' : deriveIndexName(this.rel);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return false;
    }

    const lines = content.split('\n');
    const idx = lines.findIndex((line) => line.startsWith(`export const ${indexRouteName}`));
    if (idx === -1) return false;

    lines.splice(idx, 1);
    fs.writeFileSync(routeFilePath, lines.join('\n'));
    return true;
  }

  private ensureNamedRoute(fileName: string): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    const name = fileName.replace(/\.page\.(tsx|mdx|ts)$/, '');
    const namedSegment = deriveSegment(name);
    const namedRouteName = deriveRouteName(this.rel ? `${this.rel}/${name}` : name);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return false;
    }

    if (content.includes(`export const ${namedRouteName}`)) return false;

    const lines = content.split('\n');
    const baseIdx = lines.findIndex((line) => line.startsWith(`export const ${this.routeName}`));
    if (baseIdx === -1) return false;

    lines.splice(baseIdx + 1, 0, `export const ${namedRouteName} = ${this.routeName}.route('/${namedSegment}');`);
    fs.writeFileSync(routeFilePath, lines.join('\n'));
    return true;
  }

  private removeNamedRoute(fileName: string): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    const name = fileName.replace(/\.page\.(tsx|mdx|ts)$/, '');
    const namedRouteName = deriveRouteName(this.rel ? `${this.rel}/${name}` : name);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return false;
    }

    const lines = content.split('\n');
    const idx = lines.findIndex((line) => line.startsWith(`export const ${namedRouteName}`));
    if (idx === -1) return false;

    lines.splice(idx, 1);
    fs.writeFileSync(routeFilePath, lines.join('\n'));
    return true;
  }

  private emitChange(kind: 'update' | 'reload') {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    this.emit('change', routeFilePath, kind);
  }
}
