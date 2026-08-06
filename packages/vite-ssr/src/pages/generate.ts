import path from 'node:path';
import {
  DEFAULT_FILE_MAP,
  deriveIndexName,
  deriveRouteName,
  deriveSegment,
  type FileMap,
  type FolderNode,
  GENERATED_MARKER,
  importSpecifier,
  needsIndexRoute,
} from './model.js';

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
export function generateRouteFiles(opts: {
  root: FolderNode;
  routerFile: string;
  files?: Partial<FileMap>;
}): GeneratedFile[] {
  const { root, routerFile } = opts;
  const filesMap = { ...DEFAULT_FILE_MAP, ...opts.files };
  const routeFile = filesMap.route;
  const files: GeneratedFile[] = [];

  const emit = (node: FolderNode, lines: string[], indexRoute?: string) => {
    files.push({
      filePath: path.join(node.dir, routeFile),
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
        const routerImport = importSpecifier(path.join(node.dir, routeFile), routerFile);
        const importLine = `import router from '${routerImport}';`;
        lines.push(importLine, '');
        lines.push(`export const ${name} = router.add('/${segment}');`);
      } else {
        const parentName = !parent.rel ? 'rootRoute' : deriveRouteName(parent.rel);
        const importLine = `import ${parentName} from '../${routeFile.replace(/\.[^.]+$/, '.js')}';`;
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
      const routerImport = importSpecifier(path.join(node.dir, routeFile), routerFile);
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
