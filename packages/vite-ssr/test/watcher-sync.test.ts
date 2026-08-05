import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
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
});
