import { anchor } from '@airlib/core';
import { beforeEach } from 'vitest';

// Mock for any global setup needed for tests
export const mockGlobal = () => {};

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});
