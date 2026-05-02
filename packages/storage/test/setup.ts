import { anchor, setCleanUpHandler } from '@anchorlib/core';
import { afterAll, beforeAll, beforeEach } from 'vitest';

const cleanupList = new Set<() => void>();

beforeEach(() => {
  anchor.configure({ closureWarning: false });
});

beforeAll(() => {
  setCleanUpHandler((fn) => {
    if (typeof fn === 'function') {
      cleanupList.add(fn);
    }
  });
});

afterAll(async () => {
  await Promise.all(Array.from(cleanupList).map((fn) => fn()));
});
