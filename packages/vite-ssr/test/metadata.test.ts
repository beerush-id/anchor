import { afterEach, describe, expect, it } from 'vitest';
import { extractFrontmatter } from '../src/pages/markdown-node.js';
import { cleanFixture, fixtureExists, makeFixture, writeFixture } from './fixture.js';
import { makeApp, readMetadata } from './make-sync.js';

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

    expect(extractFrontmatter(content)).toEqual({
      title: 'Getting Started',
      draft: false,
      rating: 4.5,
      tags: ['react', 'ssr'],
      categories: ['guides', 'tutorials'],
      meta: { name: 'docs' },
    });
  });

  it('handles yaml edge cases, empty blocks, and malformed structures', () => {
    expect(extractFrontmatter('no frontmatter here')).toEqual({});
    expect(extractFrontmatter('---\n# comment only\n---')).toEqual({});

    const complexYaml = [
      '---',
      'emptyVal:',
      'jsonObj: {"active": true, "count": 10}',
      'nestedList:',
      '  - - nested 1',
      '    - nested 2',
      'invalidLineWithoutColon',
      '# comment line',
      'nullVal: ~',
      'nullStr: null',
      'trueVal: true',
      'falseVal: false',
      'invalidJson: {not valid json}',
      'intVal: -42',
      'floatVal: 3.14',
      '---',
      'content',
    ].join('\n');

    const res = extractFrontmatter(complexYaml);
    expect(res.emptyVal).toBe('');
    expect(res.jsonObj).toEqual({ active: true, count: 10 });
    expect(res.nullVal).toBe(null);
    expect(res.nullStr).toBe(null);
    expect(res.trueVal).toBe(true);
    expect(res.falseVal).toBe(false);
    expect(res.invalidJson).toBe('{not valid json}');
    expect(res.intVal).toBe(-42);
    expect(res.floatVal).toBe(3.14);

    const blockRes = extractFrontmatter([
      '---',
      'items:',
      '  - ',
      '    name: first',
      '    value: 1',
      '  - ',
      '    name: second',
      '    value: 2',
      '---',
    ].join('\n'));
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
    expect(docsIndex).toContain("import docsPageMeta from './page.js';");
    expect(docsIndex).toContain("{ path: '/docs', meta: docsPageMeta }");
  });

  it('aggregates nested mdx folders into their parent index', () => {
    dir = makeFixture({ 'pages/blogs/[slug]/test.mdx': '---\ntitle: "Post"\n---\n' });

    app = makeApp(dir);

    const rootIndex = readMetadata(dir, 'index.ts');
    expect(rootIndex).toContain('...');
    expect(fixtureExists(dir, '.airstack/metadata/blogs/index.ts')).toBe(true);
  });

  it('cleans up generated metadata files when the app is destroyed', () => {
    dir = makeFixture({
      'pages/page.mdx': '---\ntitle: "Root"\n---\n',
      'pages/docs/page.mdx': '---\ntitle: "Docs"\n---\n',
    });

    app = makeApp(dir);
    expect(fixtureExists(dir, '.airstack/metadata/docs/page.ts')).toBe(true);

    app.destroy();
    app = undefined;

    expect(fixtureExists(dir, '.airstack/metadata/index.ts')).toBe(false);
    expect(fixtureExists(dir, '.airstack/metadata/docs/page.ts')).toBe(false);
    expect(fixtureExists(dir, '.airstack/metadata/docs/index.ts')).toBe(false);
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
