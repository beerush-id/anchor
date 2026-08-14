import path from 'node:path';
import type { FolderNode } from '../modules/folder-node.js';
import { DEFAULT_FILE_MAP, deriveIndexName, deriveRouteName, type FileMap } from './mapper.js';

export type RouteKind = 'page' | 'layout' | 'named';

export type RouteTarget = {
  /** What kind of routable file this is. */
  kind: RouteKind;
  /** File base name, e.g. `page.mdx`. */
  base: string;
  /** The folder node the file belongs to. */
  folder: FolderNode;
  /** Exported route binding name in the folder's route file. */
  routeExport: string;
  /** Import specifier for the route file, ESM style (`./route.js`). */
  routeImport: string;
  /** Import specifier for the route file, source style (`./route.ts`). */
  routeFile: string;
};

/**
 * Resolves the route a page/layout file attaches to, purely from the scanned
 * folder tree — no filesystem access.
 *
 * Returns `undefined` when the file is not routable: not a page/layout/named
 * page, outside the pages directory, in an unknown folder, or an mdx page
 * shadowed by a `page.tsx` in the same folder (tsx wins).
 *
 * Consumed by every pipe that needs route information (chunk stubs, MDX route
 * attach) so route knowledge lives in exactly one place.
 */
export function resolveRouteTarget(opts: {
  /** Absolute file path (query suffix already stripped). */
  file: string;
  /** Absolute pages directory. */
  pagesDir: string;
  /** The current scanned folder tree. */
  tree: FolderNode;
  files?: Partial<FileMap>;
}): RouteTarget | undefined {
  const { file, pagesDir, tree } = opts;
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };

  const base = path.basename(file);
  const ext = path.extname(base);
  if (ext !== '.mdx' && ext !== '.tsx') return undefined;

  const isMdx = ext === '.mdx';
  const pageFile = isMdx ? files.pageMdx : files.page;
  const layoutFile = isMdx ? files.layoutMdx : files.layout;

  const isPage = base === pageFile;
  const isLayout = base === layoutFile;
  const isNamed = !isPage && base.endsWith(`.page${ext}`);

  if (!isPage && !isLayout && !isNamed) return undefined;
  if (!file.startsWith(pagesDir)) return undefined;

  const folder = tree.findNode(path.dirname(file));
  if (!folder) return undefined;

  // A tsx page wins over an mdx page in the same folder.
  if (isPage && isMdx && folder.files.has(files.page)) return undefined;

  const hasPage = folder.files.has(files.page) || folder.files.has(files.pageMdx);
  const hasLayout = folder.files.has(files.layout) || folder.files.has(files.layoutMdx);

  let kind: RouteKind;
  let routeExport: string;

  if (isLayout) {
    kind = 'layout';
    routeExport = !folder.rel ? 'rootRoute' : deriveRouteName(folder.rel);
  } else if (isNamed) {
    kind = 'named';
    const name = base.slice(0, base.length - `.page${ext}`.length);
    routeExport = deriveRouteName(folder.rel ? `${folder.rel}/${name}` : name);
  } else {
    kind = 'page';
    routeExport = !folder.rel
      ? hasPage && hasLayout
        ? 'indexRoute'
        : 'rootRoute'
      : hasPage && hasLayout
        ? deriveIndexName(folder.rel)
        : deriveRouteName(folder.rel);
  }

  return {
    kind,
    base,
    folder,
    routeExport,
    routeImport: `./${files.route.replace(/\.[^.]+$/, '.js')}`,
    routeFile: `./${files.route}`,
  };
}
