import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanFixture,
  fixtureExists,
  fixturePath,
  makeFixture,
  readFixture,
  removeFixture,
  writeFixture,
} from './fixture.js';
import { makeSync } from './make-sync.js';

describe('watcher sync — folder edits stay in sync', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('generates a route file when a page is added', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(false);

    writeFixture(dir, { 'pages/blogs/page.tsx': '' });
    sync.refresh();

    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain("export const blogsRoute = rootRoute.route('/blogs');");
  });

  it('leaves untouched folders byte-identical when a sibling is added', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();

    const before = readFixture(dir, 'pages/about/route.ts');
    const beforeMtime = fs.statSync(fixturePath(dir, 'pages/about/route.ts')).mtimeMs;

    writeFixture(dir, { 'pages/blogs/page.tsx': '' });
    sync.refresh();

    expect(readFixture(dir, 'pages/about/route.ts')).toBe(before);
    expect(fs.statSync(fixturePath(dir, 'pages/about/route.ts')).mtimeMs).toBe(beforeMtime);
  });

  it('preserves user-land route file when its page is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    removeFixture(dir, 'pages/blogs/page.tsx');
    sync.refresh();

    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);
  });

  it('surfaces a missing router file but still generates', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' }); // no router.ts

    const { sync, missing } = makeSync(dir);
    sync.refresh();

    expect(missing).toEqual(['router']);
    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain("from '../route.js';");
  });

  it('updates manifest on folder rename without modifying existing user-land route files', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/blogs/page.tsx': '',
      'pages/blogs/[slug]/page.tsx': '',
    });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(readFixture(dir, 'manifest/index.ts')).toContain("['/blogs/:slug', blogsDynamicRoute],");

    fs.renameSync(fixturePath(dir, 'pages/blogs'), fixturePath(dir, 'pages/posts'));
    sync.refresh();

    const posts = readFixture(dir, 'pages/posts/route.ts');
    expect(posts).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    expect(fixtureExists(dir, 'pages/blogs')).toBe(false);

    const manifest = readFixture(dir, 'manifest/index.ts');
    expect(manifest).toContain("['/posts', postsIndexRoute],");
    expect(manifest).toContain("['/posts/:slug', postsDynamicRoute],");
    expect(manifest).not.toContain('blogsDynamicRoute');
  });

  it('injects missing index route before generated marker when page.tsx is added after layout.tsx', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/layout.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();

    const initialRoute = readFixture(dir, 'pages/projects/route.ts');
    expect(initialRoute).toContain("export const projectsRoute = rootRoute.route('/projects');");
    expect(initialRoute).not.toContain('projectsIndexRoute');

    writeFixture(dir, { 'pages/projects/page.tsx': '' });
    sync.refresh();

    const updatedRoute = readFixture(dir, 'pages/projects/route.ts');
    expect(updatedRoute).toContain("export const projectsIndexRoute = projectsRoute.route('/');");
    expect(updatedRoute).toMatch(/export const projectsIndexRoute = projectsRoute\.route\('\/'\);\n+\/\/ @generated/);
  });

  it('handles metadata generation, localized onChange/onAdd/onUnlink events, and cleans up obsolete metadata files', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/guide/page.mdx': '---\ntitle: "Guide"\n---\n# Guide',
    });

    const metadataDir = fixturePath(dir, 'metadata');
    const { sync } = makeSync(dir, { metadataDir });

    sync.refresh();
    expect(fixtureExists(dir, 'metadata/guide/page.ts')).toBe(true);

    const absPath = fixturePath(dir, 'pages/guide/page.mdx');
    writeFixture(dir, { 'pages/guide/page.mdx': '---\ntitle: "Updated Guide"\n---\n# Guide' });
    const changed = sync.onChange(absPath);
    expect(changed).toBe(true);
    expect(readFixture(dir, 'metadata/guide/page.ts')).toContain('Updated Guide');

    expect(sync.onChange(fixturePath(dir, 'pages/guide/unrelated.txt'))).toBe(false);

    writeFixture(dir, { 'pages/new/page.mdx': '' });
    sync.onAdd(fixturePath(dir, 'pages/new/page.mdx'));
    expect(fixtureExists(dir, 'pages/new/route.ts')).toBe(true);

    removeFixture(dir, 'pages/guide/page.mdx');
    sync.onUnlink(absPath);
    expect(fixtureExists(dir, 'metadata/guide/page.ts')).toBe(false);

    writeFixture(dir, {
      'metadata/obsolete/stale.ts': 'export default {};',
      'metadata/package.json': '{"name": "metadata"}',
    });
    sync.refresh();
    expect(fixtureExists(dir, 'metadata/obsolete/stale.ts')).toBe(false);
    expect(fixtureExists(dir, 'metadata/package.json')).toBe(true);
  });

  it('handles missing metadata directories and file system deletion errors during cleanup or unlinking', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/test/page.mdx': '---\ntitle: "Test"\n---\n# Test' });
    const metadataDir = fixturePath(dir, 'metadata');
    const { sync } = makeSync(dir, { metadataDir });

    sync.refresh();

    const mdxPath = fixturePath(dir, 'pages/test/page.mdx');
    removeFixture(dir, 'metadata/test/page.ts');
    removeFixture(dir, 'pages/test/page.mdx');
    sync.onUnlink(mdxPath);
    expect(fixtureExists(dir, 'metadata/test/page.ts')).toBe(false);

    const emptyDir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    const { sync: noMdxSync } = makeSync(emptyDir, { metadataDir: fixturePath(emptyDir, 'non-existent-metadata') });
    expect(() => noMdxSync.refresh()).not.toThrow();
    cleanFixture(emptyDir);

    dir = makeFixture({ 'router.ts': '', 'pages/valid/page.mdx': '---\ntitle: "Valid"\n---\n# Valid' });
    const errSync = makeSync(dir, { metadataDir: fixturePath(dir, 'metadata') }).sync;
    errSync.refresh();

    writeFixture(dir, { 'metadata/stale-folder/stale.ts': 'export {};' });
    fs.mkdirSync(fixturePath(dir, 'metadata/stale-empty'), { recursive: true });

    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw new Error('mock unlink error');
    });
    const rmdirSpy = vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {
      throw new Error('mock rmdir error');
    });

    expect(() => errSync.refresh()).not.toThrow();
    unlinkSpy.mockRestore();
    rmdirSpy.mockRestore();

    const origExists = fs.existsSync;
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (typeof p === 'string' && p.endsWith('metadata')) return false;
      return origExists(p);
    });
    expect(() => errSync.refresh()).not.toThrow();
    existsSpy.mockRestore();
  });
});
