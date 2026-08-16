import path from 'node:path';
import type { Framework } from '../modules/env.js';

export type { Framework };

/** Header marker written on top of every generated file. */
export const GENERATED_MARKER = '// @generated';

/** Line markers written above generator-owned lines, naming what is protected. */
export const MARKER_IMPORT_NAME = '// @generated - do not edit the import name';
export const MARKER_VARIABLE_NAME = '// @generated - do not edit the variable name';
export const MARKER_DEFAULT = '// @generated - do not edit';

/** Pre-marker redesign form of `MARKER_DEFAULT`, still found in older files. */
export const LEGACY_DEFAULT_MARKER = '// @generated — do not edit';

export const FRAMEWORK_PACKAGE: Record<Framework, string> = {
  react: '@anchorlib/react',
  solid: '@anchorlib/solid',
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

/**
 * The route export name for a leaf segment (`members` → `membersRoute`,
 * `[slug]` → `DynamicRoute`). Generated names are short and local, never
 * accumulated from the full folder path.
 */
export function deriveRouteName(segment: string): string {
  return `${camelizeSegment(segment)}Route`;
}

/** The index route export name for a leaf segment (`members` → `membersIndexRoute`). */
export function deriveIndexName(segment: string): string {
  return `${camelizeSegment(segment)}IndexRoute`;
}

/**
 * The route export name for a named page (`teams.page.tsx` inside
 * `about/company` → `companyTeamsRoute`). A named page has no folder of its
 * own, so the name chains the parent folder's leaf segment with the page name
 * — the same leaf-derived style as the folder's own route name.
 */
export function deriveNamedRouteName(folderSegment: string, pageName: string): string {
  const rel = folderSegment ? `${folderSegment}/${pageName}` : pageName;
  return `${derivePrefix(rel)}Route`;
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
