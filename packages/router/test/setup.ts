import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('window', {});
});
