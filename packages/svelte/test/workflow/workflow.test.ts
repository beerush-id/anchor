import { describe, expect, it } from 'vitest';

describe('Workflow', () => {
  it('should export core workflow', async () => {
    const { plan } = await import('../../src/workflow/index.js');
    expect(plan).toBeDefined();
  });
});
