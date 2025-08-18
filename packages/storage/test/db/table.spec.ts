import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBStatus, IndexedTable } from '../../src/db/index.js';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import type { Rec } from '../../src/db/helper.js';

interface TestRecord extends Rec {
  name: string;
  value: number;
}

describe('IndexedTable Module', () => {
  describe('IndexedTable', () => {
    it('should initialize a table', () => {
      const table = new IndexedTable<TestRecord>('test-table');

      expect(table).toBeInstanceOf(IndexedTable);
      expect(table.status).toBe(IDBStatus.Closed);
    });

    it('should handle IndexedDB not supported', () => {
      const table = new IndexedTable<TestRecord>('test-table');

      expect(table.status).toBe(IDBStatus.Closed);
      expect(table.error).toBeDefined();
      expect(table.error?.message).toBe('IndexedDB is not available.');
    });

    it('should support initialization promise', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      const event = await table.promise();

      expect(event.type).toBe(IDBStatus.Closed);
      expect(table.status).toBe(IDBStatus.Closed);
      expect(table.error).toBeDefined();
    });

    it('should prevent creating record when no IndexedDB available', async () => {
      const table = new IndexedTable('test-table');
      await expect(table.create({ name: 'John Doe' })).rejects.toThrow('Table is closed.');
    });

    it('should prevent reading record when no IndexedDB available', async () => {
      const table = new IndexedTable('test-table');
      await expect(table.read('1')).rejects.toThrow('Table is closed.');
    });

    it('should prevent updating record when no IndexedDB available', async () => {
      const table = new IndexedTable('test-table');
      await expect(table.update('1', { name: 'John Doe' })).rejects.toThrow('Table is closed.');
    });

    it('should prevent deleting record when no IndexedDB available', async () => {
      const table = new IndexedTable('test-table');
      await expect(table.delete('1')).rejects.toThrow('Table is closed.');
    });

    it('should prevent finding records when no IndexedDB available', async () => {
      const table = new IndexedTable('test-table');
      await expect(table.find()).rejects.toThrow('Table is closed.');
    });
  });
});

