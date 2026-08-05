import fs from 'node:fs';
import path from 'node:path';

/** Header marker written on top of every generated file. */
export const GENERATED_MARKER = '// @generated — do not edit';

export type FileMap = {
  page: string;
  pageMdx: string;
  layout: string;
  layoutMdx: string;
  route: string;
  constructor: string;
  entry: string;
  client: string;
  workerEntry: string;
};

export const DEFAULT_FILE_MAP: FileMap = {
  page: 'page.tsx',
  pageMdx: 'page.mdx',
  layout: 'layout.tsx',
  layoutMdx: 'layout.mdx',
  route: 'route.ts',
  constructor: 'constructor.ts',
  entry: 'app.tsx',
  client: 'client.tsx',
  workerEntry: 'worker.ts',
};

export type PageKind = 'tsx' | 'mdx';

/**
 * A folder inside the pages directory.
 */
export type FolderNode = {
  /** Absolute directory path. */
  dir: string;
  /** POSIX path relative to the pages dir ('' for the root folder). */
  rel: string;
  /** Folder name ('' for the root, 'blogs', '[slug]', '[...rest]'). */
  segment: string;
  /** `page.tsx` or `page.mdx` present (`page.tsx` wins when both exist). */
  page?: PageKind;
  /** `layout.tsx` present. */
  layout: boolean;
  /** `route.ts` present in this folder. */
  route: boolean;
  /** `constructor.ts` present (if irpc is enabled). */
  irpc: boolean;
  /** Child folders kept in the routable tree (empty branches are pruned). */
  children: FolderNode[];
};

/**
 * Tells whether a file is a page file relevant to the file router.
 */
export function isPageFile(file: string, files: FileMap = DEFAULT_FILE_MAP): boolean {
  const PAGE_FILES = new Set([files.page, files.pageMdx, files.layout, files.layoutMdx]);
  return PAGE_FILES.has(path.basename(file));
}

/**
 * Scans the pages directory and builds the routable folder tree.
 *
 * A folder is kept in the tree when it has a page/layout file, an irpc file,
 * or any kept descendant.
 *
 * @param pagesDir - Absolute path of the pages directory.
 * @param irpc - Whether to track `function.ts` and `constructor.ts`.
 * @param files - The file name mapping.
 * @returns The root folder node.
 */
export function scanPages(pagesDir: string, irpc?: boolean, files: FileMap = DEFAULT_FILE_MAP): FolderNode {
  const isRoutable = (node: FolderNode): boolean => {
    return Boolean(node.page || node.layout || node.irpc || node.children.length);
  };

  const build = (dir: string, rel: string, segment: string): FolderNode => {
    const node: FolderNode = {
      dir,
      rel,
      segment,
      layout: false,
      route: false,
      irpc: false,
      children: [],
    };

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return node;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const abs = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        node.children.push(build(abs, rel ? `${rel}/${entry.name}` : entry.name, entry.name));
      } else if (entry.isFile()) {
        if (entry.name === files.page) {
          node.page = 'tsx';
        } else if (entry.name === files.pageMdx) {
          if (!node.page) node.page = 'mdx';
        } else if (entry.name === files.layout) {
          node.layout = true;
        } else if (entry.name === files.layoutMdx) {
          node.layout = true;
        } else if (entry.name === files.route) {
          node.route = true;
        } else if (irpc && entry.name === files.constructor) {
          node.irpc = true;
        }
      }
    }

    node.children = node.children.filter(isRoutable);

    return node;
  };

  return build(pagesDir, '', '');
}

/**
 * Flattens a folder tree into a depth-first list (root included).
 */
export function flattenTree(root: FolderNode): FolderNode[] {
  const out: FolderNode[] = [root];
  for (const child of root.children) {
    out.push(...flattenTree(child));
  }
  return out;
}

/**
 * Finds the folder node for a directory path, given the scanned tree.
 */
export function findFolder(root: FolderNode, dir: string): FolderNode | undefined {
  if (root.dir === dir) return root;
  for (const child of root.children) {
    const found = findFolder(child, dir);
    if (found) return found;
  }
  return undefined;
}

/**
 * Maps a folder segment to its route segment: `[x]` → `:x`, `[...x]` → `*x`.
 */
export function deriveSegment(segment: string): string {
  if (segment.startsWith('[...')) return `*${segment.slice(4, -1)}`;
  if (segment.startsWith('[')) return `:${segment.slice(1, -1)}`;
  return segment;
}

/**
 * Derives the export-name prefix for a folder path.
 *
 * - Static folders join in camelCase: `admin/users` → `adminUsers`, `docs/getting-started` → `docsGettingStarted`.
 * - Dynamic folders take the parent prefix + `Dynamic`: `blogs/[slug]` → `blogsDynamic`.
 * - Nested dynamics recurse: `blogs/[slug]/[tab]` → `blogsDynamicDynamic`.
 */
export function derivePrefix(rel: string): string {
  if (!rel) return '';

  let prefix = '';

  for (const segment of rel.split('/')) {
    if (segment.startsWith('[')) {
      prefix = `${prefix}Dynamic`;
      continue;
    }

    const camel = segment
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

    if (!camel) continue;

    prefix += prefix ? camel.charAt(0).toUpperCase() + camel.slice(1) : camel.charAt(0).toLowerCase() + camel.slice(1);
  }

  return prefix;
}

/** The route export name for a folder (`blogs/[slug]` → `blogsDynamicRoute`). */
export function deriveRouteName(rel: string): string {
  return `${derivePrefix(rel)}Route`;
}

/** The index route export name for a folder (`blogs` → `blogsIndexRoute`). */
export function deriveIndexName(rel: string): string {
  return `${derivePrefix(rel)}IndexRoute`;
}

/** The canonical URL path for a folder (`blogs/[slug]` → `/blogs/:slug`, root → `/`). */
export function canonicalPath(rel: string): string {
  if (!rel) return '/';
  return `/${rel.split('/').map(deriveSegment).join('/')}`;
}

/**
 * Whether a folder's page attaches to an index child route:
 * the folder has a page AND (a layout OR routed child folders).
 */
export function needsIndexRoute(node: FolderNode): boolean {
  return Boolean(node.page && (node.layout || node.children.length));
}

/** Whether a folder is a content node for the route manifest (has a page or layout, no wildcard segments). */
export function isContentNode(node: FolderNode): boolean {
  if (!(node.page || node.layout)) return false;
  return !node.rel.split('/').some((segment) => segment.startsWith('[...'));
}

/**
 * The route export a folder's page/mdx module attaches to: `indexRoute` for
 * the root, `<name>IndexRoute` when the page needs an index child route,
 * `<name>Route` otherwise.
 */
export function routeExportForFolder(folder: FolderNode): string {
  if (!folder.rel) return 'indexRoute';
  return needsIndexRoute(folder) ? deriveIndexName(folder.rel) : deriveRouteName(folder.rel);
}

/** Humanizes a folder segment for scaffold titles (`getting-started` → `Getting Started`). */
export function humanizeSegment(segment: string): string {
  const clean = segment.replace(/[[\].]/g, '');
  const words = clean.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (!words.length) return 'Home';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/** Posix relative import specifier from one file to another, without extension, suffixed with `.js`. */
export function importSpecifier(fromFile: string, toFile: string): string {
  const dir = path.dirname(fromFile);
  let rel = path.relative(dir, toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return `${rel.replace(/\.[^./]+$/, '')}.js`;
}
