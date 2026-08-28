import { anchor } from '@irpclib/irpc/core';
import { beforeEach } from 'vitest';

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});
