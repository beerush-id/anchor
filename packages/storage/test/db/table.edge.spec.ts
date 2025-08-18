import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { IDBStatus, IndexedTable } from '../../src/db/index.js';

describe('Indexed Table - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  it('should handle table:find operation during initialization', async () => {
    const table = new IndexedTable('test-table-1');
    const record = await table.read('non-existent-id');

    await table.promise();
    expect(record).toBeUndefined();
  });

  it('should handle table:find operation during initialization', async () => {
    const table = new IndexedTable<{ name: string }>('test-table-2', 1, ['name']);
    const records = await table.find();

    expect(records).toEqual([]);
  });

  it('should handle table:findByIndex operation during initialization', async () => {
    const table = new IndexedTable<{ name: string }>('test-table-2', 1, ['name']);
    const records = await table.findByIndex('name');

    expect(records).toEqual([]);
  });

  it('should handle table:findByIndex operation on closed table', async () => {
    const table = new IndexedTable<{ name: string }>('test-table-3', 1, ['name']);
    await table.promise();

    const errHandler = vi.fn();
    table.close();

    await table.findByIndex('name').catch(errHandler);
    expect(errHandler).toHaveBeenCalled();
  });

  it('should handle table initialization with "remIndexes" defined', async () => {
    const table = new IndexedTable<{ name: string }>('test-table-4', 1, ['name'], ['name']);
    await table.promise();

    const errHandler = vi.fn();
    table.close();

    await table.findByIndex('name').catch(errHandler);
    expect(errHandler).toHaveBeenCalled();

    // Try upgrading the database.
    const table2 = new IndexedTable<{ name: string }>('test-table-4', 2, ['name'], ['name']);
    await table2.promise();

    expect(table2.status).toBe(IDBStatus.Open);

    await table2.findByIndex('name').catch(errHandler);
    expect(errHandler).toHaveBeenCalledTimes(2);
  });
});
