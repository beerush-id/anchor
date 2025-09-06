import { describe, expect, it } from 'vitest';
import { IDBStatus, IndexedTable, type Rec } from '../../src/db/index.js';

interface TestRecord extends Rec {
  name: string;
  value: number;
}

describe('Indexed Table', () => {
  describe('Indexed Table - Basic', () => {
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
