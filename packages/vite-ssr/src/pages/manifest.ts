import path from 'node:path';
import { FRAMEWORK_PACKAGE, type Framework, type GeneratedFile } from './generate.js';
import {
  canonicalPath,
  DEFAULT_FILE_MAP,
  deriveIndexName,
  deriveRouteName,
  type FileMap,
  type FolderNode,
  flattenTree,
  GENERATED_MARKER,
  importSpecifier,
  isContentNode,
  needsIndexRoute,
} from './model.js';

/**
 * Generates the route manifest for sidebars/menus/breadcrumbs.
 * Lists the content routes (pages, layouts, and irpc handoffs), giving each its route name
 * and importing it directly from the colocated `route.ts` module.
 */
export function generateManifest(opts: {
  root: FolderNode;
  manifestDir: string;
  framework: Framework;
  files?: Partial<FileMap>;
}): GeneratedFile[] {
  const { root, manifestDir, framework } = opts;
  const filesMap = { ...DEFAULT_FILE_MAP, ...opts.files };
  const routeFile = filesMap.route;
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
    const fromPath = importSpecifier(manifestFile, path.join(node.dir, routeFile));

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
