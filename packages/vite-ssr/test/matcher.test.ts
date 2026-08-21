import { describe, expect, it } from 'vitest';
import { createMatcher } from '../src/utils/matcher.js';

describe('matcher — module ids are filtered by include and exclude patterns', () => {
  it('includes only module ids ending with the configured suffix', () => {
    const match = createMatcher(['.mdx']);

    expect(match('/pages/docs/page.mdx')).toBe(true);
    expect(match('/src/pages/docs/page.mdx')).toBe(true);
    expect(match('/pages/docs/page.tsx')).toBe(false);
  });

  it('matches module ids with regular expressions', () => {
    const match = createMatcher([/\/pages\/.*\.mdx$/]);

    expect(match('/pages/docs/page.mdx')).toBe(true);
    expect(match('/src/pages/docs/page.mdx')).toBe(true);
    expect(match('/lib/note.mdx')).toBe(false);
  });

  it('ignores query suffixes when matching', () => {
    const match = createMatcher(['.mdx']);

    expect(match('/pages/page.mdx?chunk')).toBe(true);
    expect(match('/pages/page.tsx?direct')).toBe(false);
  });

  it('lets exclude patterns veto included module ids', () => {
    const match = createMatcher(['.mdx'], ['page.mdx']);

    expect(match('/pages/docs/page.mdx')).toBe(false);
    expect(match('/pages/docs/other.mdx')).toBe(true);
  });

  it('matches nothing when no include pattern is configured', () => {
    const match = createMatcher();

    expect(match('/pages/page.mdx')).toBe(false);
  });
});