describe('Mocked IndexedTable Module', () => {
  beforeEach(() => {
    mockIndexedDB();
  });

  afterEach(() => {
    clearIndexedDBMock();
  });

  describe('IndexedTable', () => {
    it('should initialize a table', async () => {
      const table = new IndexedTable('test-table');
      expect(table.status).toBe(IDBStatus.Init);

      const event = await table.promise();

      expect(event).toEqual({ type: IDBStatus.Open });
      expect(table.status).toBe(IDBStatus.Open);
      expect(table.error).toBeUndefined();
    });

    it('should create a record', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      const record = await table.create({
        id: 'test-id',
        name: 'test-name',
        value: 42,
      });

      expect(record.id).toBe('test-id');
      expect(record.name).toBe('test-name');
      expect(record.value).toBe(42);
      expect(record.created_at).toBeDefined();
      expect(record.updated_at).toBeDefined();
    });

    it('should read a record', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      const record = await table.read('test-id');

      expect(record).toEqual({
        id: 'test-id',
        name: 'test-name',
        value: 42,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should update a record', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      const record = await table.update('test-id', { name: 'test-name-updated', value: 84 });

      expect(record).toEqual({
        id: 'test-id',
        name: 'test-name-updated',
        value: 84,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should delete a record', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      const deleted = await table.delete('test-id');

      expect(deleted).toBe(true);
    });

    it('should handle reading non-existent record', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      await table.promise();

      const record = await table.read('non-existent-id');
      expect(record).toBeUndefined();
    });

    it('should handle updating non-existent record', async () => {
      const key = 'non-existent-id';
      const table = new IndexedTable<TestRecord>('test-table');

      await table.promise();
      await expect(table.update(key, { name: 'new-name' })).rejects.toThrow(`Record with key "${key}" not found.`);
    });

    it('should generate ID when not provided', async () => {
      const table = new IndexedTable<TestRecord>('test-table');

      await table.promise();

      const record = await table.create({ name: 'generated-id-record', value: 100 });

      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe('string');
      expect(record.id.length).toBeGreaterThan(0);
      expect(record.name).toBe('generated-id-record');
      expect(record.value).toBe(100);
    });

    it('should handle concurrent operations during initialization', async () => {
      const table = new IndexedTable<TestRecord>('test-table');

      const promises = [
        table.create({ id: 'concurrent-1', name: 'concurrent', value: 1 }),
        table.read('concurrent-1'),
        table.update('concurrent-1', { value: 2 }),
        table.delete('concurrent-1'),
      ];

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((result) => result.status === 'fulfilled');

      expect(fulfilled.length).toBeGreaterThan(0);
    });

    it('should preserve existing ID when provided', async () => {
      const table = new IndexedTable<TestRecord>('test-table');
      await table.promise();

      const record = await table.create({ id: 'custom-id', name: 'custom', value: 200 });

      expect(record.id).toBe('custom-id');
      expect(record.name).toBe('custom');
      expect(record.value).toBe(200);
    });

    it('should handle empty table name', async () => {
      const table = new IndexedTable<TestRecord>('');
      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);
      expect(table.error).toBeUndefined();
    });

    it('should handle special characters in table name', async () => {
      const table = new IndexedTable<TestRecord>('special-table_123@#$');
      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);
      expect(table.error).toBeUndefined();

      const record = await table.create({ name: 'special', value: 999 });
      expect(record.name).toBe('special');
      expect(record.value).toBe(999);
    });

    it('should handle create with empty object', async () => {
      const table = new IndexedTable<TestRecord>('empty-test-table');
      await table.promise();

      const record = await table.create({ id: 'empty', name: '', value: 0 } as TestRecord);

      expect(record.id).toBe('empty');
      expect(record.name).toBe('');
      expect(record.value).toBe(0);
    });

    it('should handle update with empty payload', async () => {
      const table = new IndexedTable<TestRecord>('empty-update-table');
      await table.promise();

      const initialRecord = await table.create({ id: 'empty-update', name: 'initial', value: 123 });

      // Simulate a delay to create a higher updated_at timestamp.
      await new Promise((resolve) => setTimeout(resolve, 15));

      const updatedRecord = await table.update('empty-update', {});

      expect(updatedRecord.id).toBe(initialRecord.id);
      expect(updatedRecord.name).toBe(initialRecord.name);
      expect(updatedRecord.value).toBe(initialRecord.value);
      expect(updatedRecord.updated_at.getTime()).toBeGreaterThan(initialRecord.updated_at.getTime());
    });

    it('should handle delete on non-existent record', async () => {
      const table = new IndexedTable<TestRecord>('delete-non-existent-table');
      await table.promise();

      const result = await table.delete('non-existent-id');
      expect(result).toBe(true); // IndexedDB delete operation returns success even for non-existent keys
    });

    it('should find records with default limit', async () => {
      const table = new IndexedTable<TestRecord>('find-test-table');
      await table.promise();

      // Create multiple test records
      await table.create({ id: 'find-1', name: 'record-1', value: 1 });
      await table.create({ id: 'find-2', name: 'record-2', value: 2 });
      await table.create({ id: 'find-3', name: 'record-3', value: 3 });

      const records = await table.find();
      expect(records).toHaveLength(3);
      expect(records[0].id).toBe('find-1');
      expect(records[1].id).toBe('find-2');
      expect(records[2].id).toBe('find-3');
    });

    it('should find records with custom limit', async () => {
      const table = new IndexedTable<TestRecord>('find-limit-test-table');
      await table.promise();

      // Create multiple test records
      for (let i = 1; i <= 10; i++) {
        await table.create({ id: `find-limit-${i}`, name: `record-${i}`, value: i });
      }

      const records = await table.find(undefined, 5);
      expect(records).toHaveLength(5);
    });

    it('should find records with filter function', async () => {
      const table = new IndexedTable<TestRecord>('find-filter-test-table');
      await table.promise();

      // Create multiple test records
      await table.create({ id: 'filter-1', name: 'apple', value: 1 });
      await table.create({ id: 'filter-2', name: 'banana', value: 2 });
      await table.create({ id: 'filter-3', name: 'apple', value: 3 });

      const records = await table.find((record) => record.name === 'apple');

      expect(records).toHaveLength(2);
      expect(records[0].name).toBe('apple');
      expect(records[1].name).toBe('apple');
    });

    it('should handle finding records in empty table', async () => {
      const table = new IndexedTable<TestRecord>('find-empty-table');
      await table.promise();

      const records = await table.find();
      expect(records).toHaveLength(0);
    });

    it('should find records by index', async () => {
      const table = new IndexedTable<TestRecord>('find-by-index-table', 1, ['name']);
      await table.promise();

      // Create multiple test records
      await table.create({ id: 'index-1', name: 'apple', value: 1 });
      await table.create({ id: 'index-2', name: 'banana', value: 2 });
      await table.create({ id: 'index-3', name: 'apple', value: 3 });

      const records = await table.findByIndex('name', IDBKeyRange.only('apple'));

      expect(records).toHaveLength(2);
      expect(records[0].name).toBe('apple');
      expect(records[1].name).toBe('apple');
    });

    it('should create table with column indexes', async () => {
      const table = new IndexedTable<TestRecord>('indexed-table', 1, ['name', 'value']);
      await table.promise();

      // Verify that the table was created successfully
      expect(table.status).toBe(IDBStatus.Open);
      expect(table.error).toBeUndefined();

      // Create a record to test that indexes work
      const record = await table.create({ id: 'indexed-record', name: 'test', value: 42 });
      expect(record.id).toBe('indexed-record');
      expect(record.name).toBe('test');
      expect(record.value).toBe(42);
    });

    it('should handle table with column indexes and find by index', async () => {
      const table = new IndexedTable<TestRecord>('indexed-find-table', 1, ['name', 'value']);
      await table.promise();

      // Create test records
      await table.create({ id: 'idx-1', name: 'apple', value: 10 });
      await table.create({ id: 'idx-2', name: 'banana', value: 20 });
      await table.create({ id: 'idx-3', name: 'cherry', value: 10 });

      // Find by value index
      const valueRecords = await table.findByIndex('value', IDBKeyRange.only(10));
      expect(valueRecords).toHaveLength(2);
      expect(valueRecords.map((r) => r.id)).toEqual(expect.arrayContaining(['idx-1', 'idx-3']));

      // Find by name index
      const nameRecord = await table.findByIndex('name', IDBKeyRange.only('banana'));
      expect(nameRecord).toHaveLength(1);
      expect(nameRecord[0].id).toBe('idx-2');
    });
  });
});

