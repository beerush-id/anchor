import { describe, expect, it } from 'vitest';
import { history } from '../../src/common/index.js';

describe('common', () => {
  it('exports history as a function', () => {
    expect(typeof history).toBe('function');
  });
});
