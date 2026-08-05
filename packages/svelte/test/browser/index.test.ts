import { describe, expect, it } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';

describe('browser/index', () => {
  it('exports acceptInteractions as a function', () => {
    expect(typeof acceptInteractions).toBe('function');
  });
});
