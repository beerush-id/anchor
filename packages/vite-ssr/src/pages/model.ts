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
