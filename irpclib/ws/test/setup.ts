import { anchor } from '@anchorlib/core';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  anchor.configure({ closureWarning: false });
  vi.clearAllMocks();
});
