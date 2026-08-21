import path from 'node:path';
import type { Framework } from '../modules/env.js';

export type { Framework };

/** Header marker written on top of every generated file. */
export const GENERATED_MARKER = '// @generated';
export const MARKER_MANAGED = '/** AirLib managed */';
export const MARKER_VARIABLE_NAME = '// @generated - do not edit the variable name';
export const MARKER_DEFAULT = '// @generated - do not edit';

/** Pre-marker redesign form of `MARKER_DEFAULT`, still found in older files. */
export const LEGACY_DEFAULT_MARKER = '// @generated — do not edit';

export const FRAMEWORK_PACKAGE: Record<Framework, string> = {
  react: '@airlib/react',
  solid: '@airlib/solid',
};

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
  ambient: string;
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
  ambient: 'global.d.ts',
};

export type PageKind = 'tsx' | 'mdx';

/**
 * Maps a folder segment to its route segment: `[x]` → `:x`, `[...x]` → `*x`.
 */
export function deriveSegment(segment: string): string {
  if (segment.startsWith('[...')) return `*${segment.slice(4, -1)}`;
  if (segment.startsWith('[')) return `:${segment.slice(1, -1)}`;
  return segment;
}

/**
 * Derives the export-name prefix for a full folder path (camelCase):
 * `admin/users` → `adminUsers`, `docs/getting-started` → `docsGettingStarted`.
 * Used for metadata variable names, which must stay unique across nesting.
 */
export function derivePrefix(rel: string): string {
  if (!rel) return '';

  let prefix = '';

  for (const segment of rel.split('/')) {
    prefix += camelizeSegment(segment, prefix);
  }

  return prefix;
}

export const ROOT_NAME = 'root';
export const ROUTE_SUFFIX = 'Route';
export const INDEX_SUFFIX = 'IndexRoute';
export const META_SUFFIX = 'Meta';

/**
 * The route export name for a leaf segment (`members` → `membersRoute`,
 * `[slug]` → `DynamicRoute`, root → `rootRoute`). Generated names are short and local, never
 * accumulated from the full folder path.
 */
export function deriveRouteName(segment: string, suffix = ROUTE_SUFFIX): string {
  return `${camelizeSegment(segment || ROOT_NAME)}${suffix}`;
}

/** The index route export name for a leaf segment (`members` → `membersIndexRoute`, root → `rootIndexRoute`). */
export function deriveIndexName(segment: string, suffix = INDEX_SUFFIX): string {
  return `${camelizeSegment(segment || ROOT_NAME)}${suffix}`;
}

/**
 * The route export name for a named page (`teams.page.tsx` inside
 * `about/company` → `companyTeamsRoute`, root `v1.page.tsx` → `rootV1Route`).
 */
export function deriveNamedRouteName(folderSegment: string, pageName: string, suffix = ROUTE_SUFFIX): string {
  const rel = folderSegment ? `${folderSegment}/${pageName}` : `${ROOT_NAME}/${pageName}`;
  return `${derivePrefix(rel)}${suffix}`;
}

export function deriveLocalRouteName(pageName: string, suffix = ROUTE_SUFFIX): string {
  return `${camelizeSegment(pageName)}${suffix}`;
}

/**
 * Whether a file is a named page: a custom name before the configured page
 * base (`teams.page.tsx` when pages are `page.tsx`). The plain page base
 * itself is not a named page.
 */
export function isNamedPage(file: string, fileMap: FileMap): boolean {
  return (
    (file !== fileMap.page && file.endsWith(`.${fileMap.page}`)) ||
    (file !== fileMap.pageMdx && file.endsWith(`.${fileMap.pageMdx}`))
  );
}

/** Strips the configured page base (`teams.page.tsx` → `teams`). */
export function namedPageName(file: string, fileMap: FileMap): string {
  if (file.endsWith(`.${fileMap.page}`)) return file.slice(0, -(fileMap.page.length + 1));
  if (file.endsWith(`.${fileMap.pageMdx}`)) return file.slice(0, -(fileMap.pageMdx.length + 1));
  return file;
}

/**
 * The meta import variable name for a folder route segment:
 * `members` → `membersMeta`, `docs` → `docsMeta`, root → `pageMeta`.
 */
export function deriveMetaName(segment: string, suffix = META_SUFFIX): string {
  if (!segment) return `page${suffix}`;
  return `${camelizeSegment(segment)}${suffix}`;
}

/**
 * The meta import variable name for an index route segment:
 * `members` → `membersIndexMeta`, `docs` → `docsIndexMeta`, root → `pageMeta`.
 */
export function deriveIndexMetaName(segment: string, suffix = META_SUFFIX): string {
  if (!segment) return `page${suffix}`;
  return `${camelizeSegment(segment)}Index${suffix}`;
}

/**
 * The meta import variable name for a named page:
 * `components` + `badge` → `componentsBadgeMeta`,
 * `docs` + `getting-started` → `docsGettingStartedMeta`,
 * root + `guide` → `guideMeta`.
 */
export function deriveNamedMetaName(folderSegment: string, pageName: string, suffix = META_SUFFIX): string {
  const rel = folderSegment ? `${folderSegment}/${pageName}` : pageName;
  return `${derivePrefix(rel) || ROOT_NAME}${suffix}`;
}

/** Camel-cases a single folder segment into an identifier prefix. */
function camelizeSegment(segment: string, prefix = ''): string {
  if (segment.startsWith('[')) return 'Dynamic';

  const camel = segment
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

  if (!camel) return '';

  const word = camel.charAt(0).toLowerCase() + camel.slice(1);
  return prefix ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** The canonical URL path for a folder (`blogs/[slug]` → `/blogs/:slug`, root → `/`). */
export function canonicalPath(rel: string): string {
  if (!rel) return '/';
  return `/${rel.split('/').map(deriveSegment).join('/')}`;
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
