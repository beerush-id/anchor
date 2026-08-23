import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIR_ENV, DEFAULT_FILE_MAP } from '../src/modules/env.js';
import { MDX_DEFAULT_OPTIONS, airMdxHeadings, airMdxRehype, getLeafNode, loadExtendedPlugins, mdxEntryWrapper, mdxFile, mdxMatcher } from '../src/modules/markdown.js';
import {
  canonicalPath,
  derivePrefix,
  deriveRouteName,
  deriveSegment,
  humanizeSegment,
  importSpecifier,
  namedPageName,
} from '../src/utils/mapper.js';
import { scaffoldForFile } from '../src/utils/scaffold.js';
import { bootPackage, ensureSymlink, writeIfChanged } from '../src/utils/sync.js';
import { chokidarState } from './chokidar.js';
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

describe('coverage tests for unreached branches', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  describe('route-node branches', () => {
    it('generates router.add routes for top-level parenthesized route groups', () => {
      dir = makeFixture({ 'pages/(dashboard)/page.tsx': '' });

      app = makeApp(dir);

      const route = readFixture(dir, 'pages/(dashboard)/route.ts');
      expect(route).toContain("import router from '@/src/router.js';");
      expect(route).toContain("const route = router.add('/dashboard');");
      expect(route).toContain('export const dashboardRoute = route;');
    });

    it('generates a root route without an index when the root has only a layout', () => {
      dir = makeFixture({ 'pages/layout.tsx': '' });

      app = makeApp(dir);

      const route = readFixture(dir, 'pages/route.ts');
      expect(route).toContain('const route = router.route();');
      expect(route).toContain('export const rootRoute = route;');
      expect(route).not.toContain('indexRoute');
    });

    it('surfaces route file changes as reload change events', () => {
      dir = makeFixture({ 'pages/blogs/route.ts': '// hand-written\n', 'pages/blogs/page.tsx': '' });

      app = makeApp(dir);
      const events: Array<[string, string]> = [];
      app.on('change', (file, kind) => events.push([file, kind]));

      writeFixture(dir, { 'pages/blogs/route.ts': '// updated hand-written\n' });
      app.rootFolder.children.get('blogs')?.handleFileChanged('route.ts');

      expect(events.some(([file, kind]) => file.endsWith('pages/blogs/route.ts') && kind === 'reload')).toBe(true);
    });

    it('warns but never rewrites a default export that does not reference the folder route', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/route.ts': [
          "import parentRoute from '../route.js';",
          '',
          '/** AirLib managed */',
          "const route = parentRoute.route('/blogs');",
          '/** AirLib managed */',
          '',
          'export const blogsRoute = route;',
          '',
          'export default somethingElse;',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export default somethingElse;');
    });

    it('normalizes a child route file that imports its parent by name', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/[slug]/page.tsx': '',
        'pages/blogs/[slug]/route.ts': [
          "import { blogsRoute } from '../route.js';",
          "export const DynamicRoute = blogsRoute.route('/:slug');",
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/[slug]/route.ts');
      expect(content).toContain("import parentRoute from '../route.js';");
      expect(content).not.toContain('{ blogsRoute }');
    });

    it('warns but keeps an index export that chains the wrong path', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/layout.tsx': '',
        'pages/blogs/route.ts': [
          "export const blogsRoute = rootRoute.route('/blogs');",
          "export const blogsIndexRoute = blogsRoute.route('/wrong');",
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/route.ts');
      expect(content).toContain("export const blogsIndexRoute = blogsRoute.route('/wrong');");
    });

    it('tolerates non-route declarations in a hand-written route file', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/route.ts': [
          "import * as helpers from './helpers.js';",
          "import './styles.css';",
          "export const blogsRoute = rootRoute.route('/blogs');",
          "export const computed = rootRoute['route']('/weird');",
          "export const wrongMethod = rootRoute.publish('/weird');",
          "export const notACall = 'plain string';",
          "export const chained = blogsRoute.route('/chained').meta({ title: 'Chained' });",
          "export const nested = rootRoute.child.route('/nested');",
          'export const { thing } = helpers;',
          'const internal = 1;',
          'const { value } = helpers;',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/route.ts');
      expect(content).toContain("export const blogsRoute = rootRoute.route('/blogs');");
      expect(content).toContain("export const notACall = 'plain string';");
    });

    it('adopts a hand-written default export that references the folder route', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/route.ts': [
          "export const blogsRoute = rootRoute.route('/blogs');",
          'export default blogsRoute;',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export default blogsRoute;');
    });

    it('leaves a route file with syntax errors untouched', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/route.ts': ['export const blogsRoute = ;', ''].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export const blogsRoute = ;');
    });

    it('rewires a page file that imports the route by name to a default import', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import { blogsRoute } from './route.ts';",
          'export default page(blogsRoute).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/page.tsx');
      expect(content).toContain("import blogsRoute from './route.ts';");
      expect(content).not.toContain('{ blogsRoute }');
    });

    it('re-wires a page binding to the index route when a layout appears', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import blogsRoute from './route.ts';",
          'export default page(blogsRoute).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
        'pages/blogs/layout.tsx': '',
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/page.tsx');
      expect(content).toContain("import { blogsIndexRoute } from './route.ts';");
      expect(content).toContain('page(blogsIndexRoute)');
    });

    it('drops the index export when the layout is removed', () => {
      dir = makeFixture({ 'pages/blogs/page.tsx': '', 'pages/blogs/layout.tsx': '' });
      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('blogsIndexRoute');

      removeFixture(dir, 'pages/blogs/layout.tsx');
      app.rootFolder.children.get('blogs')?.handleFileRemoved('layout.tsx');

      expect(readFixture(dir, 'pages/blogs/route.ts')).not.toContain('blogsIndexRoute');
    });

    it('adds named page routes to a named-pages-only folder at runtime', () => {
      dir = makeFixture({ 'pages/docs/v1.page.tsx': '' });
      app = makeApp(dir);

      writeFixture(dir, { 'pages/docs/v2.page.tsx': '' });
      app.rootFolder.children.get('docs')?.handleFileAdded('v2.page.tsx');

      expect(readFixture(dir, 'pages/docs/route.ts')).toContain('docsV2Route');
    });

    it('keeps extra named imports when normalizing a split route import', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import { blogsRoute } from './route.ts';",
          "import { helper } from './route.ts';",
          'export default page(blogsRoute).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/page.tsx');
      expect(content).toContain("import blogsRoute, { helper } from './route.ts';");
      expect(content).not.toContain('import { helper }');
    });

    it('leaves a page file alone when it imports the route namespace', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import * as ns from './route.ts';",
          'export default page(ns.blogsRoute).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/page.tsx')).toContain("import * as ns from './route.ts';");
    });

    it('leaves a page file alone when its binding is not a plain route reference', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import blogsRoute from './route.ts';",
          "export default page(blogsRoute.route('/nested')).render(() => <h1>Blogs</h1>);",
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/page.tsx')).toContain("page(blogsRoute.route('/nested'))");
    });

    it('re-wires an index page whose route import has no default specifier', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import { helper } from './route.ts';",
          'export default page(helper).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
        'pages/blogs/layout.tsx': '',
      });

      app = makeApp(dir);

      const content = readFixture(dir, 'pages/blogs/page.tsx');
      expect(content).toContain("import { blogsIndexRoute, helper } from './route.ts';");
      expect(content).toContain('page(blogsIndexRoute)');
    });

    it('recognizes the legacy default-export marker', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': '',
        'pages/blogs/route.ts': [
          "export const blogsRoute = rootRoute.route('/blogs');",
          '// @generated — do not edit',
          'export default blogsRoute;',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('// @generated — do not edit');
    });

    it('recognizes modal bindings when wiring page files', () => {
      dir = makeFixture({
        'pages/blogs/page.tsx': [
          "import blogsRoute from './route.ts';",
          'export default modal(blogsRoute).render(() => <h1>Blogs</h1>);',
          '',
        ].join('\n'),
      });

      app = makeApp(dir);

      expect(readFixture(dir, 'pages/blogs/page.tsx')).toContain('modal(blogsRoute)');
    });

    it('auto-scaffolds layout when page.tsx is added dynamically to a folder with children', () => {
      dir = makeFixture({ 'pages/docs/item/page.tsx': '' });
      app = makeApp(dir);

      expect(fixtureExists(dir, 'pages/docs/layout.tsx')).toBe(false);

      writeFixture(dir, { 'pages/docs/page.tsx': '' });
      app.rootFolder.children.get('docs')?.handleFileAdded('page.tsx');

      expect(fixtureExists(dir, 'pages/docs/layout.tsx')).toBe(true);
    });

    it('auto-scaffolds layout when page.mdx is added dynamically to a folder with children', () => {
      dir = makeFixture({ 'pages/docs/item/page.tsx': '' });
      app = makeApp(dir);

      expect(fixtureExists(dir, 'pages/docs/layout.tsx')).toBe(false);

      writeFixture(dir, { 'pages/docs/page.mdx': '' });
      app.rootFolder.children.get('docs')?.handleFileAdded('page.mdx');

      expect(fixtureExists(dir, 'pages/docs/layout.tsx')).toBe(true);
    });

    it('survives a failed scaffold write without crashing', () => {
      dir = makeFixture({ 'pages/docs/layout.tsx': '' });
      const original = fs.writeFileSync.bind(fs) as (...args: unknown[]) => void;
      const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(((...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].endsWith('layout.tsx')) {
          throw new Error('disk full');
        }
        return original(...args);
      }) as typeof fs.writeFileSync);

      try {
        expect(() => makeApp(dir)).not.toThrow();
      } finally {
        spy.mockRestore();
      }

      expect(readFixture(dir, 'pages/docs/layout.tsx')).toBe('');
    });

    it('survives a failed ensureLayoutFile write without crashing', () => {
      dir = makeFixture({ 'pages/docs/page.tsx': '', 'pages/docs/child/page.tsx': '' });
      const original = fs.writeFileSync.bind(fs) as (...args: unknown[]) => void;
      const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(((...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].endsWith('layout.tsx')) {
          throw new Error('disk full');
        }
        return original(...args);
      }) as typeof fs.writeFileSync);

      try {
        expect(() => makeApp(dir)).not.toThrow();
      } finally {
        spy.mockRestore();
      }
    });

    it('returns false from ensureLayoutFile when layout is already true or file already exists', () => {
      dir = makeFixture({ 'pages/docs/page.tsx': '', 'pages/docs/child/page.tsx': '' });
      app = makeApp(dir);

      const docsRoute = app!.rootRoute!.children.get('docs');
      expect(docsRoute?.ensureLayoutFile()).toBe(false);

      if (docsRoute) {
        docsRoute.layout = false;
        expect(docsRoute.ensureLayoutFile()).toBe(false);
      }
    });
  });

  describe('scaffold variants', () => {
    it('scaffolds the ambient global.d.ts with AirRouteMeta', () => {
      expect(scaffoldForFile({ base: 'global.d.ts', framework: 'react', files: DEFAULT_FILE_MAP })).toContain(
        'interface AirRouteMeta'
      );
    });

    it('scaffolds the solid worker entry against the solid ssr package', () => {
      const content = scaffoldForFile({ base: 'worker.ts', framework: 'solid', files: DEFAULT_FILE_MAP });
      expect(content).toContain("import { createApp } from '@airlib/solid/ssr';");
    });

    it('returns undefined for unknown file bases', () => {
      expect(scaffoldForFile({ base: 'random.txt', framework: 'react', files: DEFAULT_FILE_MAP })).toBeUndefined();
    });
  });

  describe('mdx transform branches', () => {
    it('returns undefined when the mdx file directory is not found in the tree', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      app = makeApp(dir);
      const resolution = AIR_ENV.routes.resolve(fixturePath(dir, 'pages/untracked/page.mdx'));
      app.destroy();

      expect(resolution).toBeUndefined();
    });

    it('attaches nothing when page.mdx loses to page.tsx (tsx wins branch)', async () => {
      dir = makeFixture({ 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });

      app = makeApp(dir);
      const resolution = AIR_ENV.routes.resolve(fixturePath(dir, 'pages/docs/page.mdx'))!;
      const wrapper = mdxEntryWrapper({
        file: fixturePath(dir, 'pages/docs/page.mdx'),
        route: resolution,
        framework: 'react',
        files: DEFAULT_FILE_MAP,
        chunkName: './page.mdx?chunk',
      });
      app.destroy();

      expect(wrapper).toBeUndefined();
    });

    it('compiles without extended plugins when extended is false', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      const { file, code } = await mdxFile(fixturePath(dir, 'pages/page.mdx'), '# Hi\n', {
        include: MDX_DEFAULT_OPTIONS.include,
        extended: false,
        headingDepth: MDX_DEFAULT_OPTIONS.headingDepth,
        cacheDir: '',
      });

      expect(file.metadata).toEqual({});
      expect(code).toContain('export default function AirMdxPage');
    });
  });

  describe('model helpers', () => {
    it('leaves static segments untouched and maps bracket segments', () => {
      expect(deriveSegment('blog')).toBe('blog');
      expect(deriveSegment('[slug]')).toBe(':slug');
      expect(deriveSegment('[...rest]')).toBe('*rest');
    });

    it('derives export names from folder paths', () => {
      expect(derivePrefix('admin/users')).toBe('adminUsers');
      expect(derivePrefix('___/blogs')).toBe('blogs');
      expect(derivePrefix('')).toBe('');
      expect(deriveRouteName('[slug]')).toBe('DynamicRoute');
      expect(deriveRouteName('members')).toBe('membersRoute');
    });

    it('humanizes segments and falls back to Home', () => {
      expect(humanizeSegment('getting-started')).toBe('Getting Started');
      expect(humanizeSegment('[slug]')).toBe('Slug');
      expect(humanizeSegment('___')).toBe('Home');
    });

    it('computes canonical paths and import specifiers', () => {
      expect(canonicalPath('blogs/[slug]')).toBe('/blogs/:slug');
      expect(canonicalPath('')).toBe('/');
      expect(importSpecifier('/app/foo.ts', '/app/bar.ts')).toBe('./bar.js');
    });

    it('strips the page base from named pages and passes other files through', () => {
      expect(namedPageName('teams.page.tsx', DEFAULT_FILE_MAP)).toBe('teams');
      expect(namedPageName('readme.md', DEFAULT_FILE_MAP)).toBe('readme.md');
    });
  });

  describe('sync helpers', () => {
    it('skips writes when content is identical and writes when changed', () => {
      dir = makeFixture({ 'file.txt': 'a' });

      const file = fixturePath(dir, 'file.txt');
      expect(writeIfChanged(file, 'a')).toBe(false);
      expect(writeIfChanged(file, 'b')).toBe(true);
      expect(readFixture(dir, 'file.txt')).toBe('b');
    });

    it('resolves routes for folders created after boot', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/page.tsx': '' });
      app = makeApp(dir);

      writeFixture(dir, { 'pages/docs/page.tsx': '' });
      app.rootFolder.handleChildAdded('docs', fixturePath(dir, 'pages/docs'));
      app.rootFolder.children.get('docs')?.handleFileAdded('page.tsx');

      const resolution = AIR_ENV.routes.resolve(fixturePath(dir, 'pages/docs/page.tsx'));
      expect(resolution?.node.routeName).toBe('docsRoute');
    });

    it('boots a scoped package with its exports map', () => {
      dir = makeFixture({});
      bootPackage(fixturePath(dir, 'pkg'), '@airlib/test', { '.': './index.ts' });

      const { name, exports: exportsMap } = JSON.parse(readFixture(dir, 'pkg/package.json'));
      expect(name).toBe('@airlib/test');
      expect(exportsMap).toEqual({ '.': './index.ts' });
    });

    it('is idempotent when creating the @airlib-cache symlink', () => {
      dir = makeFixture({});

      expect(() => ensureSymlink(dir)).not.toThrow();
      expect(() => ensureSymlink(dir)).not.toThrow();
    });
  });

  describe('app bootstrap', () => {
    it('creates a router file and starter pages when the project is empty', () => {
      dir = makeFixture({});

      app = makeApp(dir);

      expect(readFixture(dir, 'router.ts')).toContain('export default router;');
      expect(readFixture(dir, 'pages/layout.tsx')).toContain('page(rootRoute).render(');
      expect(readFixture(dir, 'pages/page.tsx')).toContain('<h1>Home</h1>');
      expect(readFixture(dir, 'pages/route.ts')).toContain('export const rootIndexRoute = indexRoute;');
    });
  });

  describe('watcher events — folder edits are picked up while running', () => {
    const emit = (ev: string, rel: string) => {
      const abs = fixturePath(dir, rel);
      const watcherDir = path.dirname(abs);
      const watcher = chokidarState.watchers.get(watcherDir) ?? chokidarState.watchers.get(fixturePath(dir, 'pages'));
      watcher?.emit(ev, abs);
    };

    afterEach(() => {
      chokidarState.watchers.clear();
    });

    it('generates routes when a page folder appears', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
      app = makeApp(dir);
      app.rootFolder.watch();
      emit('ready', '');

      writeFixture(dir, { 'pages/blogs/page.tsx': '' });
      emit('addDir', 'pages/blogs');
      emit('add', 'pages/blogs/page.tsx');

      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export const blogsRoute = route;');
    });

    it('reacts to a file added to an existing folder', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '' });
      app = makeApp(dir);
      app.rootFolder.watch();
      emit('ready', '');

      writeFixture(dir, { 'pages/projects/layout.tsx': '' });
      emit('add', 'pages/projects/layout.tsx');

      expect(readFixture(dir, 'pages/projects/route.ts')).toContain('projectsIndexRoute');
    });

    it('watching twice is idempotent and destroy shuts the watcher down', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
      app = makeApp(dir);

      expect(() => app!.rootFolder.watch()).not.toThrow();
      expect(() => app!.rootFolder.watch()).not.toThrow();

      const root = app.rootFolder;
      expect(() => app!.destroy()).not.toThrow();
      app = undefined;

      expect(root.children.size).toBe(0);
    });
  });

  describe('symlink & write helpers', () => {
    it('creates the @airlib-cache symlink when node_modules is missing', () => {
      dir = makeFixture({});

      expect(fs.existsSync(fixturePath(dir, 'node_modules'))).toBe(false);
      ensureSymlink(dir, '.airlib', '@airlib-cache');

      expect(fs.lstatSync(fixturePath(dir, 'node_modules/@airlib-cache')).isSymbolicLink()).toBe(true);
    });

    it('repairs a stale @airlib-cache symlink target', () => {
      dir = makeFixture({});
      fs.mkdirSync(fixturePath(dir, 'node_modules/@airlib-cache'), { recursive: true });
      fs.writeFileSync(fixturePath(dir, 'node_modules/@airlib-cache/stale.txt'), 'x');

      ensureSymlink(dir, '.airlib', '@airlib-cache');

      const stat = fs.lstatSync(fixturePath(dir, 'node_modules/@airlib-cache'));
      expect(stat.isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(fixturePath(dir, 'node_modules/@airlib-cache'))).toBe('../.airlib');
    });

    it('creates custom cache symlink when custom cacheDir and cacheScope are provided', () => {
      dir = makeFixture({});
      ensureSymlink(dir, '.my-cache', '@my-scope');

      const stat = fs.lstatSync(fixturePath(dir, 'node_modules/@my-scope'));
      expect(stat.isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(fixturePath(dir, 'node_modules/@my-scope'))).toBe('../.my-cache');
    });

    it('writeIfChanged creates missing parent directories', () => {
      dir = makeFixture({});

      const file = fixturePath(dir, 'a/b/c.txt');
      expect(writeIfChanged(file, 'x')).toBe(true);
      expect(readFixture(dir, 'a/b/c.txt')).toBe('x');
    });
  });

  describe('index route lifecycle', () => {
    it('injects an index route when a layout is added after a page', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '' });
      app = makeApp(dir);

      expect(readFixture(dir, 'pages/projects/route.ts')).not.toContain('projectsIndexRoute');

      writeFixture(dir, { 'pages/projects/layout.tsx': '' });
      app.rootFolder.children.get('projects')?.handleFileAdded('layout.tsx');

      const route = readFixture(dir, 'pages/projects/route.ts');
      expect(route).toContain('export const projectsIndexRoute = indexRoute;');
    });

    it('removes the index route when the page is removed from a page+layout folder', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '', 'pages/projects/layout.tsx': '' });
      app = makeApp(dir);

      expect(readFixture(dir, 'pages/projects/route.ts')).toContain('projectsIndexRoute');

      removeFixture(dir, 'pages/projects/page.tsx');
      app.rootFolder.children.get('projects')?.handleFileRemoved('page.tsx');

      expect(readFixture(dir, 'pages/projects/route.ts')).not.toContain('projectsIndexRoute');
    });

    it('re-injects the index route without duplicates after a layout is removed and re-added', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '', 'pages/projects/layout.tsx': '' });
      app = makeApp(dir);

      removeFixture(dir, 'pages/projects/layout.tsx');
      app.rootFolder.children.get('projects')?.handleFileRemoved('layout.tsx');
      expect(readFixture(dir, 'pages/projects/route.ts')).not.toContain('projectsIndexRoute');

      writeFixture(dir, { 'pages/projects/layout.tsx': '' });
      app.rootFolder.children.get('projects')?.handleFileAdded('layout.tsx');

      const route = readFixture(dir, 'pages/projects/route.ts');
      expect(route.split('export const projectsIndexRoute').length - 1).toBe(1);
    });
  });

  describe('metadata & manifest sync', () => {
    it('removes a metadata entry when its mdx file is removed', () => {
      dir = makeFixture({ 'pages/guide/page.mdx': '---\ntitle: "Guide"\n---\n' });
      app = makeApp(dir);

      expect(fixtureExists(dir, '.airlib/metadata/guide/page.ts')).toBe(true);

      removeFixture(dir, 'pages/guide/page.mdx');
      app.rootFolder.children.get('guide')?.handleFileRemoved('page.mdx');

      expect(fixtureExists(dir, '.airlib/metadata/guide/page.ts')).toBe(false);
      expect(fixtureExists(dir, '.airlib/metadata/guide/index.ts')).toBe(false);
    });

    it('removes a metadata folder when an mdx folder is removed', () => {
      dir = makeFixture({ 'pages/blogs/[slug]/test.mdx': '---\ntitle: "Post"\n---\n' });
      app = makeApp(dir);

      expect(fixtureExists(dir, '.airlib/metadata/blogs/[slug]/test.ts')).toBe(true);

      removeFixture(dir, 'pages/blogs');
      app.rootFolder.handleChildRemoved('blogs');

      expect(fixtureExists(dir, '.airlib/metadata/blogs')).toBe(false);
    });

    it('removes manifest entries when a folder is removed', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '', 'pages/about/page.tsx': '' });
      app = makeApp(dir);

      expect(readManifest(dir)).toContain("'/blogs'");

      removeFixture(dir, 'pages/blogs');
      app.rootFolder.handleChildRemoved('blogs');

      expect(readManifest(dir)).not.toContain("'/blogs'");
      expect(readManifest(dir)).toContain("'/about'");
    });

    it('removes generated manifest files on destroy', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });
      app = makeApp(dir);

      expect(fixtureExists(dir, '.airlib/manifest/index.ts')).toBe(true);

      app.destroy();
      app = undefined;

      expect(fixtureExists(dir, '.airlib/manifest/index.ts')).toBe(false);
    });
  });

  describe('resilient boot', () => {
    it('boots even when an app entry file cannot be scaffolded', () => {
      dir = makeFixture({ 'router.ts': '', 'src/app.tsx': '' });
      fs.chmodSync(fixturePath(dir, 'src/app.tsx'), 0o444);

      app = makeApp(dir);

      expect(readFixture(dir, 'src/app.tsx')).toBe('');
    });

    it('handles mdxMatcher and getLeafNode defaults', async () => {
      const matcher = mdxMatcher();
      expect(matcher('page.mdx')).toBe(true);
      expect(matcher('page.md')).toBe(true);
      expect(matcher('page.tsx')).toBe(false);

      const leaf = getLeafNode({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'hello' }] }] });
      expect(leaf).toEqual({ type: 'text', value: 'hello' });

      const notFound = getLeafNode({ type: 'root' }, 'missing');
      expect(notFound).toBeUndefined();

      const plugins = await loadExtendedPlugins({ options: { extended: true } } as never);
      expect(plugins.remarkPlugins.length).toBeGreaterThan(0);
      expect(plugins.rehypePlugins.length).toBeGreaterThan(0);

      const headingsPlugin = airMdxHeadings();
      const mockTree = { type: 'root', children: [] } as never;
      expect(() => headingsPlugin(mockTree)).not.toThrow();

      const rehypePlugin = airMdxRehype();
      expect(() => rehypePlugin(mockTree)).not.toThrow();

      dir = makeFixture({});
      AIR_ENV.viteRoot = dir;
      const compiled = await mdxFile(fixturePath(dir, 'test.mdx'), '# Test');
      expect(compiled.code).toBeDefined();

      const compiledWithPost = await mdxFile(fixturePath(dir, 'test.mdx'), '# Test', {
        cacheDir: '',
        postProcesses: [async (c) => {
          c.output += '';
        }],
      });
      expect(compiledWithPost.code).toBeDefined();
      cleanFixture(dir);
      AIR_ENV.viteRoot = '';
    });
  });
});
