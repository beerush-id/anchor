import { describe, expect, it, vi } from 'vitest';

// The docs-mode plugins are optional dependencies; when one is absent the
// compiler must surface a clear error instead of failing cryptically.
vi.mock('@shikijs/rehype/core', () => {
  throw new Error('Cannot find module @shikijs/rehype/core');
});

import { importExtended } from '../src/modules/markdown.js';

describe('docs mode — missing plugins fail loudly', () => {
  it('reports missing doc plugins with install guidance', async () => {
    await expect(importExtended()).rejects.toThrow(/remark-gfm/);
  });
});
