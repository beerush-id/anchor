import * as core from '@anchorlib/core';
import { describe, expect, it, vi } from 'vitest';
import { SSR_ENV_KEY, ssrEnv } from '../src/index.js';

vi.mock('@anchorlib/core', async () => {
  const actual = await vi.importActual('@anchorlib/core');
  return {
    ...actual,
    getContext: vi.fn(),
  };
});

describe('ssrEnv', () => {
  it('exports SSR_ENV_KEY', () => {
    expect(SSR_ENV_KEY).toBeDefined();
    expect(typeof SSR_ENV_KEY).toBe('symbol');
  });

  it('calls getContext with SSR_ENV_KEY', () => {
    const mockGetContext = vi.mocked(core.getContext);
    mockGetContext.mockReturnValue('mock-env');

    const result = ssrEnv();

    expect(mockGetContext).toHaveBeenCalledWith(SSR_ENV_KEY);
    expect(result).toBe('mock-env');
  });
});
