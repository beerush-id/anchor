import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { IDBStatus, IndexedTable } from '../../src/db/index.js';

describe('Mocked Indexed Table', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  describe('Indexed Table - Edge Cases', () => {
    it('should handle table:read operation during initialization', async () => {
      const table = new IndexedTable('test-table-read-1');
      const record = await table.read('non-existent-id');

      expect(record).toBeUndefined();
    });

    it('should handle table:count operation during initialization', async () => {
      const table = new IndexedTable<{ name: string }>('test-table-count-1');
      const count = await table.count();

      expect(count).toBe(0);

      const indexed = new IndexedTable<{ name: string }>('test-table-countByIndex-1', 1, ['name']);
      const indexedCount = await indexed.countByIndex('name');

      expect(indexedCount).toBe(0);
    });

    it('should handle table:find operation during initialization', async () => {
      const table = new IndexedTable<{ name: string }>('test-table-find-1', 1, ['name']);
      const records = await table.find();

      expect(records).toEqual([]);
    });

    it('should handle table:list operation during initialization', async () => {
      const table = new IndexedTable<{ name: string }>('test-table-list-1', 1, ['name']);
      const list = await table.list();

      expect(list.count).toBe(0);
      expect(list.rows).toEqual([]);
    });

    it('should handle table:count operation on a closed table', async () => {
      const table = new IndexedTable<{ name: string }>('test-closed-table-count-1');
      await table.promise();

      const errHandler = vi.fn();
      table.close();

      await table.count().catch(errHandler);
      expect(errHandler).toHaveBeenCalled();

      const indexed = new IndexedTable('test-closed-table-countByIndex-1', 1, ['name']);
      await indexed.promise();

      const indexedErrHandler = vi.fn();
      indexed.close();

      await indexed.countByIndex('name').catch(indexedErrHandler);
      expect(indexedErrHandler).toHaveBeenCalled();
    });

    it('should handle table:list operation on a closed table', async () => {
      const table = new IndexedTable<{ name: string }>('test-closed-table-list-1');
      await table.promise();

      const errHandler = vi.fn();
      table.close();

      await table.list().catch(errHandler);
      expect(errHandler).toHaveBeenCalled();
    });

    it('should handle table:findByIndex operation during initialization', async () => {
      const table = new IndexedTable<{ name: string }>('test-table-findByIndex-1', 1, ['name']);
      const records = await table.findByIndex('name');

      expect(records).toEqual([]);
    });

    it('should handle table:findByIndex operation on a closed table', async () => {
      const table = new IndexedTable<{ name: string }>('test-closed-table-findByIndex-1', 1, ['name']);
      await table.promise();

      const errHandler = vi.fn();
      table.close();

      await table.findByIndex('name').catch(errHandler);
      expect(errHandler).toHaveBeenCalled();
    });

    it('should handle table:listIndex operation on a closed table', async () => {
      const table = new IndexedTable<{ name: string }>('test-closed-table-listByIndex-1', 1, ['name']);
      await table.promise();

      const errHandler = vi.fn();
      table.close();

      await table.listByIndex('name').catch(errHandler);
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

    it('should handler error with invalid seed data', async () => {
      const table = new IndexedTable<{ id: string; name: string }>('test-table-seed-error').seed({} as never);

      expect(table.status).toBe(IDBStatus.Init);

      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);
      expect(await table.count()).toBe(0);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handler error with invalid individual seed data', async () => {
      const table = new IndexedTable<{ id: string; name: string }>('test-table-seed-individual-error').seed([
        { id: '1', name: 'John', created_at: new Date(), updated_at: new Date() },
        { id: '2', name: new Proxy({}, {}) as never, created_at: new Date(), updated_at: new Date() },
        { id: '3', name: 9007199254740991n as never, created_at: new Date(), updated_at: new Date() },
        null as never,
      ]);

      expect(table.status).toBe(IDBStatus.Init);

      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);

      expect(await table.count()).toBe(1);
      expect(await table.countByIndex('created_at')).toBe(1);
      expect((await table.read('1')).name).toBe('John');
      expect(await table.read('2')).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle indexes already containing created_at and updated_at', async () => {
      const table = new IndexedTable<{ name: string }>('test-custom-indexes-1', 1, [
        'name',
        'created_at',
        'updated_at',
      ]);
      await table.promise();
      expect(table.status).toBe(IDBStatus.Open);
    });

    it('should skip seeding if table already has records', async () => {
      const table = new IndexedTable<{ id: string; name: string }>('test-already-seeded');
      await table.create({ id: '1', name: 'Existing' });

      // Create a new instance pointing to same table with seeds
      const table2 = new IndexedTable<{ id: string; name: string }>('test-already-seeded').seed([
        { id: '2', name: 'New' },
      ]);
      await table2.promise();
      expect(await table2.count()).toBe(1);
    });

    it('should support table.promise on row state', async () => {
      const { createTable } = await import('../../src/db/table.js');
      const table = createTable<{ name: string }>('test-promise-state');
      const rowState = table.add({ name: 'Promise Item' });

      const resolved = await table.promise(rowState);
      expect(resolved).toBe(rowState);

      // Immediate resolution when already resolved
      const immediate = await table.promise(rowState);
      expect(immediate).toBe(rowState);

      table.leave(rowState.id);
      // Non-existent id leave
      table.leave('non-existent-id');

      // Test error rejection in table.promise
      const notFoundRow = table.get('not-found-id');
      await expect(table.promise(notFoundRow)).rejects.toThrow('Not found.');
    });
  });
});
