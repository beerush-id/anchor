import { describe, expect, it } from 'vitest';

// Test that storage exports are available
import { persistent, session } from '../../src/storage/index';

describe('Anchor React - Storage', () => {
  it('should export storage functions', () => {
    expect(session).toBeDefined();
    expect(persistent).toBeDefined();
  });
});
