import fs from 'node:fs';
import * as acorn from 'acorn';
import { afterEach, describe, expect, it } from 'vitest';
import { mdxAttachForFile } from '../src/plugins/mdx-route.js';
import {
  canonicalPath,
  derivePrefix,
  deriveRouteName,
  deriveSegment,
  humanizeSegment,
  importSpecifier,
} from '../src/utils/mapper.js';
import { scaffoldForFile } from '../src/utils/scaffold.js';
import { bootPackage, ensureSymlink, writeIfChanged } from '../src/utils/sync.js';
import {
  cleanFixture,
  fixtureExists,
  fixturePath,
  makeFixture,
  readFixture,
  removeFixture,
  writeFixture,
} from './fixture.js';
import { makeApp, readManifest, readMetadata } from './make-sync.js';

const parse = (code: string) => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });

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
      expect(route).toContain("import router from '../../router.js';");
      expect(route).toContain("export const dashboardRoute = router.add('/dashboard');");
    });

    it('generates a root route without an index when the root has only a layout', () => {
      dir = makeFixture({ 'pages/layout.tsx': '' });

      app = makeApp(dir);

      const route = readFixture(dir, 'pages/route.ts');
      expect(route).toContain('export const rootRoute = router.route();');
      expect(route).not.toContain('indexRoute');
    });

    it('surfaces route file changes as reload change events', () => {
      dir = makeFixture({ 'pages/blogs/route.ts': '// hand-written\n', 'pages/blogs/page.tsx': '' });

      app = makeApp(dir);
      const events: Array<[string, string]> = [];
      app.on('change', (file, kind) => events.push([file, kind]));

      app.rootFolder.children.get('blogs')?.handleFileChanged('route.ts');

      // The route reload bubbles once, and each manifest level on the chain
      // also re-generates (blogs + root) — so one reload plus updates.
      const reload = events.find(([file, kind]) => kind === 'reload' && file.includes('route.ts'));
      expect(reload).toBeDefined();
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scaffold variants', () => {
    it('scaffolds the ambient global.d.ts with AirRouteMeta', () => {
      expect(scaffoldForFile({ base: 'global.d.ts', framework: 'react' })).toContain('interface AirRouteMeta');
    });

    it('scaffolds the solid worker entry against the solid ssr package', () => {
      const content = scaffoldForFile({ base: 'worker.ts', framework: 'solid' });
      expect(content).toContain("import { createApp } from '@anchorlib/solid/ssr';");
    });

    it('returns undefined for unknown file bases', () => {
      expect(scaffoldForFile({ base: 'random.txt', framework: 'react' })).toBeUndefined();
    });
  });

  describe('mdx transform branches', () => {
    it('keeps a custom export default declaration that is not MDXContent', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      app = makeApp(dir);
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree: app.rootFolder,
        framework: 'react',
        code: 'export default function CustomDefault() { return null; }\n',
        parse,
      });
      app.destroy();

      expect(result).toContain('function CustomDefault');
    });

    it('keeps ordinary named exports and invokes $install side-effects', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      app = makeApp(dir);
      const code = [
        'export const helperConst = 42;',
        'export class CustomClass {}',
        'export function $install() { console.log("installing"); }',
        'export function $module() { console.log("mod"); }',
      ].join('\n');
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree: app.rootFolder,
        framework: 'react',
        code,
        parse,
      });
      app.destroy();

      expect(result).toContain("if (typeof $install === 'function') $install();");
      expect(result).toContain("if (typeof $module === 'function') $module();");
      expect(result).toContain('export const helperConst = 42;');
      expect(result).toContain('export class CustomClass {}');
    });

    it('handles specifier exports without declarations', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      app = makeApp(dir);
      const code =
        'const $install = () => {}; const myVar = 100;\nexport { $install };\nexport { myVar as customVar };\n';
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree: app.rootFolder,
        framework: 'react',
        code,
        parse,
      });
      app.destroy();

      expect(result).toContain("if (typeof $install === 'function') $install();");
      expect(result).toContain('export { myVar as customVar };');
    });

    it('returns undefined when the mdx file directory is not found in the tree', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });

      app = makeApp(dir);
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/untracked/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree: app.rootFolder,
        framework: 'react',
        code: '',
        parse,
      });
      app.destroy();

      expect(result).toBeUndefined();
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
      expect(deriveRouteName('blogs/[slug]')).toBe('blogsDynamicRoute');
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
  });

  describe('sync helpers', () => {
    it('skips writes when content is identical and writes when changed', () => {
      dir = makeFixture({ 'file.txt': 'a' });

      const file = fixturePath(dir, 'file.txt');
      expect(writeIfChanged(file, 'a')).toBe(false);
      expect(writeIfChanged(file, 'b')).toBe(true);
      expect(readFixture(dir, 'file.txt')).toBe('b');
    });

    it('boots a scoped package with its exports map', () => {
      dir = makeFixture({});
      bootPackage(fixturePath(dir, 'pkg'), '@airstack/test', { '.': './index.ts' });

      const { name, exports: exportsMap } = JSON.parse(readFixture(dir, 'pkg/package.json'));
      expect(name).toBe('@airstack/test');
      expect(exportsMap).toEqual({ '.': './index.ts' });
    });

    it('is idempotent when creating the @airstack symlink', () => {
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
      expect(readFixture(dir, 'pages/page.tsx')).toContain('Welcome to AIR Stack');
      expect(readFixture(dir, 'pages/route.ts')).toContain("export const indexRoute = rootRoute.route('/');");
    });
  });

  describe('live watcher — folder edits are picked up while running', () => {
    async function waitFor(cond: () => boolean, timeout = 3000): Promise<void> {
      const start = Date.now();
      while (!cond()) {
        if (Date.now() - start > timeout) throw new Error('condition not met in time');
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    it('generates routes when a page folder appears', async () => {
      dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
      app = makeApp(dir);
      app.rootFolder.watch();

      // Let chokidar establish its watch before mutating the tree.
      await new Promise((resolve) => setTimeout(resolve, 150));

      fs.mkdirSync(fixturePath(dir, 'pages/blogs'), { recursive: true });
      fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '');

      await waitFor(() => fixtureExists(dir, 'pages/blogs/route.ts'));
      expect(readFixture(dir, 'pages/blogs/route.ts')).toContain(
        "export const blogsRoute = rootRoute.route('/blogs');"
      );
    });

    it('reacts to a file added to an existing folder', async () => {
      dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '' });
      app = makeApp(dir);
      app.rootFolder.watch();

      await new Promise((resolve) => setTimeout(resolve, 150));

      writeFixture(dir, { 'pages/projects/layout.tsx': '' });

      await waitFor(() => readFixture(dir, 'pages/projects/route.ts').includes('projectsIndexRoute'));
    });

    it('watching twice is idempotent and destroy shuts the watcher down', () => {
      dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
      app = makeApp(dir);

      expect(() => app.rootFolder.watch()).not.toThrow();
      expect(() => app.rootFolder.watch()).not.toThrow();

      const root = app.rootFolder;
      expect(() => app.destroy()).not.toThrow();
      app = undefined;

      expect(root.children.size).toBe(0);
    });
  });

  describe('symlink & write helpers', () => {
    it('creates the @airstack symlink when node_modules is missing', () => {
      dir = makeFixture({});

      expect(fs.existsSync(fixturePath(dir, 'node_modules'))).toBe(false);
      ensureSymlink(dir);

      expect(fs.lstatSync(fixturePath(dir, 'node_modules/@airstack')).isSymbolicLink()).toBe(true);
    });

    it('repairs a stale @airstack symlink target', () => {
      dir = makeFixture({});
      fs.mkdirSync(fixturePath(dir, 'node_modules/@airstack'), { recursive: true });
      fs.writeFileSync(fixturePath(dir, 'node_modules/@airstack/stale.txt'), 'x');

      ensureSymlink(dir);

      const stat = fs.lstatSync(fixturePath(dir, 'node_modules/@airstack'));
      expect(stat.isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(fixturePath(dir, 'node_modules/@airstack'))).toBe('../.airstack');
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
      expect(route).toContain("export const projectsIndexRoute = projectsRoute.route('/');");
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

      expect(fixtureExists(dir, '.airstack/metadata/guide/page.ts')).toBe(true);

      removeFixture(dir, 'pages/guide/page.mdx');
      app.rootFolder.children.get('guide')?.handleFileRemoved('page.mdx');

      expect(fixtureExists(dir, '.airstack/metadata/guide/page.ts')).toBe(false);
      expect(readMetadata(dir, 'index.ts')).not.toContain('guideMeta');
    });

    it('drops the parent spread when an mdx folder is removed', () => {
      dir = makeFixture({ 'pages/blogs/[slug]/test.mdx': '---\ntitle: "Post"\n---\n' });
      app = makeApp(dir);

      expect(readMetadata(dir, 'index.ts')).toContain('blogsMeta');

      removeFixture(dir, 'pages/blogs');
      app.rootFolder.handleChildRemoved('blogs');

      expect(readMetadata(dir, 'index.ts')).not.toContain('blogsMeta');
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

      expect(fixtureExists(dir, '.airstack/manifest/index.ts')).toBe(true);

      app.destroy();
      app = undefined;

      expect(fixtureExists(dir, '.airstack/manifest/index.ts')).toBe(false);
    });
  });

  describe('resilient boot', () => {
    it('boots even when an app entry file cannot be scaffolded', () => {
      dir = makeFixture({ 'router.ts': '', 'src/app.tsx': '' });
      fs.chmodSync(fixturePath(dir, 'src/app.tsx'), 0o444);

      app = makeApp(dir);

      expect(readFixture(dir, 'src/app.tsx')).toBe('');
    });
  });
});
