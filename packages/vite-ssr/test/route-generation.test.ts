import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withIsolation } from '@anchorlib/core';
import { afterEach, describe, expect, it } from 'vitest';
import { Route } from '../../router/src/index.js';
import { importSpecifier } from '../src/pages/model.js';
import {
  cleanFixture,
  fixtureExists,
  fixturePath,
  makeFixture,
  PACKAGE_TMP,
  readFixture,
  writeFixture,
} from './fixture.js';
import { makeApp } from './make-sync.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('route generation — folders define URLs', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  /** Boots AppNode over the current fixture and returns the fixture root. */
  function boot(files: Parameters<typeof makeFixture>[0]) {
    dir = makeFixture(files);
    app = makeApp(dir);
    return dir;
  }

  function route(rel: string): string {
    return readFixture(dir, rel ? `pages/${rel}/route.ts` : 'pages/route.ts');
  }

  it('attaches a leaf page folder directly to its named route', () => {
    boot({ 'pages/blogs/page.tsx': '' });

    const content = route('blogs');
    expect(content).toContain("import rootRoute from '../route.js';");
    expect(content).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    expect(content).toContain('export default blogsRoute;');
    expect(content).not.toContain('IndexRoute');
  });

  it('adds an index route when a page folder has a layout', () => {
    boot({ 'pages/about/page.tsx': '', 'pages/about/layout.tsx': '' });

    const content = route('about');
    expect(content).toContain("export const aboutRoute = rootRoute.route('/about');");
    expect(content).toContain("export const aboutIndexRoute = aboutRoute.route('/');");
  });

  it('keeps a page folder without a layout bound to the base route', () => {
    boot({ 'pages/blogs/page.tsx': '', 'pages/blogs/[slug]/page.tsx': '' });

    const blogs = route('blogs');
    expect(blogs).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    expect(blogs).not.toContain('IndexRoute');

    const detail = route('blogs/[slug]');
    expect(detail).toContain("import blogsRoute from '../route.js';");
    expect(detail).toContain("export const blogsDynamicRoute = blogsRoute.route('/:slug');");
    expect(detail).not.toContain('IndexRoute');
  });

  it('attaches a layout-only folder without an index route', () => {
    boot({ 'pages/admin/layout.tsx': '' });

    const content = route('admin');
    expect(content).toContain("export const adminRoute = rootRoute.route('/admin');");
    expect(content).not.toContain('IndexRoute');
  });

  it('gives a structural folder its own route file so descendants can chain', () => {
    boot({ 'pages/docs/getting-started/page.tsx': '' });

    const docs = route('docs');
    expect(docs).toContain("export const docsRoute = rootRoute.route('/docs');");
    expect(docs).not.toContain('IndexRoute');

    const started = route('docs/getting-started');
    expect(started).toContain("import docsRoute from '../route.js';");
    expect(started).toContain("export const docsGettingStartedRoute = docsRoute.route('/getting-started');");
  });

  it('derives dynamic segments, recursing through nested dynamics', () => {
    boot({ 'pages/blogs/[slug]/[tab]/page.tsx': '' });

    const slug = route('blogs/[slug]');
    expect(slug).toContain("export const blogsDynamicRoute = blogsRoute.route('/:slug');");

    const tab = route('blogs/[slug]/[tab]');
    expect(tab).toContain("import blogsDynamicRoute from '../route.js';");
    expect(tab).toContain("export const blogsDynamicDynamicRoute = blogsDynamicRoute.route('/:tab');");
  });

  it('derives a wildcard segment for catch-all folders', () => {
    boot({ 'pages/[...rest]/page.tsx': '' });

    const content = route('[...rest]');
    expect(content).toContain("export const DynamicRoute = rootRoute.route('/*rest');");
  });

  it('binds a root page to rootRoute when no root layout exists', () => {
    boot({ 'pages/page.tsx': '' });

    const content = route('');
    expect(content).toContain("import router from '../router.js';");
    expect(content).toContain('export const rootRoute = router.route();');
    expect(content).not.toContain('indexRoute');
  });

  it('binds a root page to indexRoute when a root layout exists', () => {
    boot({ 'pages/page.tsx': '', 'pages/layout.tsx': '' });

    const content = route('');
    expect(content).toContain('export const rootRoute = router.route();');
    expect(content).toContain("export const indexRoute = rootRoute.route('/');");
  });

  it('emits a root route file even when the root has no page', () => {
    boot({ 'pages/blogs/page.tsx': '' });

    const root = route('');
    expect(root).toContain("import router from '../router.js';");
    expect(root).toContain('export const rootRoute = router.route();');
    expect(root).toContain('export default rootRoute;');
    expect(root).not.toContain('indexRoute');

    const blogs = route('blogs');
    expect(blogs).toContain("import rootRoute from '../route.js';");
  });

  it('ignores folders that only contain non-page files', () => {
    boot({ 'pages/blogs/Card.tsx': '// component\n', 'pages/about/page.tsx': '' });

    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(false);
    expect(route('about')).toContain('aboutRoute');
  });

  it('routes a folder once when both page.tsx and page.mdx exist', () => {
    boot({ 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });

    expect(route('docs')).toContain('docsRoute');
  });

  it('generates named routes for named pages', () => {
    boot({
      'pages/v1.page.tsx': '',
      'pages/v2.page.mdx': '',
      'pages/api/v1.page.ts': '',
      'pages/api/v2.page.mdx': '',
    });

    const root = route('');
    expect(root).toContain("export const v1Route = rootRoute.route('/v1');");
    expect(root).toContain("export const v2Route = rootRoute.route('/v2');");

    const api = route('api');
    expect(api).toContain("export const apiV1Route = apiRoute.route('/v1');");
    expect(api).toContain("export const apiV2Route = apiRoute.route('/v2');");
  });

  it('removes named routes when named pages are removed', () => {
    boot({
      'pages/v1.page.tsx': '',
    });

    const root = route('');
    expect(root).toContain("export const v1Route = rootRoute.route('/v1');");

    app?.rootFolder.handleFileRemoved('v1.page.tsx');

    const newRoot = route('');
    expect(newRoot).not.toContain("export const v1Route = rootRoute.route('/v1');");
  });

  it('adds named routes when named pages are dynamically added', () => {
    boot({
      'pages/page.tsx': '',
    });

    const root = route('');
    expect(root).not.toContain("export const v1Route = rootRoute.route('/v1');");

    app?.rootFolder.handleFileAdded('v1.page.tsx');

    const newRoot = route('');
    expect(newRoot).toContain("export const v1Route = rootRoute.route('/v1');");
  });

  it('fails gracefully when adding or removing a named page without a route file', async () => {
    boot({
      'pages/page.tsx': '',
      'pages/v1.page.tsx': '',
    });

    const routeFilePath = fixturePath(dir, 'pages/route.ts');
    const fs = await import('node:fs');
    fs.unlinkSync(routeFilePath);

    const routeNode = app?.rootRoute as any;
    expect(() => {
      routeNode.ensureNamedRoute('v2.page.tsx');
      routeNode.removeNamedRoute('v1.page.tsx');
    }).not.toThrow();
  });

  it('handles nested named pages edge cases correctly', async () => {
    boot({
      'pages/api/page.tsx': '',
    });

    const apiFolder = app?.rootFolder.children.get('api');
    const apiRoute = app?.rootRoute?.children.get('api') as any;

    const fs = await import('node:fs');
    const routeFilePath = fixturePath(dir, 'pages/api/route.ts');

    // 1. Add named route successfully
    apiFolder?.handleFileAdded('v1.page.tsx');
    let content = fs.readFileSync(routeFilePath, 'utf-8');
    expect(content).toContain("export const apiV1Route = apiRoute.route('/v1');");

    // 2. Add same named route again (hits return false if includes)
    expect(apiRoute.ensureNamedRoute('v1.page.tsx')).toBe(false);

    // 3. Remove named route that does not exist (hits return false if idx === -1)
    expect(apiRoute.removeNamedRoute('v2.page.tsx')).toBe(false);

    // 4. Corrupt the file so the base route is missing (hits baseIdx === -1)
    fs.writeFileSync(routeFilePath, 'export const somethingElse = {};');
    expect(apiRoute.ensureNamedRoute('v2.page.tsx')).toBe(false);

    // 5. Normal remove
    apiFolder?.handleFileAdded('v3.page.tsx'); // This will recreate the file cleanly
    apiFolder?.handleFileRemoved('v3.page.tsx');
    content = fs.readFileSync(routeFilePath, 'utf-8');
    expect(content).not.toContain('export const apiV3Route');
  });

  it('executes the generated tree against a real router', async () => {
    dir = makeFixture(
      {
        'router.ts': '',
        'pages/page.tsx': '',
        'pages/layout.tsx': '',
        'pages/blogs/page.tsx': '',
        'pages/blogs/layout.tsx': '',
        'pages/blogs/[slug]/page.tsx': '',
        'pages/about/page.tsx': '',
        'pages/about/layout.tsx': '',
        'pages/admin/users/page.tsx': '',
        'pages/docs/getting-started/page.tsx': '',
        'pages/[...rest]/page.tsx': '',
      },
      PACKAGE_TMP
    );

    // The fixture imports the router SOURCE (the package dist may not exist).
    const routerFile = fixturePath(dir, 'router.ts');
    const routerSrc = path.resolve(here, '../../router/src/index.ts');
    writeFixture(dir, {
      'router.ts': [
        `import { createRouter } from '${importSpecifier(routerFile, routerSrc)}';`,
        '',
        'export const router = createRouter<unknown>();',
        'export default router;',
        '',
      ].join('\n'),
    });

    app = makeApp(dir);

    const load = (rel: string) => import(pathToFileURL(fixturePath(dir, rel)).href);

    const { router } = await load('router.ts');
    const root = await load('pages/route.ts');
    const blogs = await load('pages/blogs/route.ts');
    const detail = await load('pages/blogs/[slug]/route.ts');
    const about = await load('pages/about/route.ts');
    const users = await load('pages/admin/users/route.ts');
    const started = await load('pages/docs/getting-started/route.ts');
    const rest = await load('pages/[...rest]/route.ts');

    await withIsolation(() => {
      // Route.path composes an index route as `<parent>/` — trailing slash.
      expect(root.indexRoute).toBeInstanceOf(Route);
      expect(root.indexRoute.path).toBe('/');
      expect(blogs.blogsIndexRoute.path).toBe('/blogs/');
      expect(detail.blogsDynamicRoute.path).toBe('/blogs/:slug');
      expect(about.aboutIndexRoute.path).toBe('/about/');
      expect(users.adminUsersRoute.path).toBe('/admin/users');
      expect(started.docsGettingStartedRoute.path).toBe('/docs/getting-started');
      expect(rest.DynamicRoute.path).toBe('/*rest');

      const last = (url: string) => router.find(url)?.segments.at(-1)?.route;

      expect(last('/')).toBe(root.indexRoute);
      expect(last('/blogs')).toBe(blogs.blogsIndexRoute);
      expect(last('/about')).toBe(about.aboutIndexRoute);
      expect(last('/admin/users')).toBe(users.adminUsersRoute);
      expect(last('/docs/getting-started')).toBe(started.docsGettingStartedRoute);

      const post = router.find('/blogs/hello-world');
      expect(post?.segments.at(-1)?.route).toBe(detail.blogsDynamicRoute);
      expect(post?.params).toMatchObject({ slug: 'hello-world' });

      // Wildcard matches surface under the '*' key as a segment array.
      const missing = router.find('/totally/missing');
      expect(missing?.segments.at(-1)?.route).toBe(rest.DynamicRoute);
      expect(missing?.params).toMatchObject({ '*': ['totally', 'missing'] });
    });
  });
});
