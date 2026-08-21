import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withIsolation } from '@airlib/core';
import { afterEach, describe, expect, it } from 'vitest';
import { Route } from '../../router/src/index.js';
import { DEFAULT_FILE_MAP, importSpecifier } from '../src/utils/mapper.js';
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
    expect(content).toContain("import parentRoute from '../route.js';");
    expect(content).toContain('/** AirLib managed */');
    expect(content).toContain("const route = parentRoute.route('/blogs');");
    expect(content).toContain('export const blogsRoute = route;');
    expect(content).toContain('export default blogsRoute;');
    expect(content).not.toContain('IndexRoute');
  });

  it('adds an index route when a page folder has a layout', () => {
    boot({ 'pages/about/page.tsx': '', 'pages/about/layout.tsx': '' });

    const content = route('about');
    expect(content).toContain("const route = parentRoute.route('/about');");
    expect(content).toContain("const indexRoute = route.route('/');");
    expect(content).toContain('export const aboutRoute = route;');
    expect(content).toContain('export const aboutIndexRoute = indexRoute;');
  });

  it('auto-scaffolds a layout when a page folder has children and adds an index route', () => {
    boot({ 'pages/blogs/page.tsx': '', 'pages/blogs/[slug]/page.tsx': '' });

    const blogs = route('blogs');
    expect(blogs).toContain("const route = parentRoute.route('/blogs');");
    expect(blogs).toContain("const indexRoute = route.route('/');");
    expect(blogs).toContain('export const blogsRoute = route;');
    expect(blogs).toContain('export const blogsIndexRoute = indexRoute;');
    expect(fixtureExists(dir, 'pages/blogs/layout.tsx')).toBe(true);

    const detail = route('blogs/[slug]');
    expect(detail).toContain("import parentRoute from '../route.js';");
    expect(detail).toContain("const route = parentRoute.route('/:slug');");
    expect(detail).toContain('export const DynamicRoute = route;');
    expect(detail).not.toContain('IndexRoute');
  });

  it('attaches a layout-only folder without an index route', () => {
    boot({ 'pages/admin/layout.tsx': '' });

    const content = route('admin');
    expect(content).toContain("const route = parentRoute.route('/admin');");
    expect(content).toContain('export const adminRoute = route;');
    expect(content).not.toContain('IndexRoute');
  });

  it('gives a structural folder its own route file so descendants can chain', () => {
    boot({ 'pages/docs/getting-started/page.tsx': '' });

    const docs = route('docs');
    expect(docs).toContain("const route = parentRoute.route('/docs');");
    expect(docs).toContain('export const docsRoute = route;');
    expect(docs).not.toContain('IndexRoute');

    const started = route('docs/getting-started');
    expect(started).toContain("import parentRoute from '../route.js';");
    expect(started).toContain("const route = parentRoute.route('/getting-started');");
    expect(started).toContain('export const gettingStartedRoute = route;');
  });

  it('derives dynamic segments, recursing through nested dynamics', () => {
    boot({ 'pages/blogs/[slug]/[tab]/page.tsx': '' });

    const slug = route('blogs/[slug]');
    expect(slug).toContain("const route = parentRoute.route('/:slug');");
    expect(slug).toContain('export const DynamicRoute = route;');

    const tab = route('blogs/[slug]/[tab]');
    expect(tab).toContain("import parentRoute from '../route.js';");
    expect(tab).toContain("const route = parentRoute.route('/:tab');");
    expect(tab).toContain('export const DynamicRoute = route;');
  });

  it('derives a wildcard segment for catch-all folders', () => {
    boot({ 'pages/[...rest]/page.tsx': '' });

    const content = route('[...rest]');
    expect(content).toContain("const route = parentRoute.route('/*rest');");
    expect(content).toContain('export const DynamicRoute = route;');
  });

  it('binds a root page to rootRoute when no root layout exists', () => {
    boot({ 'pages/page.tsx': '' });

    const content = route('');
    expect(content).toContain("import router from '../router.js';");
    expect(content).toContain('const route = router.route();');
    expect(content).toContain('export const rootRoute = route;');
    expect(content).not.toContain('IndexRoute');
  });

  it('binds a root page to indexRoute when a root layout exists', () => {
    boot({ 'pages/page.tsx': '', 'pages/layout.tsx': '' });

    const content = route('');
    expect(content).toContain('const route = router.route();');
    expect(content).toContain("const indexRoute = route.route('/');");
    expect(content).toContain('export const rootRoute = route;');
    expect(content).toContain('export const rootIndexRoute = indexRoute;');
  });

  it('emits a root route file even when the root has no page', () => {
    boot({ 'pages/blogs/page.tsx': '' });

    const root = route('');
    expect(root).toContain("import router from '../router.js';");
    expect(root).toContain('const route = router.route();');
    expect(root).toContain('export const rootRoute = route;');
    expect(root).toContain('export default rootRoute;');
    expect(root).not.toContain('IndexRoute');

    const blogs = route('blogs');
    expect(blogs).toContain("import parentRoute from '../route.js';");
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
      'pages/api/v1.page.tsx': '',
      'pages/api/v2.page.mdx': '',
    });

    const root = route('');
    expect(root).toContain("const v1Route = route.route('/v1');");
    expect(root).toContain("const v2Route = route.route('/v2');");
    expect(root).toContain('export const rootV1Route = v1Route;');
    expect(root).toContain('export const rootV2Route = v2Route;');

    const api = route('api');
    expect(api).toContain("const v1Route = route.route('/v1');");
    expect(api).toContain("const v2Route = route.route('/v2');");
    expect(api).toContain('export const apiV1Route = v1Route;');
    expect(api).toContain('export const apiV2Route = v2Route;');
  });

  it('derives named routes from a custom file map', () => {
    dir = makeFixture({
      'pages/teams.screen.tsx': '',
      'pages/team.screen.mdx': '',
    });
    app = makeApp(dir, {
      fileMap: {
        ...DEFAULT_FILE_MAP,
        page: 'screen.tsx',
        pageMdx: 'screen.mdx',
      },
    });

    const content = route('');
    expect(content).toContain("const teamsRoute = route.route('/teams');");
    expect(content).toContain("const teamRoute = route.route('/team');");
    expect(content).toContain('export const rootTeamsRoute = teamsRoute;');
    expect(content).toContain('export const rootTeamRoute = teamRoute;');
    expect(content).not.toContain('pageRoute');
  });

  it('removes named routes when named pages are removed', () => {
    boot({
      'pages/v1.page.tsx': '',
    });

    const root = route('');
    expect(root).toContain('export const rootV1Route = v1Route;');

    app?.rootFolder.handleFileRemoved('v1.page.tsx');

    const newRoot = route('');
    expect(newRoot).not.toContain('export const rootV1Route');
  });

  it('adds named routes when named pages are dynamically added', () => {
    boot({
      'pages/page.tsx': '',
    });

    const root = route('');
    expect(root).not.toContain('export const rootV1Route');

    app?.rootFolder.handleFileAdded('v1.page.tsx');

    const newRoot = route('');
    expect(newRoot).toContain('export const rootV1Route = v1Route;');
  });

  it('fails gracefully when adding or removing a named page without a route file', async () => {
    boot({
      'pages/page.tsx': '',
      'pages/v1.page.tsx': '',
    });

    const routeFilePath = fixturePath(dir, 'pages/route.ts');
    const fs = await import('node:fs');
    fs.unlinkSync(routeFilePath);

    // Without a route file there is nothing to maintain — the events are no-ops.
    expect(() => {
      app?.rootFolder.handleFileAdded('v2.page.tsx');
      app?.rootFolder.handleFileRemoved('v1.page.tsx');
    }).not.toThrow();
  });

  it('handles nested named pages edge cases correctly', async () => {
    boot({
      'pages/api/page.tsx': '',
    });

    const apiFolder = app?.rootFolder.children.get('api');

    const fs = await import('node:fs');
    const routeFilePath = fixturePath(dir, 'pages/api/route.ts');

    // 1. A named page added while running gets its route export.
    apiFolder?.handleFileAdded('v1.page.tsx');
    let content = fs.readFileSync(routeFilePath, 'utf-8');
    expect(content).toContain('export const apiV1Route = v1Route;');

    // 2. Adding the same named page again is a no-op — no duplicate export.
    apiFolder?.handleFileAdded('v1.page.tsx');
    content = fs.readFileSync(routeFilePath, 'utf-8');
    expect(content.split('export const apiV1Route').length - 1).toBe(1);

    // 3. Removing the named page removes its route export.
    apiFolder?.handleFileRemoved('v1.page.tsx');
    content = fs.readFileSync(routeFilePath, 'utf-8');
    expect(content).not.toContain('export const apiV1Route');

    // 4. User code survives and export is filled
    fs.writeFileSync(routeFilePath, 'export const somethingElse = {};');
    expect(() => apiFolder?.handleFileAdded('v2.page.tsx')).not.toThrow();
    const after = fs.readFileSync(routeFilePath, 'utf-8');
    expect(after).toContain('export const somethingElse = {};');
    expect(after).toContain('export const apiV2Route = v2Route;');
  });

  it('executes the generated tree against a real router', { timeout: 20000 }, async () => {
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
      expect(root.rootIndexRoute).toBeInstanceOf(Route);
      expect(root.rootIndexRoute.path).toBe('/');
      expect(blogs.blogsIndexRoute.path).toBe('/blogs/');
      expect(detail.DynamicRoute.path).toBe('/blogs/:slug');
      expect(about.aboutIndexRoute.path).toBe('/about/');
      expect(users.usersRoute.path).toBe('/admin/users');
      expect(started.gettingStartedRoute.path).toBe('/docs/getting-started');
      expect(rest.DynamicRoute.path).toBe('/*rest');

      const last = (url: string) => router.find(url)?.segments.at(-1)?.route;

      expect(last('/')).toBe(root.rootIndexRoute);
      expect(last('/blogs')).toBe(blogs.blogsIndexRoute);
      expect(last('/about')).toBe(about.aboutIndexRoute);
      expect(last('/admin/users')).toBe(users.usersRoute);
      expect(last('/docs/getting-started')).toBe(started.gettingStartedRoute);

      const post = router.find('/blogs/hello-world');
      expect(post?.segments.at(-1)?.route).toBe(detail.DynamicRoute);
      expect(post?.params).toMatchObject({ slug: 'hello-world' });

      // Wildcard matches surface under the '*' key as a segment array.
      const missing = router.find('/totally/missing');
      expect(missing?.segments.at(-1)?.route).toBe(rest.DynamicRoute);
      expect(missing?.params).toMatchObject({ '*': ['totally', 'missing'] });
    });
  });
});
