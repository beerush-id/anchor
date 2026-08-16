import { afterEach, describe, expect, it } from 'vitest';
import { AIR_ENV } from '../src/modules/env.js';
import { MDX_DEFAULT_OPTIONS, mdxEntryWrapper, mdxFile } from '../src/modules/markdown.js';
import { DEFAULT_FILE_MAP } from '../src/utils/mapper.js';
import { cleanFixture, fixtureExists, fixturePath, makeFixture } from './fixture.js';
import { makeApp } from './make-sync.js';

async function attach(dir: string, file: string, framework: 'react' | 'solid' = 'react') {
  const app = makeApp(dir);
  const resolution = AIR_ENV.routes.resolve(fixturePath(dir, file));
  const wrapper = resolution
    ? mdxEntryWrapper({
        file: fixturePath(dir, file),
        resolution,
        framework,
        files: DEFAULT_FILE_MAP,
        chunkName: './page.mdx?chunk',
      })
    : undefined;
  app.destroy();
  return wrapper;
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

  it('binds the compiled chunk to the derived route export with a lazy render wrapper', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/getting-started/page.mdx');

    expect(snippet).toContain("import { page as __airPage } from '@anchorlib/react';");
    expect(snippet).toContain("import { gettingStartedRoute as __airRoute } from './route.ts';");
    expect(snippet).toContain('export default __airPage(__airRoute).renderAsync(async () => {');
    expect(snippet).toContain("await import('./page.mdx?chunk')");
  });

  it('captures frontmatter metadata and renders the head tag from the compiled module', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const { file, code } = await mdxFile(
      fixturePath(dir, 'pages/docs/getting-started/page.mdx'),
      ['---', 'title: Docs', 'description: AIR docs', '---', '# Getting Started'].join('\n'),
      {
        include: MDX_DEFAULT_OPTIONS.include,
        extended: false,
        headingDepth: MDX_DEFAULT_OPTIONS.headingDepth,
      }
    );

    expect(file.metadata.title).toBe('Docs');
    expect(file.metadata.description).toBe('AIR docs');
    expect(code).toContain('<AirHead meta={airMdxMeta} />');
    expect(code).toContain('export function AirMdxPage');
  });

  it('attaches a root mdx page with a root layout to indexRoute', async () => {
    dir = makeFixture({ 'pages/page.mdx': '', 'pages/layout.tsx': '', 'pages/about/page.tsx': '' });
    const snippet = await attach(dir, 'pages/page.mdx');

    expect(snippet).toContain("import { indexRoute as __airRoute } from './route.ts';");
  });

  it('attaches an index-case mdx page to the index route', async () => {
    dir = makeFixture({ 'pages/docs/page.mdx': '', 'pages/docs/layout.tsx': '' });
    const snippet = await attach(dir, 'pages/docs/page.mdx');

    expect(snippet).toContain("import { docsIndexRoute as __airRoute } from './route.ts';");
  });

  it('uses the solid runtime for solid framework mdx pages', async () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/getting-started/page.mdx', 'solid');

    expect(snippet).toContain("import { page as __airPage } from '@anchorlib/solid';");
  });

  it('attaches nothing outside the pages directory', async () => {
    dir = makeFixture({ 'elsewhere/page.mdx': '' });
    const snippet = await attach(dir, 'elsewhere/page.mdx');

    expect(snippet).toBeUndefined();
  });

  it('attaches normally even when route.ts is user-land (hand-written)', async () => {
    dir = makeFixture({ 'pages/docs/route.ts': '// hand-written\n', 'pages/docs/page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/page.mdx');

    expect(snippet).toContain("import { docsRoute as __airRoute } from './route.ts';");
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

    expect(snippet).toContain("import { docsRoute as __airRoute } from './route.ts';");
  });

  it('attaches named mdx page to its derived route', async () => {
    dir = makeFixture({ 'pages/docs/v1.page.mdx': '' });
    const snippet = await attach(dir, 'pages/docs/v1.page.mdx');

    expect(snippet).toContain("import { docsV1Route as __airRoute } from './route.ts';");
  });

  it('attaches named mdx page in root folder', async () => {
    dir = makeFixture({ 'pages/v1.page.mdx': '' });
    const snippet = await attach(dir, 'pages/v1.page.mdx');

    expect(snippet).toContain("import { v1Route as __airRoute } from './route.ts';");
  });
});
