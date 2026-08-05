import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withIsolation } from '@anchorlib/core';
import { afterEach, describe, expect, it } from 'vitest';
import { Route } from '../../router/src/index.js';
import { type GeneratedFile, generateRouteFiles } from '../src/pages/generate.js';
import { importSpecifier, scanPages } from '../src/pages/model.js';
import { cleanFixture, fixturePath, makeFixture, PACKAGE_TMP, writeFixture } from './fixture.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function generate(dir: string): GeneratedFile[] {
  const tree = scanPages(fixturePath(dir, 'pages'));
  return generateRouteFiles({
    root: tree,
    routerFile: fixturePath(dir, 'router.ts'),
  });
}

function content(files: GeneratedFile[], dir: string, rel: string): string {
  return files.find((file) => file.filePath === fixturePath(dir, rel))?.content ?? '';
}

describe('route generation — folders define URLs', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('attaches a leaf page folder directly to its named route', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });
    const files = generate(dir);

    expect(files).toHaveLength(2);

    const route = content(files, dir, 'pages/blogs/route.ts');
    expect(route).toContain('// @generated');
    expect(route).toContain("import rootRoute from '../route.js';");
    expect(route).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    expect(route).toContain('export default blogsRoute;');
    expect(route).not.toContain('IndexRoute');
  });

  it('adds an index route when a page folder has a layout', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '', 'pages/about/layout.tsx': '' });
    const route = content(generate(dir), dir, 'pages/about/route.ts');

    expect(route).toContain("export const aboutRoute = rootRoute.route('/about');");
    expect(route).toContain("export const aboutIndexRoute = aboutRoute.route('/');");
  });

  it('adds an index route when a page folder has routed children', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '', 'pages/blogs/[slug]/page.tsx': '' });
    const files = generate(dir);

    const blogs = content(files, dir, 'pages/blogs/route.ts');
    expect(blogs).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    expect(blogs).toContain("export const blogsIndexRoute = blogsRoute.route('/');");

    const detail = content(files, dir, 'pages/blogs/[slug]/route.ts');
    expect(detail).toContain("import blogsRoute from '../route.js';");
    expect(detail).toContain("export const blogsDynamicRoute = blogsRoute.route('/:slug');");
    expect(detail).not.toContain('IndexRoute');
  });

  it('attaches a layout-only folder without an index route', () => {
    dir = makeFixture({ 'pages/admin/layout.tsx': '' });
    const route = content(generate(dir), dir, 'pages/admin/route.ts');

    expect(route).toContain("export const adminRoute = rootRoute.route('/admin');");
    expect(route).not.toContain('IndexRoute');
  });

  it('gives a structural folder its own route file so descendants can chain', () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.tsx': '' });
    const files = generate(dir);

    const docs = content(files, dir, 'pages/docs/route.ts');
    expect(docs).toContain("export const docsRoute = rootRoute.route('/docs');");
    expect(docs).not.toContain('IndexRoute');

    const started = content(files, dir, 'pages/docs/getting-started/route.ts');
    expect(started).toContain("import docsRoute from '../route.js';");
    expect(started).toContain("export const docsGettingStartedRoute = docsRoute.route('/getting-started');");
  });

  it('derives dynamic segments, recursing through nested dynamics', () => {
    dir = makeFixture({ 'pages/blogs/[slug]/[tab]/page.tsx': '' });
    const files = generate(dir);

    const slug = content(files, dir, 'pages/blogs/[slug]/route.ts');
    expect(slug).toContain("export const blogsDynamicRoute = blogsRoute.route('/:slug');");

    const tab = content(files, dir, 'pages/blogs/[slug]/[tab]/route.ts');
    expect(tab).toContain("import blogsDynamicRoute from '../route.js';");
    expect(tab).toContain("export const blogsDynamicDynamicRoute = blogsDynamicRoute.route('/:tab');");
  });

  it('derives a wildcard segment for catch-all folders', () => {
    dir = makeFixture({ 'pages/[...rest]/page.tsx': '' });
    const route = content(generate(dir), dir, 'pages/[...rest]/route.ts');

    expect(route).toContain("export const DynamicRoute = rootRoute.route('/*rest');");
  });

  it('exports root route for the root folder', () => {
    dir = makeFixture({ 'pages/page.tsx': '' });
    const files = generate(dir);
    expect(files).toHaveLength(1);

    const route = content(files, dir, 'pages/route.ts');
    expect(route).toContain("import router from '../router.js';");
    expect(route).toContain('export const rootRoute = router.route();');
    expect(route).toContain("export const indexRoute = rootRoute.route('/');");
  });

  it('emits a root route file even when the root has no page', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });
    const files = generate(dir);
    expect(files).toHaveLength(2);

    const rootRoute = content(files, dir, 'pages/route.ts');
    expect(rootRoute).toContain('export const rootRoute = router.route();');
    expect(rootRoute).toContain('export default rootRoute;');
    expect(rootRoute).not.toContain('indexRoute');

    const blogsRoute = content(files, dir, 'pages/blogs/route.ts');
    expect(blogsRoute).toContain("import rootRoute from '../route.js';");
  });

  it('ignores folders that only contain non-page files', () => {
    dir = makeFixture({
      'pages/blogs/Card.tsx': '// component\n',
      'pages/about/page.tsx': '',
    });
    const files = generate(dir);
    expect(files).toHaveLength(2);
    expect(content(files, dir, 'pages/blogs/route.ts')).toBe('');
    expect(content(files, dir, 'pages/about/route.ts')).toContain('aboutRoute');
  });

  it('routes a folder once when both page.tsx and page.mdx exist', () => {
    dir = makeFixture({ 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });
    const files = generate(dir);
    expect(files).toHaveLength(2);
    expect(content(files, dir, 'pages/docs/route.ts')).toContain('docsRoute');
  });

  it('emits a single root route file when the root has both page and layout', () => {
    dir = makeFixture({ 'pages/page.tsx': '', 'pages/layout.tsx': '' });
    const files = generate(dir);
    expect(files).toHaveLength(1);

    const route = content(files, dir, 'pages/route.ts');
    expect(route).toContain("export const indexRoute = rootRoute.route('/');");
    expect(route).not.toContain('IndexRoute');
  });

  it('executes the generated tree against a real router', async () => {
    dir = makeFixture(
      {
        'router.ts': '',
        'pages/page.tsx': '',
        'pages/blogs/page.tsx': '',
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
        'export const rootRoute = router.route();',
        '',
      ].join('\n'),
    });

    for (const file of generate(dir)) {
      writeFixture(dir, { [path.relative(dir, file.filePath)]: file.content });
    }

    const load = (rel: string) => import(pathToFileURL(fixturePath(dir, rel)).href);

    const { router } = await load('router.ts');
    const root = await load('pages/route.ts');
    const blogs = await load('pages/blogs/route.ts');
    const detail = await load('pages/blogs/[slug]/route.ts');
    const about = await load('pages/about/route.ts');
    const users = await load('pages/admin/users/route.ts');
    const docs = await load('pages/docs/route.ts');
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
      expect(docs.docsRoute.path).toBe('/docs');
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
