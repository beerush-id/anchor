import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { color, taggedLogger } from '../logger.js';
import type { AnyType } from '../types.js';
import {
  deriveIndexMetaName,
  deriveIndexName,
  deriveMetaName,
  deriveNamedMetaName,
  deriveNamedRouteName,
  deriveRouteName,
  deriveSegment,
  isNamedPage,
  namedPageName,
  type PageKind,
} from '../utils/mapper.js';
import { type MetadataImportDescriptor, type NamedPageDescriptor, renderRouteFile } from '../utils/route-scaffold.js';
import { fillMissingRouteExports, resolveRouteExportNames } from '../utils/route-sync.js';
import { type UIFileType, wireUIFileContent } from '../utils/route-wiring.js';
import { scaffoldForFile, scaffoldLayoutTsx } from '../utils/scaffold.js';
import { AIR_ENV, type FileMap, type Framework } from './env.js';
import type { FolderNode } from './folder-node.js';

const log = taggedLogger('air-route');

export type { UIFileType };

/**
 * Represents a folder in the route tree. Owns the folder's `route.ts`
 * gap-filling (append missing exports via AST + magic-string) and the wiring
 * of its UI files (`page.tsx` / `layout.tsx`) to the export their physical
 * state requires. UI files bind via `page()` (tree child) or `modal()`
 * (top-level stack entry); both are rewired. Existing user code is never
 * deleted or rewritten.
 */
export class RouteNode extends EventEmitter {
  public page: PageKind | undefined;
  public namedPages = new Set<string>();
  public layout = false;
  public route = false;
  public children = new Map<string, RouteNode>();
  public readonly rel: string;
  public readonly routePath: string;
  public routeName: string;
  public indexName: string;

