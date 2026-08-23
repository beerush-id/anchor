import { describe, expect, it } from 'vitest';
import { plan } from '../../src/workflow/index.js';

describe('Workflow', () => {
  it('should export core workflow', () => {
    expect(plan).toBeDefined();
  });
});
