import path from 'node:path';
import MagicString from 'magic-string';
import { type CallExpression, type ImportDeclaration, parseSync } from 'oxc-parser';
import { color, taggedLogger } from '../logger.js';
import { findBindingCall, type UIIdentifier } from './route-parser.js';

const log = taggedLogger('air-route');

export type UIFileType = 'page' | 'layout';

export type WireUIOptions = {
  content: string;
  filePath: string;
  displayPath: string;
  targetRouteName: string;
  routeName: string;
  routeFileName: string;
  name: string;
};

export type WireUIResult = {
  changed: boolean;
  output: string;
  warning?: string;
};

/**
 * Maintains a UI file's route wiring against the contract: the import form
 * (default for the folder route, named for index/leaf routes) and the
 * binding of `page(...)` / `modal(...)`. Files are parsed with oxc-parser
 * (TSX) so the binding is located structurally — no string patterns, which
 * could match text inside code blocks or JSX. Only mismatches are edited;
 * files with syntax errors (e.g. mid-edit) are skipped, never guessed at.
 */
export function wireUIFileContent(options: WireUIOptions): WireUIResult | undefined {
  const { content, filePath, displayPath, targetRouteName, routeName, routeFileName, name } = options;

  const parsed = parseSync(filePath, content, { lang: 'tsx', sourceType: 'module', preserveParens: false });
  if (parsed.errors.length) return undefined;

  const program = parsed.program;
  const routeBase = routeFileName.split('.')[0];
  const expectDefault = targetRouteName === routeName;

  const routeImports = program.body.filter(
    (statement): statement is ImportDeclaration =>
      statement.type === 'ImportDeclaration' &&
      typeof statement.source.value === 'string' &&
      path.basename(statement.source.value).split('.')[0] === routeBase
  );
  if (!routeImports.length) return undefined;
  const source = routeImports[0].source.value;

  const specifiers = routeImports.flatMap((imp) => imp.specifiers);
  if (specifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) return undefined;

  let call: CallExpression | undefined;
  for (const specifier of specifiers) {
    call = findBindingCall(program, specifier.local.name);
    if (call) break;
  }
  if (!call) return undefined;

  const argument = call.arguments[0] as UIIdentifier;
  log.verbose(color.event('Found route binding'), color.file(`${displayPath}${name}`), color.event(argument.name));
  const needsBindingRewrite = argument.name !== targetRouteName;

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
      const named = specifiers.filter((s) => s.type === 'ImportSpecifier').map((s) => content.slice(s.start, s.end));
      const defaultPart = defaultSpec ? `${content.slice(defaultSpec.start, defaultSpec.end)}, ` : '';
      importBlock = `import ${defaultPart}{ ${[targetRouteName, ...named].join(', ')} } from '${source}';`;
    }
  }

  if (!importBlock && !needsBindingRewrite) return undefined;

  const magic = new MagicString(content);
  const changes: string[] = [];

  if (importBlock) {
    magic.overwrite(routeImports[0].start, routeImports[0].end, importBlock);
    for (const statement of routeImports.slice(1)) {
      const lineStart = content.lastIndexOf('\n', statement.start - 1) + 1;
      const lineEnd = content.indexOf('\n', statement.end);
      /* v8 ignore next */
      magic.remove(lineStart, lineEnd === -1 ? content.length : lineEnd + 1);
    }
    changes.push(`normalized the import to \`${importBlock}\``);
  }

  if (needsBindingRewrite) {
    magic.overwrite(argument.start, argument.end, targetRouteName);
    changes.push(`re-wired the binding to \`${targetRouteName}\``);
  }

  const warning = `${displayPath}${name}: ${changes.join(' and ')} — ${
    expectDefault ? 'the folder route is a default import' : 'the index/leaf route is a named import'
  } so the route chain stays predictable.`;

  return {
    changed: true,
    output: magic.toString(),
    warning,
  };
}