  constructor(
    public readonly folderNode: FolderNode,
    public readonly parent: RouteNode | undefined,
    public readonly fileMap: FileMap,
    private readonly framework: Framework,
    private readonly routerFile: string,
    public readonly linkMetadata: boolean = false
  ) {
    super();

    this.rel = folderNode.rel;
    this.routePath = deriveSegment(folderNode.segment);
    this.routeName = deriveRouteName(folderNode.segment);
    this.indexName = deriveIndexName(folderNode.segment);

    if (folderNode.files.has(fileMap.page)) {
      this.page = 'tsx';
    } else if (folderNode.files.has(fileMap.pageMdx)) {
      this.page = 'mdx';
    }

    for (const file of folderNode.files) {
      if (isNamedPage(file, fileMap)) {
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

  /** Whether this route has child routes (subfolders with route files or named pages). */
  public get hasChildren(): boolean {
    if (this.namedPages.size > 0) return true;
    for (const child of this.children.values()) {
      /* istanbul ignore next */
      if (child.route || child.page || child.layout || child.namedPages.size > 0 || child.hasChildren) {
        return true;
      }
    }
    return hasChildRoute(this.folderNode, this.fileMap);
  }

  /**
   * Boots the node: adopts existing route export names, ensures the route file
   * exists, gap-fills missing exports, scaffolds empty UI files, and recursively
   * boots child nodes.
   */
  public boot() {
    void this.resolveExportNames();

    if (this.page && this.hasChildren && !this.layout) {
      this.ensureLayoutFile();
    }

    if (this.page || this.layout || this.namedPages.size) {
      this.ensureRouteFile();
    }

    void this.fillMissingExports();
    this.syncUIFiles();

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

  /** Removes event listeners and recursively destroys child nodes. */
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

  /** Whether this folder is a content node (page/layout/named page) and not a wildcard route. */
  public get isContent(): boolean {
    if (!(this.page || this.layout || this.namedPages.size > 0)) return false;
    return !this.rel.split('/').some((segment) => segment.startsWith('[...'));
  }

  /**
   * Discovers the actual exported route names from the existing `route.ts`
   * (if any) via its AST, so hand-written names are adopted and never broken
   * by the framework's fallback derivation. Falls back to leaf-derived names
   * only when the file is missing or has no route exports yet.
   */
  public async resolveExportNames(): Promise<void> {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return;
    }

    const resolved = resolveRouteExportNames(content);
    if (!resolved) return;

    const { routeName, indexName } = resolved;
    const routeChanged = routeName !== undefined && routeName !== this.routeName;
    const indexChanged = indexName !== undefined && indexName !== this.indexName;
    if (routeName) this.routeName = routeName;
    if (indexName) this.indexName = indexName;
    if (routeChanged || indexChanged) {
      log.verbose(color.event('Adopted'), 'export names from', color.file(`${this.displayPath}${this.fileMap.route}`));
    }
  }

  /** Writes starter content into `name` when it is a 0-byte file; non-empty files are never touched. */
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

    /* istanbul ignore else */
    if (content) {
      try {
        fs.writeFileSync(file, content);
        log.debug(color.event('Scaffolded'), color.file(`${this.displayPath}${name}`));
      } catch {}
    }
  }

  /**
   * Maintains the folder's `route.ts` against its physical state: normalizes
   * the parent import to its default form, validates existing wiring, and
   * appends any missing export (index, leaf, default) via magic-string.
   * Existing user code is never deleted or altered.
   */
  private async fillMissingExports(): Promise<void> {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return;
    }

    const isTopLevel = this.routePath.startsWith('(') && this.routePath.endsWith(')');
    const parentRouteFile = this.parent ? path.join(this.parent.folderNode.dir, this.fileMap.route) : undefined;

    const result = fillMissingRouteExports({
      content,
      routeFilePath,
      parentRouteFile,
      parentRouteName: this.parent?.routeName,
      routeName: this.routeName,
      indexName: this.indexName,
      isTopLevel,
      pageKind: this.page,
      hasLayout: this.layout,
      namedPages: this.namedPages,
      linkMetadata: this.linkMetadata,
      fileMap: this.fileMap,
      displayPath: this.displayPath,
      folderSegment: this.folderNode.segment,
      warn: (msg) => this.warn(msg),
      resolveMetadataImport: (kind, p) => this.resolveMetadataImport(kind, p),
    });

    if (!result) return;

    log.verbose(color.event('Validated route exports'), color.file(`${this.displayPath}${this.fileMap.route}`));

    if (result.changed && result.output !== content) {
      fs.writeFileSync(routeFilePath, result.output);
      log.debug(color.event('Regenerated'), color.file(`${this.displayPath}${this.fileMap.route}`));
      this.emitChange('reload');
    }
  }

  /** Rewires the folder's UI files to the export their physical state requires. */
  private syncUIFiles() {
    void this.wireUIFile('layout', this.routeName);
    void this.wireUIFile('page', this.layout ? this.indexName : this.routeName);
  }

  /**
   * Maintains a UI file's route wiring against the contract: the import form
   * (default for the folder route, named for index/leaf routes) and the
   * binding of `page(...)` / `modal(...)`.
   */
  private async wireUIFile(fileType: UIFileType, targetRouteName: string): Promise<void> {
    const name = fileType === 'page' ? this.fileMap.page : this.fileMap.layout;
    const filePath = path.join(this.folderNode.dir, name);

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return;
    }

    const result = wireUIFileContent({
      content,
      filePath,
      displayPath: this.displayPath,
      targetRouteName,
      routeName: this.routeName,
      routeFileName: this.fileMap.route,
      name,
    });

    if (!result) return;

    /* istanbul ignore else */
    if (result.warning) {
      this.warn(result.warning);
    }

    /* istanbul ignore else */
    if (result.changed && result.output !== content) {
      fs.writeFileSync(filePath, result.output);
      this.emitChange('reload');
    }
  }

  /** Creates route.ts from scratch when it doesn't exist. */
  private ensureRouteFile(): boolean {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);

    if (fs.existsSync(routeFilePath)) return false;
    if (!fs.existsSync(this.folderNode.dir)) return false;

    if (this.parent) {
      this.parent.ensureRouteFile();
      this.parent.notifyChildRouteAdded();
    }

    const isTopLevel = this.routePath.startsWith('(') && this.routePath.endsWith(')');
    const metaImports: MetadataImportDescriptor[] = [];

    let routeModifier: string | undefined;
    if (this.linkMetadata && this.page === 'mdx' && !this.layout) {
      const meta = this.resolveMetadataImport('folder', 'page');
      metaImports.push(meta);
      routeModifier = `.meta(${meta.varName})`;
    }

    let indexModifier: string | undefined;
    if (this.linkMetadata && this.page === 'mdx' && this.layout) {
      const meta = this.resolveMetadataImport('index', 'page');
      metaImports.push(meta);
      indexModifier = `.meta(${meta.varName})`;
    }

