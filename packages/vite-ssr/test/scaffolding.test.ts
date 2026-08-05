import { afterEach, describe, expect, it } from 'vitest';
import { type Framework, scaffoldForFile } from '../src/pages/generate.js';
import { findFolder, scanPages } from '../src/pages/model.js';
import { cleanFixture, fixtureExists, fixturePath, makeFixture, readFixture } from './fixture.js';
import { makeSync } from './make-sync.js';

function scaffold(dir: string, folderRel: string, base: string, framework: Framework = 'react') {
  const tree = scanPages(fixturePath(dir, 'pages'));
  const folder = findFolder(tree, fixturePath(dir, folderRel ? `pages/${folderRel}` : 'pages'));
  if (!folder) throw new Error(`folder not found: ${folderRel || '.'}`);
  return scaffoldForFile({ base, folder, framework });
}

describe('scaffolding — empty files become working pages', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

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

  it('scaffolds the root layout against the root route from the router file', () => {
    dir = makeFixture({ 'pages/layout.tsx': '' });
    const content = scaffold(dir, '', 'layout.tsx');

    expect(content).toContain("import { rootRoute } from './route.js';");
    expect(content).toContain('page(rootRoute).render(({ children })');
  });

  it('scaffolds the root page against indexRoute', () => {
    dir = makeFixture({ 'pages/page.tsx': '' });
    const content = scaffold(dir, '', 'page.tsx');

    expect(content).toContain("import { indexRoute } from './route.js';");
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
    dir = makeFixture({
      'pages/blogs/route.ts': '// hand-written\n',
      'pages/blogs/page.tsx': '',
    });

    const content = scaffold(dir, 'blogs', 'page.tsx');
    expect(content).toContain("import { blogsRoute } from './route.js';");
  });

  it('keeps scaffolds free of route configuration', () => {
    dir = makeFixture({ 'pages/blogs/page.tsx': '', 'pages/blogs/layout.tsx': '' });

    for (const content of [scaffold(dir, 'blogs', 'page.tsx') ?? '', scaffold(dir, 'blogs', 'layout.tsx') ?? '']) {
      expect(content).not.toContain('.guard(');
      expect(content).not.toContain('.provide(');
    }
  });

  it('fills an empty page file only after its route file exists', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/contact/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(fixtureExists(dir, 'pages/contact/route.ts')).toBe(true);

    sync.scaffoldFile(fixturePath(dir, 'pages/contact/page.tsx'));

    expect(readFixture(dir, 'pages/contact/route.ts')).toContain('export const contactRoute');
    expect(readFixture(dir, 'pages/contact/page.tsx')).toContain("import { contactRoute } from './route.js';");
  });

  it('never rewrites a file that already has content', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '// user content\n' });

    const { sync } = makeSync(dir);
    sync.refresh();
    sync.scaffoldFile(fixturePath(dir, 'pages/blogs/page.tsx'));

    expect(readFixture(dir, 'pages/blogs/page.tsx')).toBe('// user content\n');
  });

  it('writes nothing when scaffolding is disabled', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    const { sync } = makeSync(dir, { scaffold: false });
    sync.refresh();
    sync.scaffoldFile(fixturePath(dir, 'pages/blogs/page.tsx'));

    expect(readFixture(dir, 'pages/blogs/page.tsx')).toBe('');
  });

  it('scaffolds app.tsx, client.tsx, and worker.ts when present as empty files in app dir', () => {
    dir = makeFixture({ 'router.ts': '', 'app.tsx': '', 'client.tsx': '', 'worker.ts': '' });

    const { sync } = makeSync(dir);
    sync.refresh();

    expect(readFixture(dir, 'app.tsx')).toContain('export default (({ url }) =>');
    expect(readFixture(dir, 'client.tsx')).toContain("import '@anchorlib/react/client';");
    expect(readFixture(dir, 'worker.ts')).toContain("import { createApp } from '@anchorlib/react/ssr';");
  });

  it('scaffolds client.tsx with solid hydration when framework is solid', () => {
    dir = makeFixture({ 'router.ts': '', 'client.tsx': '' });

    const { sync } = makeSync(dir, { framework: 'solid' });
    sync.refresh();

    expect(readFixture(dir, 'client.tsx')).toContain("import { render } from 'solid-js/web';");
  });

  it('returns undefined from scaffoldForFile when folder is missing for page files', () => {
    expect(scaffoldForFile({ base: 'page.tsx', framework: 'react' })).toBeUndefined();
  });
});
