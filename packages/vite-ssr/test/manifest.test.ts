import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanFixture, fixturePath, makeFixture } from './fixture.js';
import { makeApp, readManifest } from './make-sync.js';

describe('route manifest — manifests are generated', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('lists only folders that have pages or layouts', () => {
    dir = makeFixture({
      'pages/blogs/page.tsx': '',
      'pages/about/layout.tsx': '',
      'pages/admin/users/page.tsx': '',
    });

    app = makeApp(dir);
    const content = readManifest(dir);

    expect(content).toContain('// @generated');
    expect(content).toContain("{ path: '/blogs', route: blogsRoute },");
    expect(content).toContain("{ path: '/about', route: aboutRoute },");
    // The structural `admin` folder itself is not a content node.
    expect(content).not.toContain("'/admin',");
  });

  it('prefers the index route for page folders with a layout', () => {
    dir = makeFixture({
      'pages/about/page.tsx': '',
      'pages/about/layout.tsx': '',
      'pages/blogs/page.tsx': '',
      'pages/blogs/layout.tsx': '',
    });

    app = makeApp(dir);
    const content = readManifest(dir);

    expect(content).toContain("{ path: '/about', route: aboutIndexRoute },");
    expect(content).toContain("{ path: '/blogs', route: blogsIndexRoute },");
  });

  it('includes dynamic folders with their canonical path at the owning level', () => {
    dir = makeFixture({ 'pages/blogs/[slug]/page.tsx': '' });

    app = makeApp(dir);
    // The dynamic route lives in the `blogs` level manifest, not the root one.
    const nested = readManifest(dir, 'blogs/index.ts');

    expect(nested).toContain("{ path: '/blogs/:slug', route: DynamicRoute },");
  });

  it('excludes wildcard folders', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '', 'pages/[...rest]/page.tsx': '' });

    app = makeApp(dir);
    const content = readManifest(dir);

    expect(content).toContain("{ path: '/blogs', route: blogsRoute },");
    expect(content).not.toContain('*rest');
    expect(content).not.toContain('DynamicRoute');
  });

  it('emits an empty list when nothing is content', () => {
    dir = makeFixture({ 'pages/about/constructor.ts': '' });

    app = makeApp(dir);

    // `export default [` and `];` are emitted on separate lines.
    expect(readManifest(dir)).toContain('export default [');
    expect(readManifest(dir)).toContain('];');
  });

  it('maps the root content page to the index route', () => {
    dir = makeFixture({ 'pages/page.tsx': '', 'pages/layout.tsx': '' });

    app = makeApp(dir);

    expect(readManifest(dir)).toContain("{ path: '/', route: rootIndexRoute },");
  });

  it('imports route entries from their generated modules', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);

    expect(readManifest(dir)).toContain("import { blogsRoute } from '../../pages/blogs/route.js';");
  });

  it('does not rewrite the manifest when nothing changed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    const first = fs.statSync(fixturePath(dir, '.airlib/manifest/index.ts')).mtimeMs;

    // A second boot over the same tree must not touch the generated file.
    // (Do not destroy the second app — ManifestNode.destroy unlinks the index.)
    makeApp(dir);

    const second = fs.statSync(fixturePath(dir, '.airlib/manifest/index.ts')).mtimeMs;
    expect(second).toBe(first);
    expect(readManifest(dir)).toContain("{ path: '/blogs', route: blogsRoute },");
  });

  it('adds entries when a folder is added while running', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    expect(readManifest(dir)).not.toContain('aboutRoute');

    const aboutDir = fixturePath(dir, 'pages/about');
    fs.mkdirSync(aboutDir, { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/about/page.tsx'), '');
    app.rootFolder.handleChildAdded('about', aboutDir);

    expect(readManifest(dir)).toContain("{ path: '/about', route: aboutRoute },");
  });

  it('adds named pages to the manifest', () => {
    dir = makeFixture({
      'pages/v1.page.tsx': '',
      'pages/release/v1.page.mdx': '',
    });

    app = makeApp(dir);

    // root manifest
    const rootContent = readManifest(dir);
    expect(rootContent).toContain("{ path: '/v1', route: rootV1Route },");
    expect(rootContent).not.toContain('releaseV1Route');

    // release manifest
    const releaseContent = readManifest(dir, 'release/index.ts');
    expect(releaseContent).toContain("{ path: '/release/v1', route: releaseV1Route },");
  });
});
