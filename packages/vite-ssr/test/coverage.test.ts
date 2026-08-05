import fs from 'node:fs';
import * as acorn from 'acorn';
import { afterEach, describe, expect, it } from 'vitest';
import { generateManifest, generateRouteFiles, scaffoldForFile, scaffoldPageTsx } from '../src/pages/generate.js';
import { mdxAttachForFile } from '../src/pages/mdx.js';
import { derivePrefix, humanizeSegment, importSpecifier, isPageFile, scanPages } from '../src/pages/model.js';
import { cleanFixture, fixturePath, makeFixture, removeFixture } from './fixture.js';
import { makeSync } from './make-sync.js';

const parse = (code: string) => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });

describe('coverage tests for unreached branches', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  describe('generate.ts edge cases', () => {
    it('scaffoldPageTsx handles indexRoute (line 218)', () => {
      const result = scaffoldPageTsx({ framework: 'react', rel: '', routeExport: 'indexRoute' });
      expect(result).toContain('<h1>Home</h1>');
    });

    it('scaffoldPageTsx hits the || empty string fallback (line 218)', () => {
      // routeExport is not indexRoute, rel is empty string so split('/').pop() is ''
      const result = scaffoldPageTsx({ framework: 'react', rel: '', routeExport: 'customRoute' });
      expect(result).toContain('<h1>Home</h1>'); // humanizeSegment('') -> 'Home'
    });

    it('mdxAttachForFile returns undefined for non-mdx files (line 348)', async () => {
      dir = makeFixture({ 'pages/page.tsx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.tsx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code: '',
        parse,
      });
      expect(result).toBeUndefined();
    });

    it('mdxAttachForFile attaches layout.mdx to rootRoute for root folder (line 367)', async () => {
      dir = makeFixture({ 'pages/layout.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/layout.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code: '',
        parse,
      });
      expect(result).toContain('import { rootRoute as __airRoute }');
    });

    it('mdxAttachForFile attaches layout.mdx to derived route for subfolder (line 367)', async () => {
      dir = makeFixture({ 'pages/docs/layout.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/docs/layout.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code: '',
        parse,
      });
      expect(result).toContain('import { docsRoute as __airRoute }');
    });

    it('manifest includes root page correctly', () => {
      dir = makeFixture({ 'pages/page.tsx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const files = generateManifest({
        root: tree,
        manifestDir: fixturePath(dir, 'manifest'),
        framework: 'react',
      });
      const content = files.find((f) => f.filePath === fixturePath(dir, 'manifest/index.ts'))?.content ?? '';
      expect(content).toContain("['/', indexRoute],");
    });

    it('scaffoldForFile returns undefined for unknown files', () => {
      dir = makeFixture({ 'pages/page.tsx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      expect(scaffoldForFile({ base: 'random.ts', folder: tree, framework: 'react' })).toBeUndefined();
    });

    it('generates fallback routes when root folder has only layout (line 84)', () => {
      dir = makeFixture({ 'pages/layout.tsx': '' });
      const { sync } = makeSync(dir);
      sync.refresh();
      const routeContent = fs.readFileSync(fixturePath(dir, 'pages/route.ts'), 'utf-8');
      expect(routeContent).toContain('export const rootRoute = router.route();');
      expect(routeContent).not.toContain('indexRoute');
    });

    it('does not generate index route when root folder has only irpc', () => {
      dir = makeFixture({ 'pages/constructor.ts': '' });
      const tree = scanPages(fixturePath(dir, 'pages'), true);
      const files = generateRouteFiles({
        root: tree,
        routerFile: fixturePath(dir, 'router.ts'),
      });
      const routeContent = files.find((f) => f.filePath.endsWith('pages/route.ts'))?.content ?? '';
      expect(routeContent).not.toContain('indexRoute');
    });
  });

  describe('model.ts edge cases', () => {
    it('isPageFile accurately identifies files', () => {
      expect(isPageFile('page.tsx')).toBe(true);
      expect(isPageFile('random.ts')).toBe(false);
    });

    it('scanPages identifies layout.mdx and irpc files (constructor.ts) (line 128)', () => {
      dir = makeFixture({ 'pages/docs/layout.mdx': '', 'pages/api/constructor.ts': '' });
      const tree = scanPages(fixturePath(dir, 'pages'), true);
      const docs = tree.children.find((c) => c.rel === 'docs')!;
      const api = tree.children.find((c) => c.rel === 'api')!;
      expect(docs.layout).toBe(true);
      expect(api.irpc).toBe(true);
    });

    it('scanPages skips .hidden and node_modules folders', () => {
      dir = makeFixture({ 'pages/.hidden/page.tsx': '', 'pages/node_modules/page.tsx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      expect(tree.children).toHaveLength(0);
    });

    it('derivePrefix returns empty string for empty rel', () => {
      expect(derivePrefix('')).toBe('');
    });

    it('derivePrefix skips non-alphanumeric segments', () => {
      expect(derivePrefix('___/blogs')).toBe('blogs');
    });

    it('humanizeSegment returns Home if no valid words', () => {
      expect(humanizeSegment('___')).toBe('Home');
    });

    it('importSpecifier prefixes with ./ when files are in same dir', () => {
      const spec = importSpecifier('/app/foo.ts', '/app/bar.ts');
      expect(spec).toBe('./bar.js');
    });
  });

  describe('sync.ts edge cases', () => {
    it('exposes the current scanned tree', () => {
      dir = makeFixture({ 'pages/page.tsx': '' });
      const { sync } = makeSync(dir);
      sync.refresh();
      expect(sync.tree.page).toBe('tsx');
    });

    it('scaffoldFile ignores non-page base files', () => {
      dir = makeFixture({ 'pages/unknown.ts': '' });
      const { sync } = makeSync(dir);
      sync.scaffoldFile(fixturePath(dir, 'pages/unknown.ts'));
    });

    it('scaffoldFile ignores files not in the tree', () => {
      dir = makeFixture({ 'elsewhere/page.tsx': '' });
      const { sync } = makeSync(dir);
      sync.scaffoldFile(fixturePath(dir, 'elsewhere/page.tsx'));
    });

    it('scaffoldFile swallows exceptions on write (line 84)', () => {
      dir = makeFixture({ 'pages/page.tsx': '' });
      // Make it strictly readonly so fs.writeFileSync throws EACCES
      fs.chmodSync(fixturePath(dir, 'pages/page.tsx'), 0o444);
      const { sync } = makeSync(dir);
      // Fails to write 0 bytes file because it is readonly, triggering catch block
      sync.scaffoldFile(fixturePath(dir, 'pages/page.tsx'));
    });

    it('refresh does not delete route files when pages are removed', () => {
      dir = makeFixture({ 'pages/blogs/page.tsx': '' });
      const { sync } = makeSync(dir);
      sync.refresh();

      removeFixture(dir, 'pages/blogs/page.tsx');
      sync.refresh();

      // Route file stays — it's user-owned now
      expect(fs.existsSync(fixturePath(dir, 'pages/blogs/route.ts'))).toBe(true);
    });
  });

  describe('generate.ts and mdx.ts complete branch coverage', () => {
    it('generates routes for top-level parenthesized route segments (generate.ts:59-63)', () => {
      dir = makeFixture({ 'pages/(dashboard)/page.tsx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const files = generateRouteFiles({
        root: tree,
        routerFile: fixturePath(dir, 'router.ts'),
      });
      const routeContent =
        files.find((f) => f.filePath === fixturePath(dir, 'pages/(dashboard)/route.ts'))?.content ?? '';
      expect(routeContent).toContain("router.add('/dashboard')");
    });

    it('handles custom export default declaration that is not MDXContent (mdx.ts:123-127)', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const code = 'export default function CustomDefault() { return null; }\n';
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code,
        parse,
      });
      expect(result).toContain('function CustomDefault');
    });

    it('handles ordinary named exports, function declarations, and class declarations (mdx.ts:150-152, 161-162, 219-220)', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const code = [
        'export const helperConst = 42;',
        'export class CustomClass {}',
        'export function $install() { console.log("installing"); }',
        'export function $module() { console.log("mod"); }',
      ].join('\n');
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code,
        parse,
      });
      expect(result).toContain("if (typeof $install === 'function') $install();");
      expect(result).toContain("if (typeof $module === 'function') $module();");
      expect(result).toContain('export const helperConst = 42;');
      expect(result).toContain('export class CustomClass {}');
    });

    it('handles specifier exports without declarations and local AST fallback (mdx.ts:202-209)', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const code =
        'const $install = () => {}; const myVar = 100;\nexport { $install };\nexport { myVar as customVar };\n';
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code,
        parse,
      });
      expect(result).toContain("if (typeof $install === 'function') $install();");
      expect(result).toContain('export { myVar as customVar };');

      const customParse = () => ({
        type: 'Program',
        body: [
          {
            type: 'ExportNamedDeclaration',
            declaration: null,
            specifiers: [{ type: 'ExportSpecifier', local: { type: 'Identifier', name: '$install' }, exported: null }],
            start: 0,
            end: 20,
          },
        ],
      });
      const fallbackResult = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code: '/* test code */',
        parse: customParse as any,
      });
      expect(fallbackResult).toContain("if (typeof $install === 'function') $install();");
    });

    it('returns undefined when mdx file directory is not found in scanned tree (mdx.ts:62)', async () => {
      dir = makeFixture({ 'pages/page.mdx': '' });
      const tree = scanPages(fixturePath(dir, 'pages'));
      const result = await mdxAttachForFile({
        file: fixturePath(dir, 'pages/untracked/page.mdx'),
        pagesDir: fixturePath(dir, 'pages'),
        tree,
        framework: 'react',
        code: '',
        parse,
      });
      expect(result).toBeUndefined();
    });
  });
});
