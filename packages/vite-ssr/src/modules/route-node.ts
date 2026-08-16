import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import { type CallExpression, type Identifier, type ImportSpecifier, Parser, type Program, parse } from 'acorn';
import jsx from 'acorn-jsx';
import MagicString from 'magic-string';
import {
  deriveIndexName,
  deriveNamedRouteName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  type Framework,
  importSpecifier,
  type PageKind,
} from '../utils/mapper.js';
import { scaffoldForFile } from '../utils/scaffold.js';
import type { FolderNode } from './folder-node.js';

/** Acorn parser extended with JSX support, used to locate route bindings in UI files. */
const JsxParser = Parser.extend(jsx());

/** Trailing marker on the generated `export default` line — the one part users must never touch. */
const DEFAULT_EXPORT_MARKER = ' // @generated — do not edit';

export type UIFileType = 'page' | 'layout';

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
    private readonly routerFile: string
  ) {
    super();

    this.rel = folderNode.rel;
    this.routePath = deriveSegment(folderNode.segment);
    this.routeName = !this.rel ? 'rootRoute' : deriveRouteName(folderNode.segment);
    this.indexName = !this.rel ? 'indexRoute' : deriveIndexName(folderNode.segment);

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

  /**
   * Boots the node: adopts existing route export names, ensures the route file
   * exists, gap-fills missing exports, scaffolds empty UI files, and recursively
   * boots child nodes.
   */
  public boot() {
    void this.resolveExportNames();

    if (this.page || this.layout || this.namedPages.size) {
      this.ensureRouteFile();
    }

    void this.fillMissingExports();

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

    const exports = parseRouteExports(content);
    if (!exports) return;

    const { names, defaultName } = exports;
    const routeName =
      defaultName?.endsWith('Route') && !defaultName.endsWith('IndexRoute')
        ? defaultName
        : names.find((n) => n.endsWith('Route') && !n.endsWith('IndexRoute'));
    const indexName = names.find((n) => n.endsWith('IndexRoute'));

    if (routeName) this.routeName = routeName;
    if (indexName) this.indexName = indexName;
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

  /** Rewires the folder's UI files to the export their physical state requires. */
  private syncUIFiles() {
    void this.wireUIFile('layout', this.routeName);
    void this.wireUIFile('page', this.layout ? this.indexName : this.routeName);
  }

  /**
   * Fixes a UI file that points at the wrong route export: layouts always bind
   * to `routeName`, pages bind to `indexName` when a layout exists and to
   * `routeName` otherwise. The file is parsed with acorn + acorn-jsx so the
   * binding is located structurally — no string patterns, which could match
   * text inside code blocks or JSX. Only mismatches are edited — everything
   * else is left untouched. Files acorn cannot parse (e.g. TypeScript
   * annotations) are skipped, never guessed at.
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

    let program: Program;
    try {
      program = JsxParser.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });
    } catch {
      return;
    }

    const routeBase = this.fileMap.route.split('.')[0];

    let importedName: string | undefined;
    let specifier: ImportSpecifier | undefined;

    for (const statement of program.body) {
      if (statement.type !== 'ImportDeclaration') continue;
      if (typeof statement.source.value !== 'string') continue;
      if (path.basename(statement.source.value).split('.')[0] !== routeBase) continue;

      specifier = statement.specifiers.find((s): s is ImportSpecifier => s.type === 'ImportSpecifier');
      if (!specifier) continue;

      importedName = specifier.local.name;
      break;
    }

    if (!importedName || !specifier || importedName === targetRouteName) return;

    // Both `page(...)` and `modal(...)` bind a route: `page()` renders the
    // route as a tree child, `modal()` as a top-level stack entry.
    const call = findBindingCall(program, importedName);
    if (!call) return;

    const magic = new MagicString(content);
    magic.overwrite(specifier.start, specifier.end, targetRouteName);

    const argument = call.arguments[0] as Identifier;
    magic.overwrite(argument.start, argument.end, targetRouteName);

    const output = magic.toString();
    if (output !== content) {
      fs.writeFileSync(filePath, output);
      this.emitChange('reload');
    }
  }

  /**
   * Cross-references the folder's physical state against the parsed exports
   * of `route.ts` and appends any missing export via magic-string. Existing
   * code is never deleted or altered.
   */
  private async fillMissingExports(): Promise<void> {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);

    let content: string;
    try {
      content = fs.readFileSync(routeFilePath, 'utf-8');
    } catch {
      return;
    }

    const exports = parseRouteExports(content);
    if (!exports) return;

    const boundPaths = new Set(
      exports.bindings
        .filter((binding) => binding.object === this.routeName && binding.method === 'route')
        .map((binding) => binding.path)
    );

    const additions: string[] = [];

    if (this.page && this.layout && !exports.names.includes(this.indexName) && !boundPaths.has('/')) {
      additions.push(`export const ${this.indexName} = ${this.routeName}.route('/');`);
    }

    for (const namedPage of this.namedPages) {
      const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
      const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
      const segment = deriveSegment(name);

      if (!exports.names.includes(namedRouteName) && !boundPaths.has(`/${segment}`)) {
        additions.push(`export const ${namedRouteName} = ${this.routeName}.route('/${segment}');`);
      }
    }

    if (!additions.length) return;

    const magic = new MagicString(content);
    magic.appendLeft(exports.defaultStart ?? content.length, `${additions.join('\n')}\n\n`);
    fs.writeFileSync(routeFilePath, magic.toString());
  }

  /** Creates route.ts from scratch when it doesn't exist. */
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
        lines.push(`export const ${this.indexName} = ${this.routeName}.route('/');`);
      }

      for (const namedPage of this.namedPages) {
        const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
        const namedSegment = deriveSegment(name);
        const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
        lines.push(`export const ${namedRouteName} = ${this.routeName}.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(`export default ${this.routeName};${DEFAULT_EXPORT_MARKER}`);
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
        const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
        lines.push(`export const ${namedRouteName} = rootRoute.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(`export default rootRoute;${DEFAULT_EXPORT_MARKER}`);
    }

    fs.mkdirSync(path.dirname(routeFilePath), { recursive: true });
    fs.writeFileSync(routeFilePath, `${lines.join('\n')}\n`);
    this.route = true;
    this.emitChange('reload');
    return true;
  }

  private emitChange(kind: 'update' | 'reload') {
    const routeFilePath = path.join(this.folderNode.dir, this.fileMap.route);
    this.emit('change', routeFilePath, kind);
  }
}

