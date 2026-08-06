import { afterEach, describe, expect, it } from 'vitest';
import { extractFrontmatter, generateMetadata } from '../src/pages/metadata.js';
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
    expect(paths).toContain(fixturePath(dir, 'metadata/index.ts'));

    const testPostFile = generated.find((f) => f.filePath === fixturePath(dir, 'metadata/blogs/[slug]/test.ts'));
    expect(testPostFile?.content).toContain('export const meta = {');
    expect(testPostFile?.content).toContain('"title": "Test Post"');
    expect(testPostFile?.content).toContain('export default meta;');

    const indexFile = generated.find((f) => f.filePath === fixturePath(dir, 'metadata/index.ts'));
    expect(indexFile?.content).toContain("import blogsDynamicTestMeta from './blogs/[slug]/test.js';");
    expect(indexFile?.content).toContain("import docsPageMeta from './docs/page.js';");
    expect(indexFile?.content).toContain("{ path: '/blogs/:slug/test', meta: blogsDynamicTestMeta }");
    expect(indexFile?.content).toContain("{ path: '/docs', meta: docsPageMeta }");
  });
});