describe('Shared Connection Tables', () => {
  beforeEach(() => {
    mockIndexedDB();
  });

  afterEach(() => {
    clearIndexedDBMock();
  });

  describe('IndexedTable', () => {
    it('should share connection between tables with same dbName', async () => {
      const table1 = new IndexedTable('table1', 1, undefined, undefined, 'shared-db');
      const table2 = new IndexedTable('table2', 1, undefined, undefined, 'shared-db');

      await Promise.all([table1.open().promise(), table2.open().promise()]);

      expect(table1.instance).toBe(table2.instance);
      expect(table1.connection).toBe(table2.connection);
    });

    it('should not share connection between tables with different dbName', async () => {
      const table1 = new IndexedTable('table1', 1);
      const table2 = new IndexedTable('table2', 1);

      await Promise.all([table1.open().promise(), table2.open().promise()]);

      expect(table1.instance).not.toBe(table2.instance);
      expect(table1.connection).not.toBe(table2.connection);
    });

    it('should share connection when one table specifies dbName explicitly', async () => {
      const table1 = new IndexedTable('shared-table', 1);
      const table2 = new IndexedTable('another-table', 1, undefined, undefined, 'shared-table');

      await Promise.all([table1.promise(), table2.open().promise()]);

      expect(table1.instance).toBe(table2.instance);
      expect(table1.connection).toBe(table2.connection);
    });

    it('should propagate connection close to all shared tables', async () => {
      const table1 = new IndexedTable('table1', 1, undefined, undefined, 'shared-db');
      const table2 = new IndexedTable('table2', 1, undefined, undefined, 'shared-db');

      await Promise.all([table1.open().promise(), table2.open().promise()]);

      table1.close(new Error('Test error'));

      expect(table1.status).toBe(IDBStatus.Closed);
      expect(table2.status).toBe(IDBStatus.Closed);
      expect(table1.error).toBe(table2.error);
    });

    it('should handle operations on shared connection tables', async () => {
      const usersTable = new IndexedTable<TestRecord>('users', 1, undefined, undefined, 'app-db');
      const productsTable = new IndexedTable<TestRecord>('products', 1, undefined, undefined, 'app-db');

      await Promise.all([usersTable.open().promise(), productsTable.open().promise()]);

      // Create records in different tables
      const user = await usersTable.create({ id: 'user1', name: 'John Doe', value: 30 });
      const product = await productsTable.create({ id: 'product1', name: 'Laptop', value: 1200 });

      // Read records from respective tables
      const foundUser = await usersTable.read('user1');
      const foundProduct = await productsTable.read('product1');

      expect(user).toEqual(foundUser);
      expect(product).toEqual(foundProduct);
      expect(user.name).toBe('John Doe');
      expect(product.name).toBe('Laptop');
    });

    it('should handle concurrent operations on shared connection tables', async () => {
      const table1 = new IndexedTable<TestRecord>('table1', 1, undefined, undefined, 'shared-db');
      const table2 = new IndexedTable<TestRecord>('table2', 1, undefined, undefined, 'shared-db');

      table1.open();

      const operations: Promise<{ id: string; name: string; value: number } | undefined>[] = [
        table1.create({ id: 'record1', name: 'Record 1', value: 1 }),
        table2.create({ id: 'record2', name: 'Record 2', value: 2 }),
        table1.read('record1'),
        table2.read('record2'),
      ];

      const results = await Promise.all(operations);

      expect(results[0]?.id).toBe('record1');
      expect(results[1]?.id).toBe('record2');
      expect(results[2]).toBeDefined();
      expect(results[3]).toBeDefined();

      const mockedOperations: Promise<{ id: string; name: string; value: number } | undefined>[] = [
        new Promise((resolve) => {
          setTimeout(async () => {
            resolve(await table1.create({ id: 'record3', name: 'Record 3', value: 3 }));
          }, 50);
        }),
        table1.read('record3'), // Should resolve before the record3 is created due to the mocked delay.
      ];

      const mockedResults = await Promise.all(mockedOperations);

      expect(mockedResults[0]).toBeDefined();
      expect(mockedResults[1]).toBeUndefined();
    });

    it('should maintain separate stores for shared connection tables', async () => {
      const table1 = new IndexedTable<TestRecord>('table1', 1, undefined, undefined, 'separated-shared-db');
      const table2 = new IndexedTable<TestRecord>('table2', 1, undefined, undefined, 'separated-shared-db');

      table1.open();

      await Promise.all([table1.promise(), table2.promise()]);

      await table1.create({ id: 'record1', name: 'Table1 Record', value: 1 });
      await table2.create({ id: 'record2', name: 'Table2 Record', value: 2 });

      const records1 = await table1.find();
      const records2 = await table2.find();

      expect(records1).toHaveLength(1);
      expect(records2).toHaveLength(1);
      expect(records1[0].name).toBe('Table1 Record');
      expect(records2[0].name).toBe('Table2 Record');
    });

    it('should handle version upgrades for shared connection tables', async () => {
      const table1 = new IndexedTable<TestRecord>('table1', 1, undefined, undefined, 'upgrade-db');
      const table2 = new IndexedTable<TestRecord>('table2', 2, ['name'], undefined, 'upgrade-db');

      table1.open();

      await Promise.all([table1.promise(), table2.promise()]);

      expect(table1.status).toBe(IDBStatus.Open);
      expect(table2.status).toBe(IDBStatus.Open);
      expect(table1.instance).toBe(table2.instance);
      expect(table1.instance?.version).toBe(2);
    });
  });
});
