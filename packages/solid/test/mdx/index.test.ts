import { describe, expect, it } from 'vitest';
import * as mdxExports from '../../src/mdx/index.js';

describe('MDX Package Exports', () => {
  it('exports all documentation components and context utilities', () => {
    expect(mdxExports.Admonition).toBeDefined();
    expect(mdxExports.NoteBlock).toBeDefined();
    expect(mdxExports.TipBlock).toBeDefined();
    expect(mdxExports.InfoBlock).toBeDefined();
    expect(mdxExports.WarningBlock).toBeDefined();
    expect(mdxExports.DangerBlock).toBeDefined();
    expect(mdxExports.ImportantBlock).toBeDefined();
    expect(mdxExports.CautionBlock).toBeDefined();

    expect(mdxExports.Badge).toBeDefined();
    expect(mdxExports.CodeBlock).toBeDefined();
    expect(mdxExports.CodeCopy).toBeDefined();
    expect(mdxExports.CodeGroup).toBeDefined();
    expect(mdxExports.Interactive).toBeDefined();
    expect(mdxExports.Layout).toBeDefined();
    expect(mdxExports.Pagination).toBeDefined();
    expect(mdxExports.Sidebar).toBeDefined();
    expect(mdxExports.SidebarNode).toBeDefined();
    expect(mdxExports.TableOfContent).toBeDefined();
    expect(mdxExports.mdxCtx).toBeDefined();
  });
});
