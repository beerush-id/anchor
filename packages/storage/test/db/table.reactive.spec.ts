import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { createRecord, createTable, DB_SYNC_DELAY, type Rec } from '../../src/db/index.js';

interface TestRecord extends Rec {
  name: string;
  value: number;
}

describe('Reactive Table Module', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  describe('createTable', () => {
    it('should create a reactive table function', () => {
      const table = createTable<TestRecord>('test-reactive-table');

      expect(typeof table).toBe('object');
      expect(typeof table.get).toBe('function');
      expect(typeof table.add).toBe('function');
      expect(typeof table.list).toBe('function');
      expect(typeof table.listByIndex).toBe('function');
      expect(typeof table.remove).toBe('function');
      expect(typeof table.leave).toBe('function');
    });

    it('should handle creating reactive table with the same name', () => {
      const table1 = createTable<TestRecord>('shared-reactive-table');
      const table2 = createTable<TestRecord>('shared-reactive-table');

      expect(table1).toBe(table2);
    });

    it('should create a reactive table with seeds', async () => {
      const table = createTable('test-reactive-table-seed').seed([
        createRecord({ name: 'John' }),
        createRecord({ name: 'Jane' }),
      ]);

      const list = table.list();
      await table.promise(list);

      expect(list.count).toBe(2);
      expect(list.data.length).toBe(2);
      expect(list.data[0].name).toBe('John');
      expect(list.data[1].name).toBe('Jane');
      expect(list.status).toBe('ready');
    });

    it('should create reactive row state with initial data', async () => {
      const table = createTable<TestRecord>('test-reactive-table');
      const rowState = table.add({ name: 'test', value: 42 });

      expect(rowState).toBeDefined();
      expect(rowState.data.name).toBe('test');
      expect(rowState.data.value).toBe(42);
      expect(rowState.status).toBe('pending');

      // Wait for database operation to complete
      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('ready');
    });

    it('should create new row state with custom id', async () => {
      const table = createTable('custom-id-table');
      const rowState = table.add({ id: 'test-id', name: 'test' });

      expect(rowState).toBeDefined();
      expect(rowState.status).toBe('pending');
      expect(rowState.data.id).toBe('test-id');
      expect(rowState.data.name).toBe('test');

      await table.promise(rowState).catch(() => {});

      const stored = await table.store().read('test-id');
      expect(stored).toEqual(rowState.data);
    });

    it('should read the existing row from database', async () => {
      const table = createTable('read-existing-table');
      await table.store().create({ id: 'test-id', name: 'test' });

      const rowState = table.get('test-id');

      expect(rowState.status).toBe('pending');

      await table.promise(rowState);

      expect(rowState.status).toBe('ready');
      expect(rowState.data.id).toBe('test-id');
      expect(rowState.data.name).toBe('test');
    });

    it('should return the same row state for the same ID', () => {
      const table = createTable<TestRecord>('test-reactive-table');
      const row1 = table.add({ id: 'shared-id', name: 'test1', value: 1 });
      const row2 = table.add({ id: 'shared-id', name: 'test2', value: 2 });

      expect(row1).toBe(row2);
      expect(row1.data.name).toBe('test1'); // Should keep the first value
      expect(row1.data.value).toBe(1);
    });

    it('should get existing row from database', async () => {
      // First create a record directly in the database
      const table = createTable<TestRecord>('test-reactive-table');
      const reactiveTable = table.add({ id: 'existing-id', name: 'existing', value: 100 });

      expect(reactiveTable.status).toBe('pending');

      // Create a new reactive table instance to simulate fresh access
      const newTable = createTable<TestRecord>('test-reactive-table');
      const rowState = newTable.get('existing-id');

      expect(rowState.status).toBe('pending');

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('ready');
      expect(rowState.data.id).toBe('existing-id');
      expect(rowState.data.name).toBe('existing');
      expect(rowState.data.value).toBe(100);
    });

    it('should handle getting non-existent row', async () => {
      const table = createTable<TestRecord>('test-reactive-table');
      const rowState = table.get('non-existent-id');

      expect(rowState.status).toBe('pending');

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('error');
      expect(rowState.error).toBeDefined();
      expect(rowState.error?.message).toBe('Not found.');
    });

    it('should list records from database', async () => {
      const table = createTable<TestRecord>('test-reactive-list-table');

      // Add some records
      const row1 = table.add({ id: 'list-1', name: 'record1', value: 1 });
      const row2 = table.add({ id: 'list-2', name: 'record2', value: 2 });

      await Promise.all([table.promise(row1), table.promise(row2)]);

      const listState = table.list();

      expect(listState.status).toBe('pending');

      await table.promise(listState).catch(() => {});

      expect(listState.status).toBe('ready');
      expect(listState.count).toBe(2);
      expect(listState.data).toHaveLength(2);
      expect(listState.data[0].id).toBe('list-1');
      expect(listState.data[1].id).toBe('list-2');
    });

    it('should list records by index', async () => {
      const table = createTable<TestRecord>('test-reactive-list-index-table', 1, ['name']);

      // Add some records
      const row1 = table.add({ id: 'index-1', name: 'apple', value: 1 });
      const row2 = table.add({ id: 'index-2', name: 'banana', value: 2 });
      const row3 = table.add({ id: 'index-3', name: 'apple', value: 3 });

      await Promise.all([table.promise(row1), table.promise(row2), table.promise(row3)]);

      const listState = table.listByIndex('name', IDBKeyRange.only('apple'));

      expect(listState.status).toBe('pending');

      await table.promise(listState).catch(() => {});

      expect(listState.status).toBe('ready');
      expect(listState.data).toHaveLength(2);
      expect(listState.data[0].name).toBe('apple');
      expect(listState.data[1].name).toBe('apple');
    });

    it('should remove a record', async () => {
      const table = createTable<TestRecord>('test-reactive-remove-table');
      const rowState = table.add({ id: 'remove-id', name: 'to-remove', value: 999 });

      await table.promise(rowState);

      expect(rowState.status).toBe('ready');
      expect(rowState.data.id).toBe('remove-id');

      const stored = await table.store().read('remove-id');
      expect(stored).toBeDefined();
      expect(stored.id).toBe('remove-id');

      const removedState = table.remove('remove-id');

      expect(removedState.status).toBe('pending');

      await table.promise(removedState).catch(() => {});

      expect(removedState.status).toBe('removed');
      expect(removedState.data.deleted_at).toBeDefined();
    });

    it('should handle removing non-existent record', async () => {
      const table = createTable<TestRecord>('test-reactive-remove-non-existent-table');
      const rowState = table.remove('non-existent-id');

      expect(rowState.status).toBe('pending');

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('removed');
      expect(rowState.data.deleted_at).toBeInstanceOf(Date);
    });

    it('should track usage count for shared row states', () => {
      const table = createTable<TestRecord>('test-reactive-usage-table');
      const row1 = table.add({ id: 'usage-id', name: 'usage-test', value: 1 });
      const row2 = table.add({ id: 'usage-id', name: 'usage-test-2', value: 2 });

      expect(row1).toBe(row2);

      // This should not throw
      expect(() => table.leave('usage-id')).not.toThrow();
    });

    it('should synchronize row changes with IndexedDB', async () => {
      const table = createTable<TestRecord>('test-reactive-sync-table');
      const rowState = table.add({ id: 'sync-id', name: 'initial', value: 1 });

      await table.promise(rowState).catch(() => {});

      // Change the row data
      vi.useFakeTimers();
      rowState.data.name = 'updated';
      rowState.data.value = 2;
      vi.advanceTimersByTime(DB_SYNC_DELAY);
      vi.useRealTimers();

      // Wait for synchronization
      await table.promise(rowState).catch(() => {});

      // Create a new table instance to verify persistence
      const newTable = createTable<TestRecord>('test-reactive-sync-table');
      const newRowState = newTable.get('sync-id');

      await table.promise(newRowState).catch(() => {});

      expect(newRowState.data.name).toBe('updated');
      expect(newRowState.data.value).toBe(2);
    });
  });

  describe('Reactive Table Edge Cases', () => {
    it('should handle row state creation when database is not yet open', () => {
      const table = createTable<TestRecord>('test-reactive-edge-table');
      const rowState = table.add({ id: 'early-id', name: 'early', value: 1 });

      expect(rowState.status).toBe('pending');
      expect(rowState.data.name).toBe('early');
    });

    it('should handle concurrent access to the same row', async () => {
      const table = createTable<TestRecord>('test-reactive-concurrent-table');

      const promises = Array(10)
        .fill(null)
        .map(() => Promise.resolve(table.add({ id: 'concurrent-id', name: 'concurrent', value: 1 })));

      const rowStates = await Promise.all(promises);

      // All row states should be the same instance
      rowStates.forEach((rowState) => {
        expect(rowState).toBe(rowStates[0]);
      });
    });

    it('should handle rapid row changes', async () => {
      const table = createTable<TestRecord>('test-reactive-rapid-table');
      const rowState = table.add({ id: 'rapid-id', name: 'initial', value: 0 });

      await table.promise(rowState).catch(() => {});

      // Rapidly change the row data
      vi.useFakeTimers();
      for (let i = 1; i <= 100; i++) {
        rowState.data.value = i;
      }
      vi.advanceTimersByTime(DB_SYNC_DELAY);
      vi.useRealTimers();

      await table.promise(rowState).catch(() => {});

      const newTable = createTable<TestRecord>('test-reactive-rapid-table');
      const newRowState = newTable.get('rapid-id');

      await table.promise(newRowState).catch(() => {});

      expect(newRowState.data.value).toBe(100);
    });

    it('should handle row leave functionality', () => {
      const table = createTable<TestRecord>('test-reactive-leave-table');
      const rowState = table.add({ id: 'leave-id', name: 'leave-test', value: 1 });

      expect(rowState.status).toBe('pending');

      // This should not throw
      expect(() => table.leave('leave-id')).not.toThrow();

      // Test leaving non-existent row
      expect(() => table.leave('non-existent-id')).not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      vi.useFakeTimers();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRequest: any = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: null,
        error: new DOMException('Test error', 'AbortError'),
        transaction: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const mockIndexedDB = {
        open: () => {
          setTimeout(() => {
            mockRequest.onerror?.();
          }, 100);

          return mockRequest;
        },
      };

      const originIndexedDB = global.indexedDB;
      Object.defineProperty(global, 'indexedDB', {
        value: mockIndexedDB,
        writable: true,
      });

      const table = createTable<TestRecord>('init-error-reactive-table');
      const rowState = table.add({ id: 'error-id', name: 'error-test', value: 1 });

      await vi.runAllTimersAsync();

      expect(rowState.status).toBe('error');

      Object.defineProperty(global, 'indexedDB', {
        value: originIndexedDB,
        writable: true,
      });

      vi.useRealTimers();
    });

    it('should handle read errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-read-error-table');
      table.store().read = vi.fn().mockRejectedValue(new Error('Read error'));

      // Create a row with invalid data (proxy that throws)
      const rowState = table.get('test-id');

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('error');
      expect(rowState.error).toBeInstanceOf(Error);
    });

    it('should handle row creation errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-create-error-table');

      // Create a row with invalid data (proxy that throws)
      const rowState = table.add({
        profile: new Proxy({}, {}),
      } as never);

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('error');
      expect(rowState.error).toBeInstanceOf(Error);
    });

    it('should handle row update errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-update-error-table');
      const rowState = table.add({ id: 'update-error-id', name: 'update-test', value: 1 });

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('ready');

      // Mock the table to force an error on update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalTable = (table as any).store();
      const originalUpdate = internalTable.update;
      internalTable.update = vi.fn().mockRejectedValue('Update error');

      // Change row state to trigger synchronization
      vi.useFakeTimers();
      rowState.data.name = 'changed';
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('error');
      expect(rowState.error).toBeDefined();

      // Restore original function
      internalTable.update = originalUpdate;
    });

    it('should handle remove errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-remove-error-table');
      const rowState = table.add({ id: 'remove-error-id', name: 'remove-test', value: 1 });

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('ready');

      // Mock the table to force an error on delete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalTable = (table as any).store();
      const originalDelete = internalTable.delete;
      internalTable.delete = vi.fn().mockRejectedValue('Delete error');

      table.remove('remove-error-id');

      await table.promise(rowState).catch(() => {});

      expect(rowState.status).toBe('error');
      expect(rowState.error).toBeDefined();

      // Restore original function
      internalTable.delete = originalDelete;
    });

    it('should handle list errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-list-error-table');

      // Mock the table to force an error on find
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalTable = (table as any).store();
      const originalFind = internalTable.list;
      internalTable.list = vi.fn().mockRejectedValue('List error');

      const listState = table.list();

      await table.promise(listState).catch(() => {});

      expect(listState.status).toBe('error');
      expect(listState.error).toBeDefined();

      // Restore original function
      internalTable.list = originalFind;
    });

    it('should handle listIndex errors gracefully', async () => {
      const table = createTable<TestRecord>('test-reactive-list-index-error-table');

      // Mock the table to force an error on findByIndex
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalTable = (table as any).store();
      const originalFindIndex = internalTable.listByIndex;
      internalTable.listByIndex = vi.fn().mockRejectedValue('Find by index error');

      const listState = table.listByIndex('name');

      await table.promise(listState).catch(() => {});

      expect(listState.status).toBe('error');
      expect(listState.error).toBeDefined();

      // Restore original function
      internalTable.listByIndex = originalFindIndex;
    });

    it('should handle complex nested objects', async () => {
      interface ComplexRecord extends Rec {
        user: {
          name: string;
          preferences: {
            theme: string;
            notifications: boolean;
          };
        };
        settings: {
          version: number;
          features: string[];
        };
      }

      const table = createTable<ComplexRecord>('test-reactive-complex-table');
      const initialState = {
        id: 'complex-id',
        created_at: new Date(),
        updated_at: new Date(),
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        settings: {
          version: 1,
          features: ['feature1', 'feature2'],
        },
      };

      const rowState = table.add(initialState);
      expect(rowState.data).toEqual(initialState);

      // Modify nested property
      vi.useFakeTimers();
      rowState.data.user.preferences.theme = 'light';
      vi.advanceTimersByTime(DB_SYNC_DELAY);
      vi.useRealTimers();

      await table.promise(rowState).catch(() => {});

      const newTable = createTable<ComplexRecord>('test-reactive-complex-table');
      const newRowState = newTable.get('complex-id');

      await table.promise(newRowState).catch(() => {});

      expect(newRowState.data.user.preferences.theme).toBe('light');
    });
  });

  describe('Reactive Table Integration', () => {
    it('should handle multiple tables with different names', () => {
      const table1 = createTable<TestRecord>('integration-table-1');
      const table2 = createTable<TestRecord>('integration-table-2');

      const row1 = table1.add({ id: 'shared-id', name: 'table1-value', value: 1 });
      const row2 = table2.add({ id: 'shared-id', name: 'table2-value', value: 2 });

      // Rows should be different because they're from different tables
      expect(row1.data.name).toBe('table1-value');
      expect(row2.data.name).toBe('table2-value');
      expect(row1).not.toBe(row2);
    });

    it('should handle falsy values correctly', async () => {
      interface FalsyRecord extends Rec {
        count: number;
        text: string;
        flag: boolean;
        nullable: string | null;
      }

      const table = createTable<FalsyRecord>('test-reactive-falsy-table');
      const row1 = table.add({ id: 'falsy-id-1', count: 0, text: '', flag: false, nullable: null });

      expect(row1.data.count).toBe(0);
      expect(row1.data.text).toBe('');
      expect(row1.data.flag).toBe(false);
      expect(row1.data.nullable).toBe(null);

      // Change values
      vi.useFakeTimers();
      row1.data.count = 1;
      row1.data.text = 'non-empty';
      row1.data.flag = true;
      row1.data.nullable = 'not-null';
      vi.advanceTimersByTime(DB_SYNC_DELAY);
      vi.useRealTimers();

      await table.promise(row1).catch(() => {});

      // Verify persistence
      const newTable = createTable<FalsyRecord>('test-reactive-falsy-table');
      const newRowState = newTable.get('falsy-id-1');

      await table.promise(newRowState).catch(() => {});

      expect(newRowState.data.count).toBe(1);
      expect(newRowState.data.text).toBe('non-empty');
      expect(newRowState.data.flag).toBe(true);
      expect(newRowState.data.nullable).toBe('not-null');
    });
  });
});
