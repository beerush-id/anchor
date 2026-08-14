import * as acorn from 'acorn';
import { afterEach, describe, expect, it } from 'vitest';
import { mdxAttachForFile } from '../src/plugins/mdx-route.js';
import { cleanFixture, fixtureExists, fixturePath, makeFixture } from './fixture.js';
import { makeApp } from './make-sync.js';

const parse = (code: string) => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });

async function attach(dir: string, file: string, framework: 'react' | 'solid' = 'react', code = '') {
  const app = makeApp(dir);
  const result = await mdxAttachForFile({
    file: fixturePath(dir, file),
    pagesDir: fixturePath(dir, 'pages'),
    tree: app.rootFolder,
    framework,
    code,
    parse,
  });
  app.destroy();
  return result;
}

describe('mdx pages — MDX files are pages', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('treats an mdx page as a routable content node', () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });

    app = makeApp(dir);

    expect(fixtureExists(dir, 'pages/docs/route.ts')).toBe(true);
    expect(fixtureExists(dir, 'pages/docs/getting-started/route.ts')).toBe(true);
  });

  it('attaches the mdx component to the folder route with head tag and frontmatter meta', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/getting-started/page.mdx');

    expect(snippet).toContain("import { docsGettingStartedRoute as __airRoute } from './route.js';");
    expect(snippet).toContain("import { Head as __airHeadTag } from '@anchorlib/react';");
    expect(snippet).toContain("from 'react/jsx-runtime';");
    expect(snippet).toContain('__airRoute.render(');
    expect(snippet).toContain('__airJsx(__airHeadTag, { meta: __airFm })');
  });

  it('transforms full mdx module code by partitioning module side-effects and setup declarations', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const code = [
      "import { derived } from '@anchorlib/react';",
      "export const frontmatter = { title: 'Docs', route: { meta: { name: 'docs' } } };",
      "export const $module = () => { console.log('init'); };",
      "export const $local = derived.as(() => ({ label: 'test' }));",
      'function MDXContent(props = {}) { return null; }',
      'export default MDXContent;',
    ].join('\n');

    const app = makeApp(dir);
    const result = await mdxAttachForFile({
      file: fixturePath(dir, 'pages/docs/getting-started/page.mdx'),
      pagesDir: fixturePath(dir, 'pages'),
      tree: app.rootFolder,
      framework: 'react',
      code,
      parse,
    });
    app.destroy();

    expect(result).toBeDefined();
    expect(result).toContain("import { derived } from '@anchorlib/react';");
    expect(result).toContain("if (typeof $module === 'function') $module();");
    expect(result).not.toContain('export const $local');
    expect(result).toContain("const $local = derived.as(() => ({ label: 'test' }));");
    expect(result).toContain("const frontmatter = { title: 'Docs', route: { meta: { name: 'docs' } } };");
    expect(result).toContain('__airComponentRender(() =>');
  });

  it('attaches a root mdx page with a root layout to indexRoute', async () => {
    dir = makeFixture({ 'pages/page.mdx': '', 'pages/layout.tsx': '', 'pages/about/page.tsx': '' });
    const snippet = await attach(dir, 'pages/page.mdx');

    expect(snippet).toContain("import { indexRoute as __airRoute } from './route.js';");
  });

  it('attaches an index-case mdx page to the index route', async () => {
    dir = makeFixture({ 'pages/docs/page.mdx': '', 'pages/docs/layout.tsx': '' });
    const snippet = await attach(dir, 'pages/docs/page.mdx');

    expect(snippet).toContain("import { docsIndexRoute as __airRoute } from './route.js';");
  });

  it('uses the solid runtime for solid framework mdx pages', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/getting-started/page.mdx', 'solid');

    expect(snippet).toContain("from 'solid-js/jsx-runtime';");
    expect(snippet).toContain("from '@anchorlib/solid';");
  });

  it('attaches nothing outside the pages directory', async () => {
    dir = makeFixture({ 'elsewhere/page.mdx': '' });
    const snippet = await attach(dir, 'elsewhere/page.mdx');

    expect(snippet).toBeUndefined();
  });

  it('attaches normally even when route.ts is user-land (hand-written)', async () => {
    dir = makeFixture({ 'pages/docs/route.ts': '// hand-written\n', 'pages/docs/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/page.mdx');

    expect(snippet).toContain("import { docsRoute as __airRoute } from './route.js';");
  });

  it('attaches nothing to mdx files that are not pages', async () => {
    dir = makeFixture({ 'pages/docs/note.mdx': '# note\n' });
    const snippet = await attach(dir, 'pages/docs/note.mdx');

    expect(snippet).toBeUndefined();
  });

  it('attaches nothing when the folder also has a page.tsx (tsx wins)', async () => {
    dir = makeFixture({ 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/page.mdx');

    expect(snippet).toBeUndefined();
  });

  it('attaches layout.mdx to the folder route', async () => {
    dir = makeFixture({ 'pages/docs/layout.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/layout.mdx');

    expect(snippet).toContain("import { docsRoute as __airRoute } from './route.js';");
  });

  it('attaches named mdx page to its derived route', async () => {
    dir = makeFixture({ 'pages/docs/v1.page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/v1.page.mdx');

    expect(snippet).toContain("import { docsV1Route as __airRoute } from './route.js';");
  });

  it('attaches named mdx page in root folder', async () => {
    dir = makeFixture({ 'pages/v1.page.mdx': '' });
    const snippet = await attach(dir, 'pages/v1.page.mdx');

    expect(snippet).toContain("import { v1Route as __airRoute } from './route.js';");
  });
});
