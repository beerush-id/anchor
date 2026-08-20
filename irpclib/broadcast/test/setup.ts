import { anchor } from '@airlib/core';
import { beforeEach } from 'vitest';

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});
