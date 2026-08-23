import { describe, expect, it } from 'vitest';
import { type MdxContext, mdxCtx } from '../../src/mdx/context.js';

describe('MDX Documentation Context', () => {
  it('allows document components to share page metadata and navigation data', () => {
    const pageData: MdxContext = {
      url: '/docs/getting-started',
      meta: { title: 'Getting Started', category: 'Guides' },
      headings: [
        { id: 'installation', text: 'Installation', depth: 2 },
        { id: 'configuration', text: 'Configuration', depth: 2 },
      ],
    };

    mdxCtx.set(pageData);
    const current = mdxCtx.get();

    expect(current?.url).toBe('/docs/getting-started');
    expect(current?.meta).toEqual({ title: 'Getting Started', category: 'Guides' });
    expect(current?.headings).toHaveLength(2);
    expect(current?.headings?.[0].id).toBe('installation');
  });

  it('reflects reactive updates when page metadata or headings change', () => {
    mdxCtx.set({ url: '/docs/intro' });
    const current = mdxCtx.get();

    if (current) {
      current.url = '/docs/advanced';
      current.headings = [{ id: 'overview', text: 'Overview', depth: 1 }];
    }

    expect(mdxCtx.get()?.url).toBe('/docs/advanced');
    expect(mdxCtx.get()?.headings?.[0].text).toBe('Overview');
  });

  it('safely handles uninitialized or empty context without crashing', () => {
    mdxCtx.set();
    const current = mdxCtx.get();

    expect(current).toBeDefined();
    expect(current?.url).toBeUndefined();
    expect(current?.headings).toBeUndefined();
  });
});
