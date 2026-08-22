import { type CallExpression, type ParseResult, parseSync } from 'oxc-parser';
import { LEGACY_DEFAULT_MARKER, MARKER_DEFAULT } from './mapper.js';

export type AstNode = {
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
export type RouteBinding = {
  object: string;
  method: string;
  path: string;
  hasMeta?: boolean;
};

/** A variable declaration in `route.ts`, with its statement position and extracted registration. */
export type RouteDeclaration = {
  name: string;
  start: number;
  end: number;
  initEnd?: number;
  initText?: string;
  isExported?: boolean;
  binding?: RouteBinding;
};

/** An import statement in `route.ts`. */
export type RouteImport = {
  source: string;
  kind: 'default' | 'named' | 'namespace';
  localName: string;
  count: number;
  start: number;
  end: number;
};

export type RouteManagedBlock = {
  start: number;
  end: number;
  insertPos: number;
};

export type RouteExports = {
  names: string[];
  defaultName?: string;
  defaultStart?: number;
  /** Insertion point before the default export (before its marker comment when present). */
  defaultInsertStart?: number;
  managedBlock?: RouteManagedBlock;
  declarations: RouteDeclaration[];
  imports: RouteImport[];
};

/** Loose structural identifier shared by all Oxc identifier node kinds. */
export interface UIIdentifier {
  type: string;
  name: string;
  start: number;
  end: number;
}

/**
 * Parses a route.ts file with oxc-parser: exported names, declarations with
 * their registrations, import statements, managed block boundary, and default export position.
 * Returns `undefined` when the file has syntax errors, in which case
 * maintenance is skipped entirely.
 */
export function parseRouteExports(content: string): RouteExports | undefined {
  const parsed: ParseResult = parseSync('route.ts', content, {
    lang: 'ts',
    sourceType: 'module',
    preserveParens: false,
  });

  if (parsed.errors.length) return undefined;

  const ast = parsed.program as unknown as AstNode;
  const comments = parsed.comments;

  const names: string[] = [];
  const declarations: RouteDeclaration[] = [];
  const imports: RouteImport[] = [];
  let defaultName: string | undefined;
  let defaultStart: number | undefined;

  for (const node of ast.body!) {
    if (node.type === 'ImportDeclaration') {
      const source = node.source?.value;
      /* istanbul ignore else */
      if (typeof source === 'string') {
        let kind: RouteImport['kind'] = 'named';
        let localName = '';
        for (const spec of node.specifiers!) {
          const name = spec.local!.name!;
          if (spec.type === 'ImportDefaultSpecifier') {
            kind = 'default';
            localName = name;
            break;
          }
          if (spec.type === 'ImportNamespaceSpecifier') {
            kind = 'namespace';
            localName = name;
            break;
          }
          localName = name;
        }
        imports.push({
          source,
          kind,
          localName,
          count: node.specifiers!.length,
          start: node.start!,
          end: node.end!,
        });
      }
    } else if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      for (const decl of node.declaration.declarations!) {
        if (decl.id?.type === 'Identifier' && decl.id.name) {
          names.push(decl.id.name);
        }
        const name = decl.id?.type === 'Identifier' && decl.id.name ? decl.id.name : '';
        declarations.push({
          name,
          start: node.start!,
          end: node.end!,
          initEnd: decl.init?.end,
          initText: decl.init ? content.slice(decl.init.start!, decl.init.end!) : undefined,
          isExported: true,
          binding: routeBinding(decl.init),
        });
      }
    } else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations!) {
        const name = decl.id?.type === 'Identifier' && decl.id.name ? decl.id.name : '';
        declarations.push({
          name,
          start: node.start!,
          end: node.end!,
          initEnd: decl.init?.end,
          initText: decl.init ? content.slice(decl.init.start!, decl.init.end!) : undefined,
          isExported: false,
          binding: routeBinding(decl.init),
        });
      }
    } else {
      /* istanbul ignore else */
      if (
        node.type === 'ExportDefaultDeclaration' &&
        node.declaration?.type === 'Identifier' &&
        node.declaration.name
      ) {
        defaultName = node.declaration.name;
        defaultStart = node.start!;
      }
    }
  }

  let defaultInsertStart: number | undefined;
  if (defaultStart !== undefined) {
    const adjacent = comments
      .filter((c) => c.end <= defaultStart && content.slice(c.end, defaultStart).trim() === '')
      .sort(
        /* istanbul ignore next */
        (a, b) => b.end - a.end
      )[0];
    if (adjacent && isDefaultMarkerComment(adjacent.value)) {
      defaultInsertStart = adjacent.start;
    }
  }

  const managedComments = comments.filter((c) => isManagedMarkerComment(c.value));
  let managedBlock: RouteManagedBlock | undefined;
  if (managedComments.length >= 2) {
    const first = managedComments[0];
    const second = managedComments[1];
    managedBlock = {
      start: first.start,
      end: second.end,
      insertPos: second.start,
    };
  } else if (managedComments.length === 1) {
    const first = managedComments[0];
    managedBlock = {
      start: first.start,
      end: first.end,
      insertPos: first.end,
    };
  }

  return { names, defaultName, defaultStart, defaultInsertStart, managedBlock, declarations, imports };
}

/**
 * Extracts a route registration from an initializer expression — the
 * `object.route('/path')` / `object.add('/path')` shapes, with a string path.
 * Chained modifiers on top of the registration (`x.route('/').meta({...})`,
 * `.guard(...)`, `.provide(...)`) are unwrapped before reading it.
 */
export function routeBinding(init: AstNode | undefined): RouteBinding | undefined {
  let call = init;
  let hasMeta = false;

  for (;;) {
    if (call?.type !== 'CallExpression') return undefined;
    const callee = call.callee;
    if (callee?.type !== 'MemberExpression' || callee.computed) return undefined;

    const object = callee.object!;
    const property = callee.property!;

    if (property.name === 'meta') {
      hasMeta = true;
    }

    if (object.type === 'CallExpression') {
      call = object;
      continue;
    }

    if (object.type !== 'Identifier') return undefined;

    const method = property.name!;
    if (method !== 'route' && method !== 'add') return undefined;

    const argument = call.arguments?.[0];
    if (argument && typeof argument.value !== 'string') return undefined;

    const path = (argument?.value as string) || '';
    return { object: object.name!, method, path, hasMeta };
  }
}

/**
 * Walks an AST for the first `page(...)` / `modal(...)` call whose first
 * argument is the given binding — the route-binding call of a UI file. The
 * generic walk finds the binding wherever it sits in the module (export
 * default, a named const, etc.) without ever matching string content.
 */
export function findBindingCall(node: unknown, name: string): CallExpression | undefined {
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

/** Whether the given marker comment sits directly above position `at`. */
export function hasMarkerAbove(content: string, at: number, marker: string): boolean {
  return content.slice(0, at).trimEnd().endsWith(marker);
}

/** Start offset of the generator marker line directly above `at`, if any. */
export function markerLineStart(content: string, at: number): number | undefined {
  const lineStart = content.lastIndexOf('\n', at - 2) + 1;
  const line = content.slice(lineStart, at);
  if (!line.includes('@generated')) return undefined;
  return lineStart;
}

/** Whether a comment is the default-export marker, current or legacy form. */
export function isDefaultMarkerComment(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === MARKER_DEFAULT.slice(2).trim() || trimmed === LEGACY_DEFAULT_MARKER.slice(2).trim();
}

/** Whether a comment is the AirLib managed block marker. */
export function isManagedMarkerComment(value: string): boolean {
  return value.includes('AirLib managed');
}
