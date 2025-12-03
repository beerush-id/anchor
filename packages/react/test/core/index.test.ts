import { describe, expect, it } from 'vitest';
import { anchor, mutable } from '../../src/core/index';

describe('Anchor React - Core', () => {
  it('should export core functions', () => {
    expect(anchor).toBeDefined();
    expect(mutable).toBeDefined();
  });
});
