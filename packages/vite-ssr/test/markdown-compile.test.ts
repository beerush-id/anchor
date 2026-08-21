import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIR_ENV } from '../src/modules/env.js';
import { airRecmaPlugin, MDX_DEFAULT_OPTIONS, mdxFile, mdxMatcher, relToPages } from '../src/modules/markdown.js';
import { wrapJsx } from '../src/utils/jsx.js';
import { cleanFixture, fixturePath, makeFixture } from './fixture.js';

const PLAIN_OPTIONS = {
  include: MDX_DEFAULT_OPTIONS.include,
  extended: false,
  headingDepth: MDX_DEFAULT_OPTIONS.headingDepth,
};

describe('mdx compilation — recompilation is driven by source changes', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('reuses the compiled output when the source is unchanged', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const first = await mdxFile(id, '# Same\n', PLAIN_OPTIONS);
    const second = await mdxFile(id, '# Same\n', PLAIN_OPTIONS);

    expect(second.code).toBe(first.code);
  });

  it('recompiles when the source changes', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const first = await mdxFile(id, '# Before\n', PLAIN_OPTIONS);
    const second = await mdxFile(id, '# After\n', PLAIN_OPTIONS);

    expect(second.code).not.toBe(first.code);
  });
});

describe('mdx docs mode — extended plugins enrich markdown', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('injects doc components and transforms directives, code groups, and scripts', async () => {
    dir = makeFixture({ 'pages/docs/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/docs/guide/page.mdx');

    const source = [
      '---',
      'title: Extended Guide',
      '---',
      '',
      ':::note',
      'A callout for readers.',
      ':::',
      '',
      ':::code-group',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      '```ts',
      'const b = 2;',
      '```',
      '',
      ':::',
      '',
      ':::script',
      '',
      '```js module',
      'const moduleScope = 1;',
      '```',
      '',
      ':::',
      '',
      ':::script',
      '',
      '```js',
      'const pageScope = 2;',
      '```',
      '',
      ':::',
      '',
      ':::script',
      '',
      '```python',
      'print("skipped")',
      '```',
      '',
      ':::',
      '',
      ':script',
      '',
      '```ts title="example.ts"',
      'const highlighted = true;',
      '```',
      '',
      '```ts **',
      'const untitled = true;',
      '```',
      '',
    ].join('\n');

    const { file, code } = await mdxFile(id, source, {
      include: MDX_DEFAULT_OPTIONS.include,
      extended: { remarkGfm: {} },
      headingDepth: 3,
    });

    expect(file.metadata.title).toBe('Extended Guide');
    expect(code).toContain('@airlib/react/mdx');
    expect(code).toContain('<AirCodeGroup');
    expect(code).toContain('<AirCodeBlock');
    expect(file.globals.join('\n')).toContain('const moduleScope = 1;');
    expect(file.locals.join('\n')).toContain('const pageScope = 2;');
    expect(file.locals.join('\n')).not.toContain('print("skipped")');
  });

  it('transforms labeled admonitions, badges, and interactive directives', async () => {
    dir = makeFixture({ 'pages/docs/page.mdx': '' });
    const id = fixturePath(dir, 'pages/docs/page.mdx');

    const source = [
      '---',
      'title: Directives',
      '---',
      ':::tip[Custom Title]',
      'Tip content',
      ':::',
      '',
      ':::tip[]{title="Fallback Tip"}',
      'Fallback content',
      ':::',
      '',
      ':::badge[v2.0]{type="success"}',
      ':::',
      '',
      ':::badge[]{type="warning"}',
      ':::',
      '',
      ':::badge',
      'Container Text',
      ':::',
      '',
      ':::badge',
      ':::',
      '',
      ':badge{text="Text Only"}',
      '',
      ':::interactive[Demo View]{rendered="true"}',
      '',
      '```tsx',
      'export default function Demo() { return <div>Demo</div>; }',
      '```',
      '',
      '<Demo />',
      '',
      ':::',
      '',
      ':::interactive{title="Attribute Title"}',
      '',
      '```tsx',
      'export default function AttrDemo() { return <div>Attr</div>; }',
      '```',
      '',
      '<AttrDemo />',
      '',
      ':::',
      '',
      ':::interactive[]{title="Empty Label"}',
      '',
      '```tsx',
      'export default function EmptyDemo() { return <div>Empty</div>; }',
      '```',
      '',
      '<EmptyDemo />',
      '',
      ':::',
      '',
      ':::interactive{rendered="false"}',
      '',
      '```tsx',
      'const hidden = true;',
      '```',
      '',
      ':::',
    ].join('\n');

    const { code } = await mdxFile(id, source, {
      include: MDX_DEFAULT_OPTIONS.include,
      extended: true,
      headingDepth: 3,
    });

    expect(code).toContain('<AirAdmonition title="Custom Title"');
    expect(code).toContain('<AirAdmonition title="Attribute Title"');
    expect(code).toContain('<AirAdmonition title="Empty Label"');
    expect(code).toContain('<AirBadge variant="success"');
    expect(code).toContain('<AirBadge variant="neutral"');
    expect(code).toContain('children="Text Only"');
    expect(code).toContain('air-mdx-interactive-source');
    expect(code).toContain('air-mdx-interactive-render');
  });

  it('compiles markdown sources from outside the pages directory', async () => {
    dir = makeFixture({ 'elsewhere/page.mdx': '' });
    const id = fixturePath(dir, 'elsewhere/page.mdx');

    const { code } = await mdxFile(id, '# Elsewhere\n', PLAIN_OPTIONS);

    expect(code).toContain('export default function AirMdxPage');
  });

  it('enables docs mode with a bare flag', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const { code } = await mdxFile(id, '# Bare\n', {
      include: MDX_DEFAULT_OPTIONS.include,
      extended: true,
      headingDepth: 3,
    });

    expect(code).toContain('@airlib/react/mdx');
  });
});

