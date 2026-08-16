import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import MagicString from 'magic-string';
import { type CallExpression, type ImportDeclaration, type ParseResult, type Program, parseSync } from 'oxc-parser';
import {
  deriveIndexName,
  deriveNamedRouteName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  type Framework,
  importSpecifier,
  LEGACY_DEFAULT_MARKER,
  MARKER_DEFAULT,
  MARKER_IMPORT_NAME,
  MARKER_VARIABLE_NAME,
  type PageKind,
} from '../utils/mapper.js';
import { scaffoldForFile } from '../utils/scaffold.js';
import type { FolderNode } from './folder-node.js';

export type UIFileType = 'page' | 'layout';

/** Loose structural identifier shared by all Oxc identifier node kinds. */
interface Identifier {
  type: string;
  name: string;
  start: number;
  end: number;
}

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
    } else if (name === this.fileMap.page || name === this.fileMap.layout) {
      this.syncUIFiles();
    }
  };

  private addChild(childFolder: FolderNode): RouteNode {
    const child = new RouteNode(childFolder, this, this.fileMap, this.framework, this.routerFile);
    this.children.set(childFolder.segment, child);
    child.on('change', (file, kind) => this.emit('change', file, kind));
    child.on('warn', (message) => this.emit('warn', message));
    return child;
  }

  /** Surfaces a constructive warning about contract maintenance. */
  private warn(message: string): void {
    this.emit('warn', message);
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
   * Maintains a UI file's route wiring against the contract: the import form
   * (default for the folder route, named for index/leaf routes) and the
   * binding of `page(...)` / `modal(...)`. Files are parsed with oxc-parser
   * (TSX) so the binding is located structurally — no string patterns, which
   * could match text inside code blocks or JSX. Only mismatches are edited;
   * files with syntax errors (e.g. mid-edit) are skipped, never guessed at.
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
      const parsed = parseSync(filePath, content, { lang: 'tsx', sourceType: 'module', preserveParens: false });
      if (parsed.errors.length) return;
      program = parsed.program;
    } catch {
      return;
    }

    const routeBase = this.fileMap.route.split('.')[0];
    const expectDefault = targetRouteName === this.routeName;

    // All imports from the route module — formatters may split or merge them,
    // so the contract reads across the whole set, never one statement.
    const routeImports = program.body.filter(
      (statement): statement is ImportDeclaration =>
        statement.type === 'ImportDeclaration' &&
        typeof statement.source.value === 'string' &&
        path.basename(statement.source.value).split('.')[0] === routeBase
    );
    if (!routeImports.length) return;
    const source = routeImports[0].source.value;
    if (typeof source !== 'string') return;

    const specifiers = routeImports.flatMap((imp) => imp.specifiers);
    if (specifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) return;

    // The binding call is the `page(...)` / `modal(...)` whose first argument
    // is one of the imported names: `page()` renders the route as a tree
    // child, `modal()` as a top-level stack entry.
    let call: CallExpression | undefined;
    for (const specifier of specifiers) {
      call = findBindingCall(program, specifier.local.name);
      if (call) break;
    }
    if (!call) return;

    const argument = call.arguments[0] as Identifier;
    const needsBindingRewrite = argument.name !== targetRouteName;

    // The binding must be imported with its contract kind — default for the
    // folder route, named for index/leaf routes. Any other shape (wrong kind,
    // missing binding) is rewritten into one combined statement; everything
    // else is user code, preserved verbatim. No markers: formatters own the
    // import line, so the contract only checks the binding kind.
    const bindingKindOk = specifiers.some((s) =>
      expectDefault
        ? s.type === 'ImportDefaultSpecifier' && s.local.name === targetRouteName
        : s.type === 'ImportSpecifier' && s.local.name === targetRouteName
    );

    let importBlock: string | undefined;
    if (!bindingKindOk) {
      if (expectDefault) {
        const rest = specifiers
          .filter((s) => !(s.type === 'ImportSpecifier' && s.local.name === targetRouteName))
          .map((s) => content.slice(s.start, s.end))
          .join(', ');
        importBlock = rest
          ? `import ${targetRouteName}, { ${rest} } from '${source}';`
          : `import ${targetRouteName} from '${source}';`;
      } else {
        const defaultSpec = specifiers.find((s) => s.type === 'ImportDefaultSpecifier');
        const named = specifiers
          .filter((s) => s.type === 'ImportSpecifier' && s.local.name !== targetRouteName)
          .map((s) => content.slice(s.start, s.end));
        const defaultPart = defaultSpec ? `${content.slice(defaultSpec.start, defaultSpec.end)}, ` : '';
        importBlock = `import ${defaultPart}{ ${[targetRouteName, ...named].join(', ')} } from '${source}';`;
      }
    }

    if (!importBlock && !needsBindingRewrite) return;

    const magic = new MagicString(content);
    const changes: string[] = [];

    if (importBlock) {
      magic.overwrite(routeImports[0].start, routeImports[0].end, importBlock);
      for (const statement of routeImports.slice(1)) {
        const lineStart = content.lastIndexOf('\n', statement.start - 1) + 1;
        const lineEnd = content.indexOf('\n', statement.end);
        magic.remove(lineStart, lineEnd === -1 ? content.length : lineEnd + 1);
      }
      changes.push(`normalized the import to \`${importBlock}\``);
    }

    if (needsBindingRewrite) {
      magic.overwrite(argument.start, argument.end, targetRouteName);
      changes.push(`re-wired the binding to \`${targetRouteName}\``);
    }

    if (changes.length) {
      this.warn(
        `${this.displayPath}${name}: ${changes.join(' and ')} — ${expectDefault ? 'the folder route is a default import' : 'the index/leaf route is a named import'} so the route chain stays predictable.`
      );
    }

    const output = magic.toString();
    if (output !== content) {
      fs.writeFileSync(filePath, output);
      this.emitChange('reload');
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

    const exports = parseRouteExports(content);
    if (!exports) return;

    this.validateRouteWiring(exports);

    const magic = new MagicString(content);
    let changed = false;

    const isTopLevel = this.routePath.startsWith('(') && this.routePath.endsWith(')');
    const expectedImportSource = this.parent
      ? isTopLevel
        ? importSpecifier(routeFilePath, this.routerFile)
        : importSpecifier(routeFilePath, path.join(this.parent.folderNode.dir, this.fileMap.route))
      : importSpecifier(routeFilePath, this.routerFile);
    const routeImport = exports.imports.find((i) => i.source === expectedImportSource);

    if (routeImport) {
      if (this.parent && !isTopLevel && routeImport.kind === 'named' && routeImport.count === 1) {
        const found = content.slice(routeImport.start, routeImport.end);
        const replacement = `import ${this.parent.routeName} from '${routeImport.source}';`;
        if (found !== replacement) {
          magic.overwrite(routeImport.start, routeImport.end, replacement);
          changed = true;
          this.warn(
            `${this.displayPath}route.ts: normalized \`${found}\` to \`${replacement}\` — child folders import the parent's default export so the route chain stays predictable.`
          );
        }
      }

      if (!hasMarkerAbove(content, routeImport.start, MARKER_IMPORT_NAME)) {
        magic.prependLeft(routeImport.start, `${MARKER_IMPORT_NAME}\n`);
        changed = true;
      }
    }

    for (const contractName of this.contractExportNames()) {
      const declaration = exports.declarations.find((d) => d.name === contractName);
      if (declaration?.start !== undefined && !hasMarkerAbove(content, declaration.start, MARKER_VARIABLE_NAME)) {
        magic.prependLeft(declaration.start, `${MARKER_VARIABLE_NAME}\n`);
        changed = true;
      }
    }

    const boundPaths = new Set(
      exports.declarations
        .map((d) => d.binding)
        .filter((binding): binding is RouteBinding => binding !== undefined)
        .filter((binding) => binding.object === this.routeName && binding.method === 'route')
        .map((binding) => binding.path)
    );

    const additions: string[] = [];

    if (this.page && this.layout && !exports.names.includes(this.indexName) && !boundPaths.has('/')) {
      additions.push(`${MARKER_VARIABLE_NAME}\nexport const ${this.indexName} = ${this.routeName}.route('/');`);
    }

    for (const namedPage of this.namedPages) {
      const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
      const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
      const segment = deriveSegment(name);

      if (!exports.names.includes(namedRouteName) && !boundPaths.has(`/${segment}`)) {
        additions.push(
          `${MARKER_VARIABLE_NAME}\nexport const ${namedRouteName} = ${this.routeName}.route('/${segment}');`
        );
      }
    }

    const defaultMarkerMissing =
      exports.defaultName !== undefined &&
      exports.defaultStart !== undefined &&
      !hasMarkerAbove(content, exports.defaultStart, MARKER_DEFAULT) &&
      !hasMarkerAbove(content, exports.defaultStart, LEGACY_DEFAULT_MARKER);

    if (!exports.defaultName && exports.names.includes(this.routeName)) {
      additions.push(`${MARKER_DEFAULT}\nexport default ${this.routeName};`);
    }

    if (additions.length || defaultMarkerMissing) {
      const block = defaultMarkerMissing ? [...additions, MARKER_DEFAULT].join('\n\n') : additions.join('\n\n');
      const insertStart = defaultMarkerMissing
        ? exports.defaultStart!
        : (exports.defaultInsertStart ?? exports.defaultStart ?? content.length);
      if (defaultMarkerMissing || insertStart >= content.length) {
        magic.appendLeft(insertStart, `${block}\n`);
      } else {
        magic.appendLeft(insertStart, `${block}\n\n`);
      }
      changed = true;
    }

    if (!changed) return;

    const output = magic.toString();
    if (output !== content) {
      fs.writeFileSync(routeFilePath, output);
      this.emitChange('reload');
    }
  }

  /**
   * Warns about existing exports whose wiring contradicts the contract: the
   * default must reference the folder route, index/leaf exports must chain it
   * with their exact path. Missing exports are not warned — they are filled.
   */
  private validateRouteWiring(exports: RouteExports): void {
    if (exports.defaultName && exports.defaultName !== this.routeName) {
      this.warn(
        `${this.displayPath}route.ts: the default export should reference the folder route \`${this.routeName}\` — found \`${exports.defaultName}\`. Adjust the wiring, or remove the export and the generator will re-create it.`
      );
    }

    const check = (exportName: string, expected: RouteBinding): void => {
      if (!exports.names.includes(exportName)) return;
      const declaration = exports.declarations.find((d) => d.name === exportName);
      const binding = declaration?.binding;
      const found = declaration?.initText ? `\`${declaration.initText}\`` : 'no route wiring';
      const wired =
        binding?.object === expected.object && binding.method === expected.method && binding.path === expected.path;

      if (!wired) {
        this.warn(
          `${this.displayPath}route.ts: ${exportName} is wired as ${found} — it should chain the folder route: \`${expected.object}.${expected.method}('${expected.path}')\`. Adjust the wiring, or remove the export and the generator will re-create it.`
        );
      }
    };

    if (this.page && this.layout) {
      check(this.indexName, { object: this.routeName, method: 'route', path: '/' });
    }

    for (const namedPage of this.namedPages) {
      const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
      check(deriveNamedRouteName(this.folderNode.segment, name), {
        object: this.routeName,
        method: 'route',
        path: `/${deriveSegment(name)}`,
      });
    }
  }

  /** The export names this folder's contract owns: the folder route, index, and leaf routes. */
  private contractExportNames(): string[] {
    const names = [this.routeName];
    if (this.page && this.layout) names.push(this.indexName);
    for (const namedPage of this.namedPages) {
      names.push(deriveNamedRouteName(this.folderNode.segment, namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '')));
    }
    return names;
  }

  /** The folder's path relative to the pages directory, for warning messages. */
  private get displayPath(): string {
    return this.folderNode.rel ? `${this.folderNode.rel}/` : '';
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
        lines.push(MARKER_IMPORT_NAME);
        lines.push(`import router from '${routerImport}';`);
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const ${this.routeName} = router.add('/${segment}');`);
      } else {
        const parentName = this.parent.routeName;
        const parentRouteFile = path.join(this.parent.folderNode.dir, this.fileMap.route);
        lines.push(MARKER_IMPORT_NAME);
        lines.push(`import ${parentName} from '${importSpecifier(routeFilePath, parentRouteFile)}';`);
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const ${this.routeName} = ${parentName}.route('/${segment}');`);
      }

      if (this.page && this.layout) {
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const ${this.indexName} = ${this.routeName}.route('/');`);
      }

      for (const namedPage of this.namedPages) {
        const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
        const namedSegment = deriveSegment(name);
        const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const ${namedRouteName} = ${this.routeName}.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(MARKER_DEFAULT);
      lines.push(`export default ${this.routeName};`);
    } else {
      const routerImport = importSpecifier(routeFilePath, this.routerFile);
      lines.push(MARKER_IMPORT_NAME);
      lines.push(`import router from '${routerImport}';`);
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const rootRoute = router.route();`);

      if (this.page && this.layout) {
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const indexRoute = rootRoute.route('/');`);
      }

      for (const namedPage of this.namedPages) {
        const name = namedPage.replace(/\.page\.(tsx|mdx|ts)$/, '');
        const namedSegment = deriveSegment(name);
        const namedRouteName = deriveNamedRouteName(this.folderNode.segment, name);
        lines.push('');
        lines.push(MARKER_VARIABLE_NAME);
        lines.push(`export const ${namedRouteName} = rootRoute.route('/${namedSegment}');`);
      }

      lines.push('');
      lines.push(MARKER_DEFAULT);
      lines.push(`export default rootRoute;`);
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

/** A structural view of an `oxc-parser` ESTree node. */
type AstNode = {
  type: string;
  start?: number;
  end?: number;
  name?: string;
  declaration?: AstNode;
  declarations?: AstNode[];
  id?: AstNode;
  init?: AstNode;
  callee?: AstNode;
  object?: AstNode;
  property?: AstNode;
  computed?: boolean;
  arguments?: AstNode[];
  value?: unknown;
  source?: AstNode & { value?: unknown };
  specifiers?: AstNode[];
  local?: AstNode;
  body?: AstNode[];
};

/** A route registration found in `route.ts`: `object.route('/path')` or `object.add('/path')`. */
type RouteBinding = {
  object: string;
  method: string;
  path: string;
};

/** A variable declaration in `route.ts`, with its statement position and extracted registration. */
type RouteDeclaration = {
  name: string;
  start?: number;
  initText?: string;
  binding?: RouteBinding;
};

/** An import statement in `route.ts`. */
type RouteImport = {
  source: string;
  kind: 'default' | 'named' | 'namespace';
  localName: string;
  count: number;
  start: number;
  end: number;
};

type RouteExports = {
  names: string[];
  defaultName?: string;
  defaultStart?: number;
  /** Insertion point before the default export (before its marker comment when present). */
  defaultInsertStart?: number;
  declarations: RouteDeclaration[];
  imports: RouteImport[];
};

/**
 * Parses a route.ts file with oxc-parser: exported names, declarations with
 * their registrations, import statements, and the default export position.
 * Returns `undefined` when the file has syntax errors, in which case
 * maintenance is skipped entirely.
 */
function parseRouteExports(content: string): RouteExports | undefined {
  let parsed: ParseResult;
  try {
    parsed = parseSync('route.ts', content, { lang: 'ts', sourceType: 'module', preserveParens: false });
  } catch {
    return undefined;
  }

  if (parsed.errors.length) return undefined;

  const ast = parsed.program as unknown as AstNode;
  const comments = parsed.comments;

  const names: string[] = [];
  const declarations: RouteDeclaration[] = [];
  const imports: RouteImport[] = [];
  let defaultName: string | undefined;
  let defaultStart: number | undefined;

  for (const node of ast.body ?? []) {
    if (node.type === 'ImportDeclaration') {
      const source = node.source?.value;
      if (typeof source === 'string') {
        let kind: RouteImport['kind'] = 'named';
        let localName = '';
        for (const spec of node.specifiers ?? []) {
          const name = spec.local?.name;
          if (spec.type === 'ImportDefaultSpecifier') {
            kind = 'default';
            localName = name ?? '';
            break;
          }
          if (spec.type === 'ImportNamespaceSpecifier') {
            kind = 'namespace';
            localName = name ?? '';
            break;
          }
          kind = 'named';
          localName = name ?? '';
        }
        imports.push({
          source,
          kind,
          localName,
          count: (node.specifiers ?? []).length,
          start: node.start ?? 0,
          end: node.end ?? 0,
        });
      }
    } else if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      for (const decl of node.declaration.declarations ?? []) {
        if (decl.id?.type === 'Identifier' && decl.id.name) {
          names.push(decl.id.name);
        }
        const name = decl.id?.type === 'Identifier' && decl.id.name ? decl.id.name : '';
        declarations.push({
          name,
          start: node.start,
          initText: decl.init ? content.slice(decl.init.start ?? 0, decl.init.end ?? 0) : undefined,
          binding: routeBinding(decl.init),
        });
      }
    } else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations ?? []) {
        const name = decl.id?.type === 'Identifier' && decl.id.name ? decl.id.name : '';
        declarations.push({
          name,
          start: node.start,
          initText: decl.init ? content.slice(decl.init.start ?? 0, decl.init.end ?? 0) : undefined,
          binding: routeBinding(decl.init),
        });
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

  let defaultInsertStart = defaultStart;
  if (defaultStart !== undefined) {
    const adjacent = comments
      .filter((c) => c.end <= defaultStart && content.slice(c.end, defaultStart).trim() === '')
      .sort((a, b) => b.end - a.end)[0];
    if (adjacent && isDefaultMarkerComment(adjacent.value)) {
      defaultInsertStart = adjacent.start;
    }
  }

  return { names, defaultName, defaultStart, defaultInsertStart, declarations, imports };
}

/** Whether the given marker comment sits directly above position `at`. */
function hasMarkerAbove(content: string, at: number, marker: string): boolean {
  return content.slice(0, at).trimEnd().endsWith(marker);
}

/** Whether a comment is the default-export marker, current or legacy form. */
function isDefaultMarkerComment(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === MARKER_DEFAULT.slice(2).trim() || trimmed === LEGACY_DEFAULT_MARKER.slice(2).trim();
}

/**
 * Extracts a route registration from an initializer expression — only the
 * `object.route('/path')` / `object.add('/path')` shapes, with a string path.
 */
function routeBinding(init: AstNode | undefined): RouteBinding | undefined {
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

/**  * Walks an AST for the first `page(...)` / `modal(...)` call whose first
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
