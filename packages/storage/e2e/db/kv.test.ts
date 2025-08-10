import { expect, test } from '@playwright/test';

test.describe('KV Store', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto(`/e2e/db/kv/index.html`);

    // Wait for the page to load
    await page.waitForFunction(() => (window as any).runKvStoreTests);
  });

  test('should initialize a KV store', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test1;
    });

    expect(result.status).toBe('open');
    expect(result.error).toBeNull();
  });

  test('should set and get values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test2;
    });

    expect(result.value).toBe('value1');
    expect(result.busy).toBe(false);
  });

  test('should delete values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test3;
    });

    expect(result.beforeDelete).toBe('value1');
    expect(result.afterDelete).toBeUndefined();
  });

  test('should handle busy state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test4;
    });

    expect(result.initialBusy).toBe(false);
    expect(result.busyDuringOperation).toBe(true);
    expect(result.busyAfterOperation).toBe(false);
  });

  test('should subscribe and publish events', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test5;
    });

    expect(result.eventsCount).toBe(3); // open, set, delete
    expect(result.events[1]).toEqual({ type: 'set', key: 'key1', value: 'value1' });
    expect(result.events[2]).toEqual({ type: 'delete', key: 'key1' });
  });

  test('should handle complex data types', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test6;
    });

    expect(result.isEqual).toBe(true);
  });

  test('should handle promise based operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runKvStoreTests();
      return (window as any).testResults.test7;
    });

    expect(result.value).toBe('value1');
  });
});
