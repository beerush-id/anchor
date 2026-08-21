import { describe, expect, it, vi } from 'vitest';
import {
  airEmulatePrettyCode,
  getAirTransformers,
  getHighlighterSingleton,
  highlightCode,
  wrapHighlightJsx,
} from '../src/modules/highlight.js';

describe('highlight module', () => {
  it('highlights code with bundled language', async () => {
    const res = await highlightCode('const x = 1;', { lang: 'ts', title: 'test.ts' });
    expect(res.code).toBe('const x = 1;');
    expect(res.title).toBe('test.ts');
    expect(res.lang).toBe('ts');
    expect(res.html).toContain('<pre');
    expect(res.html).toContain('const');
  });

  it('handles unknown language load failure', async () => {
    await expect(highlightCode('foo bar', { lang: 'unknown_lang_123' as never })).rejects.toThrow();
  });

  it('supports custom transformers and options', async () => {
    const customTransformer = { name: 'custom' };
    const res = await highlightCode('let a = 2;', {
      lang: 'js',
      transformers: [customTransformer],
      options: { defaultColor: false },
    });
    expect(res.html).toContain('<pre');
  });

  it('emulates pretty code transformer for code and line nodes', () => {
    const transformer = airEmulatePrettyCode();

    const codeNode = { properties: {} as Record<string, unknown>, data: {} as Record<string, unknown> };
    const ctx = { options: { lang: 'python', meta: { __raw: '[title.py]' } } };
    (transformer.code as Function).call(ctx, codeNode);
    expect(codeNode.properties['data-language']).toBe('python');
    expect(codeNode.properties.style).toContain('display: grid;');
    expect((codeNode.data as Record<string, unknown>).meta).toBe('[title.py]');

    // Empty line children fallback
    const emptyLineNode = { properties: {} as Record<string, unknown>, children: [] as unknown[] };
    (transformer.line as Function)(emptyLineNode);
    expect(emptyLineNode.properties['data-line']).toBe('');
    expect(emptyLineNode.children).toEqual([{ type: 'text', value: '\n' }]);

    // Line with existing properties and children
    const lineNodeWithProps = {
      properties: { className: 'custom-line' } as Record<string, unknown>,
      children: [{ type: 'text', value: 'hello' }],
    };
    (transformer.line as Function)(lineNodeWithProps);
    expect(lineNodeWithProps.properties['data-line']).toBe('');
    expect(lineNodeWithProps.children).toHaveLength(1);

    // Code node with existing style and pre-existing properties, without meta or lang
    const codeNodeWithStyle = {
      properties: { style: 'color: red; ' } as Record<string, unknown>,
      data: { initial: 1 } as Record<string, unknown>,
    };
    const emptyCtx = { options: {} };
    (transformer.code as Function).call(emptyCtx, codeNodeWithStyle);
    expect(codeNodeWithStyle.properties.style).toBe('color: red; display: grid;');
    expect(codeNodeWithStyle.properties['data-language']).toBeUndefined();
    expect(codeNodeWithStyle.data.initial).toBe(1);

    // Code node with null properties/data
    const bareCodeNode = {} as Record<string, unknown>;
    (transformer.code as Function).call({ options: { lang: 'js' } }, bareCodeNode);
    expect((bareCodeNode.properties as Record<string, unknown>)['data-language']).toBe('js');

    // Code node without properties and without lang/meta
    const uninitializedCodeNode = {} as Record<string, unknown>;
    (transformer.code as Function).call({ options: {} }, uninitializedCodeNode);
    expect((uninitializedCodeNode.properties as Record<string, unknown>).style).toBe('display: grid;');

    // Line node without properties property
    const uninitializedLineNode = { children: [{ type: 'text', value: 'code' }] } as Record<string, unknown>;
    (transformer.line as Function)(uninitializedLineNode);
    expect((uninitializedLineNode.properties as Record<string, unknown>)['data-line']).toBe('');

    // Root wrapping with figure
    const rootNode = {
      children: [{ type: 'element', tagName: 'pre', properties: {}, children: [] }],
    };
    (transformer.root as Function)(rootNode);
    expect(rootNode.children[0]).toMatchObject({
      type: 'element',
      tagName: 'figure',
      properties: { 'data-rehype-pretty-code-figure': '' },
    });

    // Root when first child is not pre
    const nonPreRoot = {
      children: [{ type: 'element', tagName: 'div', properties: {}, children: [] }],
    };
    (transformer.root as Function)(nonPreRoot);
    expect(nonPreRoot.children[0].tagName).toBe('div');
  });

  it('loads air transformers array', async () => {
    const transformers = await getAirTransformers();
    expect(transformers.length).toBeGreaterThan(0);
  });

  it('wraps highlight output into React JSX component', () => {
    const code = wrapHighlightJsx({
      framework: 'react',
      html: '<figure><pre><code>hello</code></pre></figure>',
    });
    expect(code).toContain('className="air-code-hihlight"');
    expect(code).toContain('dangerouslySetInnerHTML');
    expect(code).not.toContain('<figure');
  });

  it('wraps highlight output into Solid JSX component', () => {
    const code = wrapHighlightJsx({
      framework: 'solid',
      html: '<figure><pre><code>hello</code></pre></figure>',
    });
    expect(code).toContain('class="air-code-hihlight"');
    expect(code).toContain('innerHTML={');
    expect(code).not.toContain('<figure');
  });

  it('reuses singleton highlighter across calls', async () => {
    const h1 = await getHighlighterSingleton();
    const h2 = await getHighlighterSingleton();
    expect(h1).toBe(h2);
  });

  it('throws friendly error when Shiki fails to load', async () => {
    vi.resetModules();
    vi.doMock('shiki', () => {
      throw new Error('module not found');
    });

    const { getHighlighterSingleton: getFailingHighlighter } = await import('../src/modules/highlight.js');
    await expect(getFailingHighlighter()).rejects.toThrow('Shiki is not installed');
    vi.doUnmock('shiki');
    vi.resetModules();
  });
});
