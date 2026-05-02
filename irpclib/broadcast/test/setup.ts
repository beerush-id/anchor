import { anchor } from '@anchorlib/core';
import { beforeEach } from 'vitest';

beforeEach(() => {
  anchor.configure({ closureWarning: false });
});
