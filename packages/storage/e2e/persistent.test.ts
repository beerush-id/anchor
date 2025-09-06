import { expect, test } from '@playwright/test';

test.describe('Persistent Storage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto(`/e2e/persistent/index.html`);

    // Wait for the page to load
    await page.waitForFunction(() => (window as any).runPersistentStorageTests);
  });

  test('should initialize with initial data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test1;
    });

    expect(result.a).toBe(1);
    expect(result.b).toBe('test');
    expect(result.undefinedValue).toBe(undefined);
    expect(result.length).toBe(2);
  });

  test('should get the correct length', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test2;
    });

    expect(result.length).toBe(2);
  });

  test('should set and get values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test3;
    });

    expect(result.a).toBe(1);
    expect(result.b).toBe('test');
    expect(result.c).toBe(true);
    expect(result.length).toBe(3);
  });

  test('should delete values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test4;
    });

    expect(result.initialLength).toBe(2);
    expect(result.afterDeleteValue).toBe(undefined);
    expect(result.finalLength).toBe(1);
  });

  test('should assign data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test5;
    });

    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
    expect(result.c).toBe(3);
    expect(result.length).toBe(3);
  });

  test('should subscribe and publish events', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test6;
    });

    expect(result.eventsCount).toBe(2);
    expect(result.events[0]).toEqual({ type: 'set', name: 'a', value: 1 });
    expect(result.events[1]).toEqual({ type: 'delete', name: 'a' });
  });

  test('should generate JSON representation', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test7;
    });

    expect(result.json).toBe(result.jsonString);
  });

  test('should persist data in localStorage', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await (window as any).runPersistentStorageTests();
      return (window as any).testResults.test8;
    });

    expect(result.a).toBe(2);
    expect(result.b).toBe('test');
    expect(result.c).toBe('new');
    expect(result.stored).toBe(JSON.stringify({ a: 2, b: 'test', c: 'new' }));
  });
});