describe('mdx post-processing — hooks run after every compile', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('applies post-processors and survives their failures', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const { file } = await mdxFile(id, '# Post\n', {
      ...PLAIN_OPTIONS,
      postProcesses: [
        async (module) => {
          module.metadata.annotated = true;
        },
        async () => {
          throw new Error('boom');
        },
      ],
    });

    expect(file.metadata.annotated).toBe(true);
  });
});

describe('mdx headings — ids normalize and depth is configurable', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('records only headings within the configured depth', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const { file } = await mdxFile(id, ['# Top', '', '## A--B', '', '### Deep', ''].join('\n'), {
      ...PLAIN_OPTIONS,
      headingDepth: 2,
    });

    expect(file.headings.map((h) => h.depth)).toEqual([1, 2]);
    expect(file.headings[1].id).toBe('a-b');
  });

  it('captures heading text that begins with inline formatting', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const { file } = await mdxFile(id, '## *Emphasized* heading\n', PLAIN_OPTIONS);

    expect(file.headings[0]).toMatchObject({ text: 'Emphasized', depth: 2 });
  });

  it('skips headings whose content has no plain text', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');

    const { file } = await mdxFile(id, ['# Top', '', '## <Badge />', ''].join('\n'), PLAIN_OPTIONS);

    expect(file.headings.map((h) => h.depth)).toEqual([1]);
  });
});

describe('mdx log identifiers — sources stay project-relative', () => {
  it('names files inside the pages directory by their relative path', () => {
    AIR_ENV.viteRoot = process.cwd();
    AIR_ENV.pagesDir = 'pages';
    const pagesRoot = path.resolve(process.cwd(), 'pages');
    expect(relToPages(path.join(pagesRoot, 'docs', 'page.mdx'))).toBe('docs/page.mdx');
  });

  it('falls back to the basename for files outside the pages directory', () => {
    expect(relToPages('/var/folders/xx/air-pages-abc/elsewhere/page.mdx')).toBe('page.mdx');
  });
});

