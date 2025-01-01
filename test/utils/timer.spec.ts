import { test, expect } from 'vitest';
import { sleep } from '../../lib/esm/utils';

test('Sleep for 100ms', async () => {
  const start = Date.now();
  await sleep(100);
  const end = Date.now();
  expect(end - start).toBeGreaterThanOrEqual(100);
});

test('Sleep for 500ms', async () => {
  const start = Date.now();
  await sleep(500);
  const end = Date.now();
  expect(end - start).toBeGreaterThanOrEqual(500);
});
