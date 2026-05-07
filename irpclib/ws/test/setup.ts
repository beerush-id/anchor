import { anchor } from '@anchorlib/core';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
  vi.clearAllMocks();
});