describe('mdx recma plugin — compiled links unwrap to the runtime Link', () => {
  type NameNode = { type: string; name?: string; object?: NameNode; property?: NameNode };

  function element(tag: string): {
    type: string;
    openingElement: { type: string; name: NameNode };
    closingElement: { type: string; name: NameNode };
  } {
    const name = (): NameNode => ({
      type: 'JSXMemberExpression',
      object: { type: 'JSXIdentifier', name: '_components' },
      property: { type: 'JSXIdentifier', name: tag },
    });
    return {
      type: 'JSXElement',
      openingElement: { type: 'JSXOpeningElement', name: name() },
      closingElement: { type: 'JSXClosingElement', name: name() },
    };
  }

  it('reports link elements and rewrites them to AirLink', () => {
    const cb = vi.fn();
    const tree = element('a');

    airRecmaPlugin(cb)(tree as never);

    expect(cb).toHaveBeenCalledWith({ hasLink: true });
    expect(tree.openingElement.name).toEqual({ type: 'JSXIdentifier', name: 'AirLink' });
  });

  it('unwraps other component references without reporting a link', () => {
    const cb = vi.fn();
    const tree = element('img');

    airRecmaPlugin(cb)(tree as never);

    expect(cb).toHaveBeenCalledWith({ hasLink: false });
    expect(tree.openingElement.name).toEqual({ type: 'JSXIdentifier', name: 'img' });
  });
});

describe('mdx framework wrapping — output adapts to the target runtime', () => {
  it('wraps compiled output in the solid runtime', () => {
    const code = wrapJsx('solid', 'const head = 1;', 'const body = 2;');

    expect(code).toContain("from '@airlib/solid';");
    expect(code).toContain('<AirHtmlHead meta={airMdxMeta} />');
  });

  it('emits nothing for unknown frameworks', () => {
    expect(wrapJsx('svelte' as never, 'const a = 1;', 'const b = 2;')).toBe('');
  });
});

describe('mdx matcher — markdown extensions decide what compiles', () => {
  it('matches module ids by their configured markdown extensions', () => {
    const match = mdxMatcher(['.mdx']);

    expect(match('/src/pages/docs/page.mdx')).toBe(true);
    expect(match('/src/pages/docs/page.md')).toBe(false);
  });
});

describe('mdx compilation pipe — import deduplication and structure', () => {
  let dir = '';
  afterEach(() => cleanFixture(dir));

  it('compiles MDX files containing diverse import patterns through the full pipeline', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');
    const source = [
      '---',
      'title: Guide',
      '---',
      ':::script',
      '',
      '```js module',
      "import './styles.css';",
      "import '';",
      "import React from 'react';",
      "import * as ReactNS from 'react';",
      "import { useState, useState as myState } from 'react';",
      "import type { ReactNode } from 'react';",
      "import { type FC as ReactFC } from 'react';",
      "import { 'custom-slot' as CustomSlot } from 'react';",
      '```',
      '',
      ':::',
      '',
      '# Guide',
      '',
      '<div className="content">Hello</div>',
    ].join('\n');

    const { code } = await mdxFile(id, source, { ...PLAIN_OPTIONS, extended: true });
    expect(code).toBeDefined();
    expect(code).toContain(
      "import React, * as ReactNS, { useState, useState as myState, type ReactNode, type FC as ReactFC, custom-slot as CustomSlot } from 'react';"
    );
    expect(code).toContain("import './styles.css';");
  });

  it('handles script blocks with syntax anomalies by falling back to regex extraction', async () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    const id = fixturePath(dir, 'pages/guide/page.mdx');
    const source = [
      '---',
      'title: Guide',
      '---',
      ':::script',
      '',
      '```js module',
      "import './reset.css';",
      'const x: invalid = ;',
      '```',
      '',
      ':::',
      '',
      '# Guide',
    ].join('\n');

    const { code } = await mdxFile(id, source, { ...PLAIN_OPTIONS, extended: true });
    expect(code).toBeDefined();
    expect(code).toContain("import './reset.css';");
  });

  it('covers recma statement filters for destructured components', () => {
    const plugin = airRecmaPlugin();
    const tree = {
      type: 'Program',
      body: [
        {
          type: 'VariableDeclaration',
          declarations: [
            {
              id: { type: 'ObjectPattern' },
              init: { type: 'Identifier', name: '_components' },
            },
          ],
        },
      ],
    };
    plugin(tree);
    expect(tree.body).toHaveLength(0);
  });
});
