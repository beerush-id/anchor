import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import type { FolderNode } from './folder-node.js';
import { FRAMEWORK_PACKAGE, type Framework } from './generate.js';
import { DEFAULT_FILE_MAP, deriveIndexName, deriveRouteName, type FileMap } from './model.js';

const FRAMEWORK_JSX_RUNTIME: Record<Framework, string> = {
  react: 'react/jsx-runtime',
  solid: 'solid-js/jsx-runtime',
};

type AstNode = {
  type: string;
  start: number;
  end: number;
  declaration?: AstNode;
  declarations?: { id?: { type: string; name?: string } }[];
  specifiers?: { exported?: { name: string }; local?: { name: string } }[];
  id?: { type: string; name?: string };
  name?: string;
  [key: string]: AnyType;
};

/**
 * Decides the attach snippet or transforms the full compiled MDX module, or returns
 * `undefined` when the file is not an attachable page: not named `page.mdx`, outside the
 * pages directory.
 *
 * The route export is derived from the folder shape — including the root
 * `page.mdx` case, which attaches to the root's `indexRoute`.
 */
export async function mdxAttachForFile(opts: {
  /** Absolute module path (query suffix already stripped). */
  file: string;
  /** Absolute pages directory. */
  pagesDir: string;
  /** The current scanned folder tree. */
  tree: FolderNode;
  framework: Framework;
  files?: Partial<FileMap>;
  /** Complete compiled MDX code string from @mdx-js/rollup to unwrap and transform. */
  code: string;
  /** ESTree parser callback, typically `this.parse` from Rollup plugin context. */
  parse: (code: string) => AnyType | Promise<AnyType>;
}): Promise<string | undefined> {
  const { file, pagesDir, tree, framework, code, parse } = opts;
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };

  if (!file.endsWith('.mdx')) return undefined;

  const base = path.basename(file);
  if (base !== files.pageMdx && base !== files.layoutMdx) return undefined;

  if (!file.startsWith(pagesDir)) return undefined;

  const folder = tree.findNode(path.dirname(file));
  if (!folder) return undefined;

  const hasPageTsx = folder.files.has(files.page);
  const hasPageMdx = folder.files.has(files.pageMdx);
  const hasLayout = folder.files.has(files.layout) || folder.files.has(files.layoutMdx);

  if (base === files.pageMdx && hasPageTsx) return undefined;

  const routeImport = `./${files.route.replace(/\.[^.]+$/, '.js')}`;

  const hasPage = hasPageTsx || hasPageMdx;

  let routeExport: string;
  if (base === files.layoutMdx) {
    routeExport = !folder.rel ? 'rootRoute' : deriveRouteName(folder.rel);
  } else {
    routeExport = !folder.rel
      ? hasPage && hasLayout
        ? 'indexRoute'
        : 'rootRoute'
      : hasPage && hasLayout
        ? deriveIndexName(folder.rel)
        : deriveRouteName(folder.rel);
  }

  return await mdxTransformModule({
    code,
    framework,
    routeExport,
    routeImport,
    parse,
  });
}

/**
 * Transforms a complete compiled MDX module by analyzing its Abstract Syntax Tree (AST),
 * partitioning statements into module scope vs route render setup scope, stripping exports from setup
 * variables ($local, frontmatter), and executing module side-effects ($module, $install) immediately.
 */
export async function mdxTransformModule(opts: {
  code: string;
  framework: Framework;
  routeExport: string;
  routeImport: string;
  parse: (code: string) => AnyType | Promise<AnyType>;
}): Promise<string> {
  const { code, framework, routeExport, routeImport, parse } = opts;
  const pkg = FRAMEWORK_PACKAGE[framework];
  const runtime = FRAMEWORK_JSX_RUNTIME[framework];

  const ast = await parse(code);

  const moduleStatements: string[] = [];
  const setupStatements: string[] = [];

  let hasModule = false;
  let hasInstall = false;

  for (const item of ast.body) {
    const node = item as AstNode;
    const stmt = code.slice(node.start, node.end);

    if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression') {
      moduleStatements.push(stmt);
      continue;
    }

    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration;
      if (decl && decl.type === 'Identifier' && decl.name === 'MDXContent') {
        continue;
      }
      if (decl) {
        setupStatements.push(code.slice(decl.start, node.end));
      }
      continue;
    }

    if (node.type === 'ExportNamedDeclaration') {
      const names = getExportedNames(node);
      const isSideEffect = names.some((name) => name === '$module' || name === '$install');
      const isSetupBinding = names.some((name) => name === 'frontmatter' || name.startsWith('$'));

      if (isSideEffect) {
        if (node.declaration) {
          moduleStatements.push(code.slice(node.declaration.start, node.end));
        }
        if (names.includes('$module')) hasModule = true;
        if (names.includes('$install')) hasInstall = true;
        continue;
      }

      if (isSetupBinding) {
        if (node.declaration) {
          setupStatements.push(code.slice(node.declaration.start, node.end));
        }
        continue;
      }

      moduleStatements.push(stmt);
      continue;
    }

    setupStatements.push(stmt);
  }

  if (hasModule) {
    moduleStatements.push("if (typeof $module === 'function') $module();");
  }
  if (hasInstall) {
    moduleStatements.push("if (typeof $install === 'function') $install();");
  }

  const reactRenderImport =
    framework === 'react' ? "import { render as __airComponentRender } from '@anchorlib/react';" : '';
  const renderWrapperStart = framework === 'react' ? '__airComponentRender(() =>\n    ' : '';
  const renderWrapperEnd = framework === 'react' ? '\n  )' : '';

  return [
    `import { ${routeExport} as __airRoute } from '${routeImport}';`,
    `import { Head as __airHeadTag } from '${pkg}';`,
    `import { Fragment as __airFragment, jsx as __airJsx, jsxs as __airJsxs } from '${runtime}';`,
    reactRenderImport,
    moduleStatements.join('\n\n'),
    '__airRoute.render(({ state: $state, context: $context, children: $children }) => {',
    setupStatements
      .join('\n\n')
      .split('\n')
      .map((line) => (line ? `  ${line}` : ''))
      .join('\n'),
    '',
    '  const __airFm = typeof frontmatter !== "undefined" ? frontmatter : {};',
    '',
    `  return ${renderWrapperStart}__airJsxs(__airFragment, {`,
    '    children: [',
    '      __airJsx(__airHeadTag, { meta: __airFm }),',
    '      __airJsx(MDXContent, {}),',
    '    ],',
    `  })${renderWrapperEnd};`,
    '});',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

function getExportedNames(node: AstNode): string[] {
  const names: string[] = [];
  if (!node.declaration) {
    if (node.specifiers) {
      for (const spec of node.specifiers) {
        if (spec.exported?.name) names.push(spec.exported.name);
        else if (spec.local?.name) names.push(spec.local.name);
      }
    }
    return names;
  }

  const decl = node.declaration;
  if (decl.type === 'VariableDeclaration' && Array.isArray(decl.declarations)) {
    for (const d of decl.declarations) {
      if (d.id?.type === 'Identifier' && d.id.name) {
        names.push(d.id.name);
      }
    }
  } else if ((decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id?.name) {
    names.push(decl.id.name);
  }
  return names;
}
