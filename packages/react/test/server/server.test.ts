import { getScope } from '@anchorlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Server Module', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  it('should warn when accessing global scope', async () => {
    const errSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await import('../../src/server/index.js');
    const result = getScope('global');

    expect(result).toBeUndefined();
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });
});
