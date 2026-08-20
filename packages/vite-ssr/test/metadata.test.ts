import { afterEach, describe, expect, it } from 'vitest';
import { matchFrontmatter, parseFrontmatterBlock } from '../src/utils/frontmatter.js';
import { cleanFixture, fixtureExists, makeFixture, writeFixture } from './fixture.js';
import { makeApp, readMetadata } from './make-sync.js';

const getFrontmatter = (content: string) => parseFrontmatterBlock(matchFrontmatter(content) ?? '');

describe('mdx metadata generator', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('extracts yaml frontmatter from a content string into a javascript object', () => {
    const content = [
      '---',
      "title: 'Getting Started'",
      'draft: false',
      'rating: 4.5',
      'tags: [react, ssr]',
      'categories:',
      '  - guides',
      '  - tutorials',
      'meta:',
      "  name: 'docs'",
      '---',
      '# Document Content',
    ].join('\n');

    expect(getFrontmatter(content)).toEqual({
      title: 'Getting Started',
      draft: false,
      rating: 4.5,
      tags: ['react', 'ssr'],
      categories: ['guides', 'tutorials'],
      meta: { name: 'docs' },
    });
  });

  it('handles yaml edge cases, empty blocks, and malformed structures', () => {
    expect(getFrontmatter('no frontmatter here')).toEqual({});
    expect(getFrontmatter('---\n# comment only\n---')).toBeNull();

    // A malformed line invalidates the whole block — the frontmatter falls
    // back to empty metadata instead of returning a partial parse.
    const malformedYaml = [
      '---',
      'emptyVal:',
      'jsonObj: {"active": true, "count": 10}',
      'invalidLineWithoutColon',
      'nullVal: ~',
      'intVal: -42',
      'floatVal: 3.14',
      '---',
      'content',
    ].join('\n');
    expect(getFrontmatter(malformedYaml)).toEqual({});

    const blockRes = getFrontmatter(
      [
        '---',
        'items:',
        '  - ',
        '    name: first',
        '    value: 1',
        '  - ',
        '    name: second',
        '    value: 2',
        '---',
      ].join('\n')
    );
    expect(blockRes.items).toEqual([
      { name: 'first', value: 1 },
      { name: 'second', value: 2 },
    ]);
  });

  it('generates a metadata module per mdx file with its frontmatter', () => {
    dir = makeFixture({
      'pages/page.mdx': '---\ntitle: "Root Page"\n---\n# Root\n',
      'pages/docs/page.mdx': '---\ntitle: "Docs Home"\n---\n# Docs\n',
      'pages/blogs/[slug]/test.mdx': '---\ntitle: "Test Post"\n---\n# Test\n',
    });

    app = makeApp(dir);

    const root = readMetadata(dir, 'page.ts');
    expect(root).toContain('export const meta = {');
    expect(root).toContain('"title": "Root Page"');
    expect(root).toContain('export default meta;');

    expect(readMetadata(dir, 'docs/page.ts')).toContain('"title": "Docs Home"');
    expect(readMetadata(dir, 'blogs/[slug]/test.ts')).toContain('"title": "Test Post"');
  });

  it('aggregates direct mdx files into folder index files with canonical paths', () => {
    dir = makeFixture({
      'pages/page.mdx': '---\ntitle: "Root"\n---\n',
      'pages/docs/page.mdx': '---\ntitle: "Docs"\n---\n',
    });

    app = makeApp(dir);

    const rootIndex = readMetadata(dir, 'index.ts');
    expect(rootIndex).toContain("import pageMeta from './page.js';");
    expect(rootIndex).toContain("{ path: '/', meta: pageMeta }");

    const docsIndex = readMetadata(dir, 'docs/index.ts');
    expect(docsIndex).toContain("import docsMeta from './page.js';");
    expect(docsIndex).toContain("{ path: '/docs', meta: docsMeta }");
  });

  it('generates a scoped metadata index per folder without child spreads', () => {
    dir = makeFixture({ 'pages/blogs/[slug]/test.mdx': '---\ntitle: "Post"\n---\n' });

    app = makeApp(dir);

    const slugIndex = readMetadata(dir, 'blogs/[slug]/index.ts');
    expect(slugIndex).toContain("import DynamicTestMeta from './test.js';");
    expect(slugIndex).toContain("{ path: '/blogs/:slug/test', meta: DynamicTestMeta }");
    expect(slugIndex).not.toContain('...');
  });

  it('cleans up generated metadata files when the app is destroyed', () => {
    dir = makeFixture({
      'pages/page.mdx': '---\ntitle: "Root"\n---\n',
      'pages/docs/page.mdx': '---\ntitle: "Docs"\n---\n',
    });

    app = makeApp(dir);
    expect(fixtureExists(dir, '.airlib/metadata/docs/page.ts')).toBe(true);

    app.destroy();
    app = undefined;

    expect(fixtureExists(dir, '.airlib/metadata/index.ts')).toBe(false);
    expect(fixtureExists(dir, '.airlib/metadata/docs/page.ts')).toBe(false);
    expect(fixtureExists(dir, '.airlib/metadata/docs/index.ts')).toBe(false);
  });

  it('regenerates metadata when an mdx file changes', () => {
    dir = makeFixture({
      'pages/guide/page.mdx': '---\ntitle: "Guide"\n---\n# Guide\n',
    });

    app = makeApp(dir);
    expect(readMetadata(dir, 'guide/page.ts')).toContain('"title": "Guide"');

    writeFixture(dir, { 'pages/guide/page.mdx': '---\ntitle: "Updated Guide"\n---\n# Guide\n' });
    app.rootFolder.children.get('guide')?.handleFileChanged('page.mdx');

    expect(readMetadata(dir, 'guide/page.ts')).toContain('"title": "Updated Guide"');
  });
});
