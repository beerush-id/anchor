import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { generateManifest } from '../src/pages/manifest.js';
import { scanPages } from '../src/pages/model.js';
import { cleanFixture, fixturePath, makeFixture, readFixture } from './fixture.js';
import { makeSync } from './make-sync.js';

function manifest(dir: string): string {
  const tree = scanPages(fixturePath(dir, 'pages'));
  const targetPath = fixturePath(dir, 'manifest/index.ts');
  const files = generateManifest({
    root: tree,
    manifestDir: fixturePath(dir, 'manifest'),
    framework: 'react',
  });
  return files.find((f) => f.filePath === targetPath)?.content ?? '';
}

describe('route manifest — manifests are generated', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('lists only folders that have pages or layouts', () => {
    dir = makeFixture({
      'pages/blogs/page.tsx': '',
      'pages/about/layout.tsx': '',
      'pages/admin/users/page.tsx': '',
    });

    const content = manifest(dir);
    expect(content).toContain("['/blogs', blogsRoute],");
    expect(content).toContain("['/about', aboutRoute],");
    expect(content).toContain("['/admin/users', adminUsersRoute],");
    expect(content).not.toContain("'/admin',");
  });

  it('prefers the index route for page folders with a layout or children', () => {
    dir = makeFixture({
      'pages/about/page.tsx': '',
      'pages/about/layout.tsx': '',
      'pages/blogs/page.tsx': '',
      'pages/blogs/[slug]/page.tsx': '',
    });

    const content = manifest(dir);
    expect(content).toContain("['/about', aboutIndexRoute],");
    expect(content).toContain("['/blogs', blogsIndexRoute],");
  });

  it('includes dynamic folders with their canonical path', () => {
    dir = makeFixture({ 'pages/blogs/[slug]/page.tsx': '' });

    expect(manifest(dir)).toContain("['/blogs/:slug', blogsDynamicRoute],");
  });

  it('excludes wildcard folders', () => {
    dir = makeFixture({
      'pages/blogs/page.tsx': '',
      'pages/[...rest]/page.tsx': '',
    });

    const content = manifest(dir);
    expect(content).toContain("['/blogs', blogsRoute],");
    expect(content).not.toContain('*rest');
    expect(content).not.toContain('DynamicRoute');
  });

  it('emits an empty tuple when there are no pages or layouts', () => {
    dir = makeFixture({ 'pages/about/constructor.ts': '' });

    expect(manifest(dir)).toContain('export const routes = createRouteManifest([]);');
  });

  it('imports the manifest factory and entries from their modules', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });

    const content = manifest(dir);
    expect(content).toContain("import { createRouteManifest } from '@anchorlib/react';");
    expect(content).toContain("import { blogsRoute } from '../pages/blogs/route.js';");
  });

  it('imports the manifest factory from the solid package for solid apps', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });

    const tree = scanPages(fixturePath(dir, 'pages'));
    const targetPath = fixturePath(dir, 'manifest/index.ts');
    const files = generateManifest({
      root: tree,
      manifestDir: fixturePath(dir, 'manifest'),
      framework: 'solid',
    });
    const content = files.find((f) => f.filePath === targetPath)?.content ?? '';

    expect(content).toContain("import { createRouteManifest } from '@anchorlib/solid';");
  });

  it('does not rewrite the manifest when nothing changed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();

    const first = fs.statSync(fixturePath(dir, 'manifest/index.ts')).mtimeMs;
    sync.refresh();
    const second = fs.statSync(fixturePath(dir, 'manifest/index.ts')).mtimeMs;

    expect(second).toBe(first);
    expect(readFixture(dir, 'manifest/index.ts')).toContain("['/blogs', blogsRoute],");
  });
});
