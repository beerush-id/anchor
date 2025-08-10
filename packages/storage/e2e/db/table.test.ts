import { expect, test } from '@playwright/test';

test.describe('IndexedTable', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto(`/e2e/db/table/index.html`);

    // Wait for the page to load
    await page.waitForFunction(() => (window as any).runIndexedTableTests);
  });

  test('should initialize a table', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test1;
    });

    expect(result.status).toBe('open');
    expect(result.error).toBeNull();
  });

  test('should create a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test2;
    });

    expect(result.id).toBe('test-id');
    expect(result.name).toBe('test-name');
    expect(result.value).toBe(42);
    expect(result.created_at).toBeDefined();
    expect(result.updated_at).toBeDefined();
  });

  test('should read a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test3;
    });

    expect(result.id).toBe('read-test-id');
    expect(result.name).toBe('read-test-name');
    expect(result.value).toBe(100);
  });

  test('should update a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test4;
    });

    expect(result.id).toBe('update-test-id');
    expect(result.name).toBe('updated-name');
    expect(result.value).toBe(75);
  });

  test('should delete a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test5;
    });

    expect(result.beforeDelete).toBe(true);
    expect(result.afterDelete).toBe(false);
  });

  test('should find records', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test6;
    });

    expect(result.count).toBe(3);
    expect(result.firstId).toBe('find-1');
    expect(result.lastName).toBe('record-3');
  });

  test('should handle concurrent operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test7;
    });

    expect(result.fulfilledCount).toBeGreaterThan(0);
    expect(result.totalOperations).toBe(4);
  });

  test('should subscribe and publish events', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runIndexedTableTests();
      return (window as any).testResults.test8;
    });

    expect(result.eventsCount).toBeGreaterThanOrEqual(1); // open, create, update, delete
    expect(result.events.some((e: any) => e.type === 'open')).toBe(true);
    expect(result.events.some((e: any) => e.type === 'create')).toBe(false);
  });
});
