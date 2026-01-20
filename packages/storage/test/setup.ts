import { setCleanUpHandler } from '@anchorlib/core';
import { afterAll, beforeAll } from 'vitest';

const cleanupList = new Set<() => void>();

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
