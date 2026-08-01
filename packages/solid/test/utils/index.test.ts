import { describe, expect, it } from 'vitest';
import { isNullish } from '../../src/utils/index.js';

describe('utils', () => {
  it('exports isNullish as a function', () => {
    expect(typeof isNullish).toBe('function');
  });
});
