import '../../src/server/index.js';
import { getScope } from '@anchorlib/core';
import { describe, expect, it } from 'vitest';

describe('Server Module', () => {
  it('should warn when accessing global scope', () => {
    const result = getScope('global');
    expect(result).toBeUndefined();
  });
});
