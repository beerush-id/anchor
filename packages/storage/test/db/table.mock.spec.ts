import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBStatus, IndexedTable, type Rec } from '../../src/db/index.js';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { createRecord } from '../../src/db/helper.js';

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

  describe('Indexed Table - Basic', () => {
    it('should initialize a table', async () => {
      const table = new IndexedTable('test-table');
      expect(table.status).toBe(IDBStatus.Init);

      const event = await table.promise();

      expect(event).toEqual({ type: IDBStatus.Open });
      expect(table.status).toBe(IDBStatus.Open);
      expect(table.error).toBeUndefined();
    });

    it('should initialize a table with seeds', async () => {
      const table = new IndexedTable<{ id: string; name: string }>(
        'test-table-seed',
        undefined,
        undefined,
        undefined,
        undefined,
        [
          { id: '1', name: 'John', created_at: new Date(), updated_at: new Date() },
          { id: '2', name: 'Jane', created_at: new Date(), updated_at: new Date() },
        ]
      );
      expect(table.status).toBe(IDBStatus.Init);

      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);

      expect(await table.count()).toBe(2);
      expect(await table.countByIndex('created_at')).toBe(2);
      expect((await table.read('1')).name).toBe('John');
      expect((await table.read('2')).name).toBe('Jane');
    });

    it('should initialize a table with seed method', async () => {
      const table = new IndexedTable<{ id: string; name: string }>('test-table-seed-2').seed([
        { id: '1', name: 'John', created_at: new Date(), updated_at: new Date() },
        { id: '2', name: 'Jane', created_at: new Date(), updated_at: new Date() },
      ]);

      expect(table.status).toBe(IDBStatus.Init);

      await table.promise();

      expect(table.status).toBe(IDBStatus.Open);

      expect(await table.count()).toBe(2);
      expect(await table.countByIndex('created_at')).toBe(2);
      expect((await table.read('1')).name).toBe('John');
      expect((await table.read('2')).name).toBe('Jane');
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

    it('should handle count on table', async () => {
      const table = new IndexedTable<{ name: string; age: number }>('count-table').seed([
        createRecord({ name: 'John', age: 30 }),
        createRecord({ name: 'Jane', age: 28 }),
        createRecord({ name: 'Jim', age: 35 }),
        createRecord({ name: 'Joe', age: 27 }),
      ]);

      await table.promise();

      expect(await table.count()).toBe(4);
    });

    it('should handle count on table with filter', async () => {
      const table = new IndexedTable<{ name: string; age: number }>('count-table').seed([
        createRecord({ name: 'John', age: 30 }),
        createRecord({ name: 'Jane', age: 28 }),
        createRecord({ name: 'Jim', age: 35 }),
        createRecord({ name: 'Joe', age: 27 }),
      ]);

      await table.promise();

      expect(await table.count((item) => item.age >= 30)).toBe(2);
    });

    it('should list records', async () => {
      const table = new IndexedTable<{ name: string; age: number }>('count-table').seed([
        createRecord({ name: 'John', age: 30 }),
        createRecord({ name: 'Jane', age: 28 }),
        createRecord({ name: 'Jim', age: 35 }),
        createRecord({ name: 'Joe', age: 27 }),
      ]);

      const list = await table.list();

      expect(list.count).toBe(4);
      expect(list.rows[0].name).toBe('John');
      expect(list.rows[0].age).toBe(30);
      expect(list.rows[1].name).toBe('Jane');
      expect(list.rows[1].age).toBe(28);

      const elders = await table.list((row) => row.age >= 30);

      expect(elders.count).toBe(2);
      expect(elders.rows[0].name).toBe('John');
      expect(elders.rows[0].age).toBe(30);
      expect(elders.rows[1].name).toBe('Jim');
      expect(elders.rows[1].age).toBe(35);
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

    it('should list records by index', async () => {
      const table = new IndexedTable<TestRecord>('list-by-index-table', 1, ['name']).seed([
        createRecord({ id: 'index-1', name: 'apple' }),
        createRecord({ id: 'index-2', name: 'banana' }),
        createRecord({ id: 'index-3', name: 'apple' }),
      ]);

      const list = await table.listByIndex('name');

      expect(list.count).toBe(3);
      expect(list.rows).toHaveLength(3);
      expect(list.rows[0].name).toBe('apple');
      expect(list.rows[1].name).toBe('apple');

      const apples = await table.listByIndex('name', IDBKeyRange.only('apple'));

      expect(apples.count).toBe(2);
      expect(apples.rows).toHaveLength(2);
      expect(apples.rows[0].name).toBe('apple');
      expect(apples.rows[1].name).toBe('apple');
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
