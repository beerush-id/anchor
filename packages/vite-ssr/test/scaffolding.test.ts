import { afterEach, describe, expect, it } from 'vitest';
import type { Framework } from '../src/pages/generate.js';
import { scaffoldForFile } from '../src/pages/scaffold.js';
import { cleanFixture, fixtureExists, makeFixture, readFixture } from './fixture.js';
import { flushScaffold, folderAt, makeApp } from './make-sync.js';

function scaffold(dir: string, folderRel: string, base: string, framework: Framework = 'react') {
  const app = makeApp(dir);
  const folder = folderAt(app, folderRel);
  const content = folder ? scaffoldForFile({ base, folder, framework }) : undefined;
  app.destroy();
  return content;
}

describe('scaffolding — empty files become working pages', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('scaffolds a leaf page with its named route and a visible heading', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });
    const content = scaffold(dir, 'blogs', 'page.tsx');

    expect(content).toContain("import { page } from '@anchorlib/react';");
    expect(content).toContain("import { blogsRoute } from './route.js';");
    expect(content).toContain('page(blogsRoute).render(');
    expect(content).toContain('<h1>Blogs</h1>');
  });

  it('scaffolds an index-case page with the index route', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '', 'pages/about/layout.tsx': '' });
    const content = scaffold(dir, 'about', 'page.tsx');

    expect(content).toContain("import { aboutIndexRoute } from './route.js';");
    expect(content).toContain('page(aboutIndexRoute).render(');
  });

  it('scaffolds a layout as a children passthrough', () => {
    dir = makeFixture({ 'pages/about/layout.tsx': '' });
    const content = scaffold(dir, 'about', 'layout.tsx');

    expect(content).toContain("import { aboutRoute } from './route.js';");
    expect(content).toContain('page(aboutRoute).render(({ children })');
    expect(content).toContain('children');
  });

  it('scaffolds the root layout against the root route', () => {
    dir = makeFixture({ 'pages/layout.tsx': '' });
    const content = scaffold(dir, '', 'layout.tsx');

    expect(content).toContain("import { rootRoute } from './route.js';");
    expect(content).toContain('page(rootRoute).render(({ children })');
  });

  it('scaffolds the root page with a Home heading', () => {
    dir = makeFixture({ 'pages/page.tsx': '' });
    const content = scaffold(dir, '', 'page.tsx');

    expect(content).toContain("import { rootRoute } from './route.js';");
    expect(content).toContain('<h1>Home</h1>');
  });

  it('scaffolds an mdx page with frontmatter and a heading', () => {
    dir = makeFixture({ 'pages/docs/getting-started/page.mdx': '' });
    const content = scaffold(dir, 'docs/getting-started', 'page.mdx');

    expect(content).toContain('title: Getting Started');
    expect(content).toContain('# Getting Started');
  });

  it('scaffolds solid starters for the solid framework', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '' });
    const content = scaffold(dir, 'blogs', 'page.tsx', 'solid');

    expect(content).toContain("import { page } from '@anchorlib/solid';");
  });

  it('scaffolds inside a folder with existing route.ts', () => {
    dir = makeFixture({ 'pages/blogs/route.ts': '// hand-written\n', 'pages/blogs/page.tsx': '' });

    const content = scaffold(dir, 'blogs', 'page.tsx');
    expect(content).toContain("import { blogsRoute } from './route.js';");
  });

  it('keeps scaffolds free of route configuration', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '', 'pages/blogs/layout.tsx': '' });

    for (const base of ['page.tsx', 'layout.tsx']) {
      const content = scaffold(dir, 'blogs', base) ?? '';
      expect(content).not.toContain('.guard(');
      expect(content).not.toContain('.provide(');
    }
  });

  it('fills an empty page file only after its route file exists', async () => {
    dir = makeFixture({ 'router.ts': '', 'pages/contact/page.tsx': '' });

    app = makeApp(dir);
    expect(fixtureExists(dir, 'pages/contact/route.ts')).toBe(true);

    await flushScaffold();

    expect(readFixture(dir, 'pages/contact/route.ts')).toContain('export const contactRoute');
    expect(readFixture(dir, 'pages/contact/page.tsx')).toContain("import { contactRoute } from './route.js';");
  });

  it('never rewrites a file that already has content', async () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '// user content\n' });

    app = makeApp(dir);
    await flushScaffold();

    expect(readFixture(dir, 'pages/blogs/page.tsx')).toBe('// user content\n');
  });

  it('gates app-domain scaffolding only, not route-domain pages', async () => {
    // The scaffold option belongs to AppNode's own domain (app entry files).
    // page.tsx is route domain — RouteNode scaffolds it regardless.
    dir = makeFixture({ 'router.ts': '', 'src/app.tsx': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir, { scaffold: false });
    await flushScaffold();

    expect(readFixture(dir, 'src/app.tsx')).toBe('');
    expect(readFixture(dir, 'pages/blogs/page.tsx')).toContain("import { blogsRoute } from './route.js';");
  });

  it('scaffolds app.tsx, client.tsx, and worker.ts when present as empty files in app dir', () => {
    dir = makeFixture({ 'router.ts': '', 'src/app.tsx': '', 'src/client.tsx': '', 'src/worker.ts': '' });

    app = makeApp(dir);

    expect(readFixture(dir, 'src/app.tsx')).toContain('export default (({ url }) =>');
    expect(readFixture(dir, 'src/client.tsx')).toContain("import '@anchorlib/react/client';");
    expect(readFixture(dir, 'src/worker.ts')).toContain("import { createApp } from '@anchorlib/react/ssr';");
    expect(readFixture(dir, 'src/global.d.ts')).toContain('interface AirRouteMeta');
  });

  it('scaffolds client.tsx with solid hydration when framework is solid', () => {
    dir = makeFixture({ 'router.ts': '', 'src/client.tsx': '' });

    app = makeApp(dir, { framework: 'solid' });

    expect(readFixture(dir, 'src/client.tsx')).toContain("import { hydrate } from 'solid-js/web';");
  });

  it('returns undefined from scaffoldForFile when folder is missing for page files', () => {
    expect(scaffoldForFile({ base: 'page.tsx', framework: 'react' })).toBeUndefined();
    expect(scaffoldForFile({ base: 'random.ts', framework: 'react' })).toBeUndefined();
  });
});