    const namedPages: NamedPageDescriptor[] = [];
    for (const namedPage of this.namedPages) {
      const isMdx = namedPage.endsWith(`.${this.fileMap.pageMdx}`);
      const name = namedPageName(namedPage, this.fileMap);
      const segment = deriveSegment(name);
      const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
      let metaVarName: string | undefined;
      if (this.linkMetadata && isMdx) {
        const meta = this.resolveMetadataImport('named', name);
        metaImports.push(meta);
        metaVarName = meta.varName;
      }
      namedPages.push({ name, segment, routeName: namedRouteName, metaVarName });
    }

    const parentRouteFile = this.parent ? path.join(this.parent.folderNode.dir, this.fileMap.route) : undefined;

    const output = renderRouteFile({
      routeFilePath,
      routerFile: this.routerFile,
      parentRouteFile,
      parentRouteName: this.parent?.routeName,
      routeName: this.routeName,
      indexName: this.indexName,
      routePath: this.routePath,
      isTopLevel,
      hasPage: Boolean(this.page),
      hasLayout: this.layout,
      metaImports,
      routeModifier,
      indexModifier,
      namedPages,
    });

    fs.mkdirSync(path.dirname(routeFilePath), { recursive: true });
    fs.writeFileSync(routeFilePath, output);
    log.debug(color.event('Generated'), color.file(`${this.displayPath}${this.fileMap.route}`));
    this.route = true;
    this.emitChange('reload');
    return true;
  }

  /**
   * Resolves the metadata import specifier and variable name for an MDX page in this folder.
   * e.g., pageName 'getting-started' in 'docs' -> varName 'docsGettingStartedMeta', source '@airlib-cache/metadata/docs/getting-started.js'
   */
  private resolveMetadataImport(
    kind: 'folder' | 'index' | 'named',
    pageName: string
  ): { varName: string; source: string } {
    const relPath = this.rel ? `${this.rel}/${pageName}` : pageName;
    const source = `${AIR_ENV.cacheScope}/metadata/${relPath}.js`;
    let varName: string;
    if (kind === 'folder') {
      varName = deriveMetaName(this.folderNode.segment);
    } else if (kind === 'index') {
      varName = deriveIndexMetaName(this.folderNode.segment);
    } else {
      varName = deriveNamedMetaName(this.folderNode.segment, pageName);
    }
    return { varName, source };
  }

  /** The folder's path relative to the pages directory, for warning messages. */
  private get displayPath(): string {
    return this.folderNode.rel ? `${this.folderNode.rel}/` : '';
  }

  private addChild(childFolder: FolderNode): RouteNode {
    const child = new RouteNode(childFolder, this, this.fileMap, this.framework, this.routerFile, this.linkMetadata);
    this.children.set(childFolder.segment, child);
    child.on('change', (file, kind) => this.emit('change', file, kind));
    return child;
  }

  /** Logs a constructive warning about contract maintenance. */
  private warn(message: string): void {
    log.warn(message);
  }

  private emitChange(kind: 'update' | 'reload') {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    this.emit('change', routeFilePath, kind);
  }

  /**
   * Notifies this route node and its ancestors that a child route was created or activated.
   * Ensures parent layout files are scaffolded when required by child routes.
   */
  public notifyChildRouteAdded(): void {
    let layoutCreated = false;
    if (this.page && !this.layout) {
      layoutCreated = this.ensureLayoutFile();
    }

    if (layoutCreated) {
      this.ensureRouteFile();
      void this.fillMissingExports();
      this.syncUIFiles();
      this.emitChange('reload');
    }

    this.parent?.notifyChildRouteAdded();
  }

  /**
   * Creates layout.tsx when the route has children but no layout.
   */
  public ensureLayoutFile(): boolean {
    if (this.layout || this.framework === undefined) return false;
    const layoutFilePath = path.join(this.folderNode.dir, this.fileMap.layout);
    if (fs.existsSync(layoutFilePath)) return false;

    const content = scaffoldLayoutTsx({
      framework: this.framework,
      rel: this.folderNode.rel,
      routeExport: this.routeName,
      files: this.fileMap,
    });

    try {
      fs.mkdirSync(path.dirname(layoutFilePath), { recursive: true });
      fs.writeFileSync(layoutFilePath, content);
      log.debug(color.event('Generated layout'), color.file(`${this.displayPath}${this.fileMap.layout}`));
      this.layout = true;
      this.folderNode.files.add(this.fileMap.layout);
      return true;
    } catch {
      return false;
    }
  }

  private handleFileAdded = (name: string) => {
    let changed = false;

    if (name === this.fileMap.route) {
      this.route = true;
      void this.resolveExportNames();
      void this.fillMissingExports();
      this.parent?.notifyChildRouteAdded();
      changed = true;
    } else if (name === this.fileMap.page) {
      this.page = 'tsx';
      if (this.hasChildren && !this.layout) {
        this.ensureLayoutFile();
      }
      this.parent?.notifyChildRouteAdded();
      changed = true;
    } else if (name === this.fileMap.pageMdx) {
      if (!this.page) {
        this.page = 'mdx';
        if (this.hasChildren && !this.layout) {
          this.ensureLayoutFile();
        }
        this.parent?.notifyChildRouteAdded();
        changed = true;
      }
    } else if (name === this.fileMap.layout || name === this.fileMap.layoutMdx) {
      /* istanbul ignore else */
      if (!this.layout) {
        this.layout = true;
        this.parent?.notifyChildRouteAdded();
        changed = true;
      }
    } else if (isNamedPage(name, this.fileMap)) {
      /* istanbul ignore else */
      if (!this.namedPages.has(name)) {
        this.namedPages.add(name);
        if (this.page && !this.layout) {
          this.ensureLayoutFile();
        }
        this.parent?.notifyChildRouteAdded();
        changed = true;
      }
    }

    if (changed) {
      /* istanbul ignore else */
      if (this.page || this.layout || this.namedPages.size) {
        this.ensureRouteFile();
      }

      void this.fillMissingExports();
      this.syncUIFiles();
      this.emitChange('reload');
    }

    if (
      name === this.fileMap.page ||
      name === this.fileMap.pageMdx ||
      name === this.fileMap.layout ||
      name === this.fileMap.layoutMdx ||
      isNamedPage(name, this.fileMap)
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
      /* istanbul ignore else */
      if (this.page === 'mdx') {
        this.page = undefined;
        changed = true;
      }
    } else if (name === this.fileMap.layout || name === this.fileMap.layoutMdx) {
      /* istanbul ignore else */
      if (!this.folderNode.files.has(this.fileMap.layout) && !this.folderNode.files.has(this.fileMap.layoutMdx)) {
        this.layout = false;
        changed = true;
      }
    } else if (this.namedPages.has(name)) {
      this.namedPages.delete(name);
      changed = true;
    }

    if (changed) {
      void this.fillMissingExports();
      this.syncUIFiles();
      this.emitChange('reload');
    }
  };

  private handleFileChanged = (name: string) => {
    if (name === this.fileMap.route) {
      void this.resolveExportNames();
      void this.fillMissingExports();
      this.emitChange('reload');
    } else if (name === this.fileMap.page || name === this.fileMap.layout) {
      this.syncUIFiles();
    }
  };

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
}

/**
 * Checks whether a folder or any of its descendant folders contains route files.
 *
 * @param folder Folder node to evaluate.
 * @param fileMap File name mapping for route contracts.
 * @returns `true` if the folder contains a route file or has subfolders with route files.
 */
export function isRouteFolder(folder: FolderNode, fileMap: FileMap): boolean {
  if (
    folder.files.has(fileMap.route) ||
    folder.files.has(fileMap.page) ||
    folder.files.has(fileMap.pageMdx) ||
    folder.files.has(fileMap.layout) ||
    folder.files.has(fileMap.layoutMdx)
  ) {
    return true;
  }

  for (const file of folder.files) {
    if (isNamedPage(file, fileMap)) {
      return true;
    }
  }

  for (const child of folder.children.values()) {
    if (isRouteFolder(child, fileMap)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether any immediate child directory of the given folder contains route files.
 *
 * @param folder Folder node whose children to evaluate.
 * @param fileMap File name mapping for route contracts.
 * @returns `true` if at least one child directory contains route files.
 */
export function hasChildRoute(folder: FolderNode, fileMap: FileMap): boolean {
  for (const child of folder.children.values()) {
    if (isRouteFolder(child, fileMap)) {
      return true;
    }
  }
  return false;
}
