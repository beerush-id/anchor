import { setCleanUpHandler } from '@anchorlib/core';
import { afterEach, beforeEach } from 'vitest';

const cleanupList = new Set<() => void>();

beforeEach(() => {
  setCleanUpHandler((fn) => {
    if (typeof fn === 'function') {
      cleanupList.add(fn);
    }
  });
});

afterEach(() => {
  cleanupList.forEach((fn) => fn());
});
