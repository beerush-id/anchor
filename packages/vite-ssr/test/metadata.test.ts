import { afterEach, describe, expect, it } from 'vitest';
import { extractFrontmatter, generateMetadata, generateSingleMetadata } from '../src/pages/metadata.js';
import { scanPages } from '../src/pages/model.js';
import { cleanFixture, fixturePath, makeFixture } from './fixture.js';

describe('mdx metadata generator', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('extracts yaml frontmatter from content string into javascript object', () => {
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

    const result = extractFrontmatter(content);
    expect(result).toEqual({
      title: 'Getting Started',
      draft: false,
      rating: 4.5,
      tags: ['react', 'ssr'],
      categories: ['guides', 'tutorials'],
      meta: { name: 'docs' },
    });
  });

  it('generates individual typescript modules and index array for discovered mdx files', () => {
    dir = makeFixture({
      'pages/blogs/[slug]/test.mdx': '---\ntitle: "Test Post"\n---\n# Test\n',
      'pages/docs/page.mdx': '---\ntitle: "Docs Home"\n---\n# Docs\n',
      'pages/page.mdx': '---\ntitle: "Root Page"\n---\n# Root\n',
      'pages/_.mdx': '---\ntitle: "Fallback"\n---\n# Fallback\n',
    });

    const pagesDir = fixturePath(dir, 'pages');
    const metadataDir = fixturePath(dir, 'metadata');
    const tree = scanPages(pagesDir);

    const generated = generateMetadata({
      root: tree,
      metadataDir,
    });

    const paths = generated.map((f) => f.filePath);
    expect(paths).toContain(fixturePath(dir, 'metadata/blogs/[slug]/test.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/docs/page.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/page.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/_.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/index.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/blogs/index.ts'));
    expect(paths).toContain(fixturePath(dir, 'metadata/docs/index.ts'));

    const testPostFile = generated.find((f) => f.filePath === fixturePath(dir, 'metadata/blogs/[slug]/test.ts'));
    expect(testPostFile?.content).toContain('export const meta = {');
    expect(testPostFile?.content).toContain('"title": "Test Post"');
    expect(testPostFile?.content).toContain('export default meta;');

    const indexFile = generated.find((f) => f.filePath === fixturePath(dir, 'metadata/index.ts'));
    expect(indexFile?.content).toContain("import blogsDynamicTestMeta from './blogs/[slug]/test.js';");
    expect(indexFile?.content).toContain("import docsPageMeta from './docs/page.js';");
    expect(indexFile?.content).toContain("import pageMeta from './page.js';");
    expect(indexFile?.content).toContain("import rootMeta from './_.js';");
    expect(indexFile?.content).toContain("{ path: '/blogs/:slug/test', meta: blogsDynamicTestMeta }");
    expect(indexFile?.content).toContain("{ path: '/docs', meta: docsPageMeta }");
    expect(indexFile?.content).toContain("{ path: '/', meta: pageMeta }");
    expect(indexFile?.content).toContain("{ path: '/_', meta: rootMeta }");

    const blogsIndexFile = generated.find((f) => f.filePath === fixturePath(dir, 'metadata/blogs/index.ts'));
    expect(blogsIndexFile?.content).toContain("import blogsDynamicTestMeta from './[slug]/test.js';");
    expect(blogsIndexFile?.content).toContain("{ path: '/blogs/:slug/test', meta: blogsDynamicTestMeta }");
  });

  it('handles single file generation, read failures, and cache utilization', () => {
    dir = makeFixture({
      'pages/doc.mdx': '---\ntitle: "Cache Test"\n---\n# Cache\n',
      'pages/page.mdx': '---\ntitle: "Root Single"\n---\n# Root\n',
      'pages/_.mdx': '---\ntitle: "Root Fallback"\n---\n# Fallback\n',
    });

    const pagesDir = fixturePath(dir, 'pages');
    const metadataDir = fixturePath(dir, 'metadata');
    const absDocPath = fixturePath(dir, 'pages/doc.mdx');
    const cache = new Map();

    const single = generateSingleMetadata({
      absPath: absDocPath,
      pagesDir,
      metadataDir,
      cache,
    });

    expect(single?.filePath).toContain('doc.ts');
    expect(cache.has(absDocPath)).toBe(true);

    const rootSingle = generateSingleMetadata({
      absPath: fixturePath(dir, 'pages/page.mdx'),
      pagesDir,
      metadataDir,
    });
    expect(rootSingle?.filePath).toContain('page.ts');

    const fallbackSingle = generateSingleMetadata({
      absPath: fixturePath(dir, 'pages/_.mdx'),
      pagesDir,
      metadataDir,
    });
    expect(fallbackSingle?.content).toContain('Root Fallback');

    const tree = scanPages(pagesDir);
    const cachedResult = generateMetadata({
      root: tree,
      metadataDir,
      pagesDir,
      cache,
    });
    expect(cachedResult.length).toBeGreaterThan(0);

    const nonExistent = generateSingleMetadata({
      absPath: fixturePath(dir, 'pages/non-existent.mdx'),
      pagesDir,
      metadataDir,
      cache,
    });
    expect(nonExistent).toBeUndefined();
  });

  it('handles yaml frontmatter edge cases, empty blocks, and malformed structures', () => {
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

    const nestedBlocksYaml = [
      '---',
      'items:',
      '  - ',
      '    name: first',
      '    value: 1',
      '  - ',
      '    name: second',
      '    value: 2',
      '---',
    ].join('\n');

    const blockRes = extractFrontmatter(nestedBlocksYaml);
    expect(blockRes.items).toEqual([
      { name: 'first', value: 1 },
      { name: 'second', value: 2 },
    ]);

    let recursiveYaml = '---\n';
    for (let i = 0; i < 5000; i++) {
      recursiveYaml += ' '.repeat(i) + 'key:\n';
    }
    recursiveYaml += '---';
    expect(extractFrontmatter(recursiveYaml)).toEqual({});
  });

  it('handles metadataDir ending with a trailing slash during prefix normalization', () => {
    dir = makeFixture({
      'pages/page.mdx': '---\ntitle: "Root"\n---\n',
    });
    const pagesDir = fixturePath(dir, 'pages');
    const metadataDir = `${fixturePath(dir, 'metadata')}/`;
    const tree = scanPages(pagesDir);

    const generated = generateMetadata({ root: tree, pagesDir, metadataDir });
    expect(generated.length).toBeGreaterThan(0);
  });
});
