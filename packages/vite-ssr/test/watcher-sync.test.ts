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
import { makeApp, readManifest } from './make-sync.js';

describe('watcher sync — folder edits stay in sync', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('generates a route file when a page folder is added', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });

    app = makeApp(dir);
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(false);

    const blogsDir = fixturePath(dir, 'pages/blogs');
    fs.mkdirSync(blogsDir, { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '');
    app.rootFolder.handleChildAdded('blogs', blogsDir);

    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export const blogsRoute = route;');
  });

  it('leaves untouched folders byte-identical when a sibling is added', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });

    app = makeApp(dir);

    const before = readFixture(dir, 'pages/about/route.ts');
    const beforeMtime = fs.statSync(fixturePath(dir, 'pages/about/route.ts')).mtimeMs;

    const blogsDir = fixturePath(dir, 'pages/blogs');
    fs.mkdirSync(blogsDir, { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '');
    app.rootFolder.handleChildAdded('blogs', blogsDir);

    expect(readFixture(dir, 'pages/about/route.ts')).toBe(before);
    expect(fs.statSync(fixturePath(dir, 'pages/about/route.ts')).mtimeMs).toBe(beforeMtime);
  });

  it('preserves a user-land route file when its page is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    removeFixture(dir, 'pages/blogs/page.tsx');
    app.rootFolder.children.get('blogs')?.handleFileRemoved('page.tsx');

    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);
  });

  it('injects the index route when a page is added after a layout', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/layout.tsx': '' });

    app = makeApp(dir);

    const initialRoute = readFixture(dir, 'pages/projects/route.ts');
    expect(initialRoute).toContain('export const projectsRoute = route;');
    expect(initialRoute).not.toContain('projectsIndexRoute');

    writeFixture(dir, { 'pages/projects/page.tsx': '' });
    app.rootFolder.children.get('projects')?.handleFileAdded('page.tsx');

    const updatedRoute = readFixture(dir, 'pages/projects/route.ts');
    expect(updatedRoute).toContain('export const projectsIndexRoute = indexRoute;');
    // The injected export sits right after the base route export.
    expect(updatedRoute.indexOf('export const projectsRoute')).toBeLessThan(
      updatedRoute.indexOf('export const projectsIndexRoute')
    );
  });

  it('removes the index route when the layout is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '', 'pages/projects/layout.tsx': '' });

    app = makeApp(dir);
    expect(readFixture(dir, 'pages/projects/route.ts')).toContain('projectsIndexRoute');

    removeFixture(dir, 'pages/projects/layout.tsx');
    app.rootFolder.children.get('projects')?.handleFileRemoved('layout.tsx');

    expect(readFixture(dir, 'pages/projects/route.ts')).not.toContain('projectsIndexRoute');
  });

  it('regenerates metadata when an mdx file changes', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: "Guide"\n---\n# Guide\n' });

    app = makeApp(dir);
    expect(fixtureExists(dir, '.airlib/metadata/guide/page.ts')).toBe(true);

    writeFixture(dir, { 'pages/guide/page.mdx': '---\ntitle: "Updated Guide"\n---\n# Guide\n' });
    app.rootFolder.children.get('guide')?.handleFileChanged('page.mdx');

    expect(readFixture(dir, '.airlib/metadata/guide/page.ts')).toContain('Updated Guide');
  });

  it('updates the manifest when a page folder is added', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    expect(readManifest(dir)).not.toContain('aboutRoute');

    const aboutDir = fixturePath(dir, 'pages/about');
    fs.mkdirSync(aboutDir, { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/about/page.tsx'), '');
    app.rootFolder.handleChildAdded('about', aboutDir);

    expect(readManifest(dir)).toContain("{ path: '/about', route: aboutRoute },");
  });

  it('does not touch the user route.ts when a folder is renamed', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/blogs/page.tsx': '',
      'pages/blogs/[slug]/page.tsx': '',
    });

    app = makeApp(dir);
    const before = readFixture(dir, 'pages/blogs/route.ts');
    const childBefore = readFixture(dir, 'pages/blogs/[slug]/route.ts');

    fs.renameSync(fixturePath(dir, 'pages/blogs'), fixturePath(dir, 'pages/posts'));
    app.rootFolder.handleChildRemoved('blogs');
    app.rootFolder.handleChildAdded('posts', fixturePath(dir, 'pages/posts'));

    expect(readFixture(dir, 'pages/posts/route.ts')).toBe(before);
    expect(readFixture(dir, 'pages/posts/[slug]/route.ts')).toBe(childBefore);
  });
});
