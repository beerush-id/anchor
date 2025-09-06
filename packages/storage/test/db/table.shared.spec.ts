import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBStatus, IndexedTable, type Rec } from '../../src/db/index.js';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';

interface TestRecord extends Rec {
  name: string;
  value: number;
}

describe('Mocked Indexed Table', () => {
  beforeEach(() => {
    mockIndexedDB();
  });

  afterEach(() => {
    clearIndexedDBMock();
  });

  describe('Indexed Table - Shared Connections', () => {
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