/** A structural view of an `acorn` AST node. */
type AcornNode = {
  type: string;
  start?: number;
  name?: string;
  declaration?: AcornNode;
  declarations?: AcornNode[];
  id?: AcornNode;
  init?: AcornNode;
  callee?: AcornNode;
  object?: AcornNode;
  property?: AcornNode;
  computed?: boolean;
  arguments?: AcornNode[];
  value?: unknown;
  body?: AcornNode[];
};

/** A route registration found in `route.ts`: `object.route('/path')` or `object.add('/path')`. */
type RouteBinding = {
  object: string;
  method: string;
  path: string;
};

type RouteExports = {
  names: string[];
  defaultName?: string;
  /** Position of the `export default` statement, for inserting before it. */
  defaultStart?: number;
  /** Route registrations found in the file, for path-based dedup. */
  bindings: RouteBinding[];
};

/**
 * Parses the exported variable names of a route.ts file with acorn.
 * Returns `undefined` when the file is not parseable as plain JavaScript
 * (e.g. TypeScript annotations), in which case discovery is skipped entirely.
 */
function parseRouteExports(content: string): RouteExports | undefined {
  let ast: AcornNode;
  try {
    ast = parse(content, { ecmaVersion: 'latest', sourceType: 'module' }) as unknown as AcornNode;
  } catch {
    return undefined;
  }

  const names: string[] = [];
  const bindings: RouteBinding[] = [];
  let defaultName: string | undefined;
  let defaultStart: number | undefined;

  for (const node of ast.body ?? []) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      for (const decl of node.declaration.declarations ?? []) {
        if (decl.id?.type === 'Identifier' && decl.id.name) {
          names.push(decl.id.name);
        }
        const binding = routeBinding(decl.init);
        if (binding) bindings.push(binding);
      }
    } else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations ?? []) {
        const binding = routeBinding(decl.init);
        if (binding) bindings.push(binding);
      }
    } else if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration?.type === 'Identifier' &&
      node.declaration.name
    ) {
      defaultName = node.declaration.name;
      defaultStart = node.start;
    }
  }

  return { names, defaultName, defaultStart, bindings };
}

/**
 * Extracts a route registration from an initializer expression — only the
 * `object.route('/path')` / `object.add('/path')` shapes, with a string path.
 */
function routeBinding(init: AcornNode | undefined): RouteBinding | undefined {
  if (init?.type !== 'CallExpression') return undefined;
  const callee = init.callee;
  if (callee?.type !== 'MemberExpression' || callee.computed) return undefined;

  const object = callee.object;
  const property = callee.property;
  if (object?.type !== 'Identifier' || !object.name) return undefined;
  if (property?.type !== 'Identifier' || !property.name) return undefined;

  const method = property.name;
  if (method !== 'route' && method !== 'add') return undefined;

  const argument = init.arguments?.[0];
  if (argument?.type !== 'Literal' || typeof argument.value !== 'string') return undefined;

  return { object: object.name, method, path: argument.value };
}

/**
 * Walks an acorn AST for the first `page(...)` / `modal(...)` call whose first
 * argument is the given binding — the route-binding call of a UI file. The
 * generic walk finds the binding wherever it sits in the module (export
 * default, a named const, etc.) without ever matching string content.
 */
function findBindingCall(node: unknown, name: string): CallExpression | undefined {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findBindingCall(item, name);
      if (found) return found;
    }
    return undefined;
  }

  if (!node || typeof node !== 'object') return undefined;

  const record = node as Record<string, unknown> & { type?: string };

  if (record.type === 'CallExpression') {
    const call = node as CallExpression;
    const callee = call.callee as { type?: string; name?: string };
    const argument = call.arguments[0] as { type?: string; name?: string };

    if (
      callee.type === 'Identifier' &&
      (callee.name === 'page' || callee.name === 'modal') &&
      argument.type === 'Identifier' &&
      argument.name === name
    ) {
      return call;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const found = findBindingCall(value, name);
    if (found) return found;
  }

  return undefined;
}
