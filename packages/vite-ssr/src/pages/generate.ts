import path from 'node:path';
import {
  canonicalPath,
  DEFAULT_FILE_MAP,
  deriveIndexName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  type FolderNode,
  flattenTree,
  GENERATED_MARKER,
  humanizeSegment,
  importSpecifier,
  isContentNode,
  needsIndexRoute,
  routeExportForFolder,
} from './model.js';

const ROUTE_FILE = 'route.ts';
export type GeneratedFile = {
  /** Absolute file path. */
  filePath: string;
  content: string;
  /** Index route declaration line if this folder requires an index route. */
  indexRoute?: string;
};

export type Framework = 'react' | 'solid';

export const FRAMEWORK_PACKAGE: Record<Framework, string> = {
  react: '@anchorlib/react',
  solid: '@anchorlib/solid',
};

/**
 * Generates the per-folder `route.ts` files for a scanned pages tree.
 */
export function generateRouteFiles(opts: { root: FolderNode; routerFile: string }): GeneratedFile[] {
  const { root, routerFile } = opts;
  const files: GeneratedFile[] = [];

  const emit = (node: FolderNode, lines: string[], indexRoute?: string) => {
    files.push({
      filePath: path.join(node.dir, ROUTE_FILE),
      content: `${lines.join('\n')}\n`,
      indexRoute,
    });
  };

  const walk = (node: FolderNode, parent?: FolderNode) => {
    if (parent) {
      const name = deriveRouteName(node.rel);
      let segment = deriveSegment(node.segment);
      const lines: string[] = [];

      const isTopLevel = segment.startsWith('(') && segment.endsWith(')');

      if (isTopLevel) {
        segment = segment.replace(/\(|\)/g, '');
        const routerImport = importSpecifier(path.join(node.dir, ROUTE_FILE), routerFile);
        const importLine = `import router from '${routerImport}';`;
        lines.push(importLine, '');
        lines.push(`export const ${name} = router.add('/${segment}');`);
      } else {
        const parentName = !parent.rel ? 'rootRoute' : deriveRouteName(parent.rel);
        const importLine = `import ${parentName} from '../route.js';`;
        lines.push(importLine, '');
        lines.push(`export const ${name} = ${parentName}.route('/${segment}');`);
      }

      let indexRoute: string | undefined;
      if (needsIndexRoute(node)) {
        indexRoute = `export const ${deriveIndexName(node.rel)} = ${name}.route('/');`;
        lines.push(indexRoute);
      }

      lines.push('', GENERATED_MARKER);
      lines.push(`export default ${name};`);
      emit(node, lines, indexRoute);
    } else {
      const routerImport = importSpecifier(path.join(node.dir, ROUTE_FILE), routerFile);
      const lines = [`import router from '${routerImport}';`, '', `export const rootRoute = router.route();`];

      let indexRoute: string | undefined;
      if (node.page) {
        indexRoute = `export const indexRoute = rootRoute.route('/');`;
        lines.push(indexRoute);
      }

      lines.push('', GENERATED_MARKER);
      lines.push(`export default rootRoute;`);
      emit(node, lines, indexRoute);
    }

    for (const child of node.children) {
      walk(child, node);
    }
  };

  walk(root);

  return files;
}

/**
 * Generates the route manifest for sidebars/menus/breadcrumbs.
 * Lists the content routes (pages, layouts, and irpc handoffs), giving each its route name
 * and importing it directly from the colocated `route.ts` module.
 */
export function generateManifest(opts: {
  root: FolderNode;
  manifestDir: string;
  framework: Framework;
}): GeneratedFile[] {
  const { root, manifestDir, framework } = opts;
  const files: GeneratedFile[] = [];
  const manifestFile = path.join(manifestDir, 'index.ts');

  const entries: { path: string; name: string; from: string }[] = [];

  for (const node of flattenTree(root)) {
    if (!isContentNode(node)) continue;

    const name = !node.rel
      ? 'indexRoute'
      : needsIndexRoute(node)
        ? deriveIndexName(node.rel)
        : deriveRouteName(node.rel);
    const fromPath = importSpecifier(manifestFile, path.join(node.dir, ROUTE_FILE));

    entries.push({
      path: canonicalPath(node.rel),
      name,
      from: fromPath,
    });
  }

  const imports = [...entries]
    .sort((a, b) => a.from.localeCompare(b.from))
    .map((entry) => `import { ${entry.name} } from '${entry.from}';`);

  const lines = [
    GENERATED_MARKER,
    `import { createRouteManifest } from '${FRAMEWORK_PACKAGE[framework]}';`,
    ...imports,
  ];

  if (entries.length) {
    const body = entries.map((entry) => `  ['${entry.path.replace(/\(|\)/g, '')}', ${entry.name}],`).join('\n');
    lines.push('export const routes = createRouteManifest([', body, ']);', '');
  } else {
    lines.push('export const routes = createRouteManifest([]);', '');
  }

  files.push({ filePath: manifestFile, content: lines.join('\n') });

  return files;
}

/**
 * Scaffolds a `page.tsx` module.
 */
export function scaffoldPageTsx(opts: { framework: Framework; rel: string; routeExport: string }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const name = opts.routeExport === 'indexRoute' ? 'Home' : humanizeSegment(opts.rel.split('/').pop() || '');

  return `import { page } from '${pkg}';
import { ${opts.routeExport} } from './route.js';

export default page(${opts.routeExport}).render(() => (
  <>
    <h1>${name}</h1>
  </>
));
`;
}

/**
 * Scaffolds a `layout.tsx` module.
 */
export function scaffoldLayoutTsx(opts: { framework: Framework; rel?: string; routeExport?: string }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];

  if (!opts.rel) {
    return `import { page } from '${pkg}';
import { rootRoute } from './route.js';

export default page(rootRoute).render(({ children }) => children);
`;
  }

  return `import { page } from '${pkg}';
import { ${opts.routeExport} } from './route.js';

export default page(${opts.routeExport}).render(({ children }) => children);
`;
}

/**
 * Scaffolds a `page.mdx` module with a frontmatter block.
 */
export function scaffoldPageMdx(opts: { segment: string }): string {
  const title = humanizeSegment(opts.segment);

  return `---
title: ${title}
---

# ${title}
`;
}

/**
 * Decides the scaffold content for a newly created page file, or `undefined`
 * when the file should not be scaffolded (unknown file type).
 *
 * The caller is responsible for the empty-file checks — this is a pure
 * decision function.
 */
export function scaffoldForFile(opts: {
  /** Page file base name (`page.tsx`, `layout.tsx`, `page.mdx`). */
  base: string;
  folder: FolderNode;
  framework: Framework;
  files?: FileMap;
}): string | undefined {
  const { base, folder, framework, files = DEFAULT_FILE_MAP } = opts;

  if (base === files.pageMdx || base === files.layoutMdx) {
    return scaffoldPageMdx({ segment: folder.segment });
  }

  if (base === files.layout) {
    if (!folder.rel) return scaffoldLayoutTsx({ framework });
    return scaffoldLayoutTsx({ framework, rel: folder.rel, routeExport: deriveRouteName(folder.rel) });
  }

  if (base === files.page) {
    return scaffoldPageTsx({ framework, rel: folder.rel, routeExport: routeExportForFolder(folder) });
  }

  return undefined;
}
