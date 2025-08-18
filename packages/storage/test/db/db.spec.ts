import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { type DBEvent, IDBStatus, IndexedStore } from '../../src/db/index.js';

// Test implementation of IndexedDb
class TestIndexedDb extends IndexedStore {
  constructor(dbName: string, dbVersion = 1) {
    super(dbName, dbVersion);
    this.init().open();
  }

  protected upgrade(event: IDBVersionChangeEvent): void {
    const db = (event.target as IDBOpenDBRequest)?.result as IDBDatabase;
    if (db && !db.objectStoreNames.contains('test-store')) {
      db.createObjectStore('test-store');
    }
  }

  protected setup(): void {
    // Test setup implementation
  }
}

describe('IndexedDB Module', () => {
  describe('IndexedDb', () => {
    it('should initialize with correct default values', () => {
      const db = new IndexedStore('test-db');

      expect(db).toBeInstanceOf(IndexedStore);
      expect(db.status).toBe(IDBStatus.Closed);
      expect(db.error).toBeDefined();
    });

    it('should handle IndexedDB not supported', () => {
      const db = new IndexedStore('test-db');

      expect(db.status).toBe(IDBStatus.Closed);
      expect(db.error).toBeDefined();
      expect(db.error?.message).toBe('IndexedDB is not available.');
    });

    it('should support initialization promise', async () => {
      const db = new IndexedStore('test-db');
      const event = await db.promise();

      expect(event.type).toBe(IDBStatus.Closed);
      expect(db.status).toBe(IDBStatus.Closed);
    });
  });
});

describe('Mocked IndexedDB Module', () => {
  beforeEach(() => {
    mockIndexedDB();
  });

  afterEach(() => {
    clearIndexedDBMock();
  });

  describe('IndexedDb', () => {
    it('should open database successfully', async () => {
      const db = new TestIndexedDb('test-db');
      expect(db.status).toBe(IDBStatus.Init);

      const event = await db.promise();

      expect(event.type).toBe(IDBStatus.Open);
      expect(db.status).toBe(IDBStatus.Open);
      expect(db.error).toBeUndefined();
    });

    it('should handle subscription and unsubscription', () => {
      const db = new TestIndexedDb('test-db');
      const subscriber = vi.fn();

      const unsubscribe = db.subscribe(subscriber);
      expect(typeof unsubscribe).toBe('function');

      // Test that we can unsubscribe
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should publish events to subscribers', () => {
      const db = new TestIndexedDb('test-db');
      const subscriber = vi.fn();

      db.subscribe(subscriber);

      // Simulate internal publish call
      (db as never as { publish: (event: DBEvent) => void }).publish({ type: IDBStatus.Closed });

      expect(subscriber).toHaveBeenCalledWith({ type: IDBStatus.Closed });
    });

    it('should handle non-function subscribers gracefully', () => {
      const db = new TestIndexedDb('test-db');

      // Add a non-function subscriber (invalid case)
      db.subscribe('function' as never);

      // This should not throw an error
      expect(() =>
        (db as never as { publish: (event: DBEvent) => void }).publish({ type: IDBStatus.Closed })
      ).not.toThrow();
    });

    it('should close database properly', async () => {
      const db = new TestIndexedDb('test-db');
      await db.promise(); // Wait for db to open

      db.close(new Error('Test error'));

      expect(db.status).toBe(IDBStatus.Closed);
      expect(db.error).toBeDefined();
      expect(db.error?.message).toBe('Test error');
    });

    it('should resolve promise when database opens', async () => {
      const db = new TestIndexedDb('test-db');

      const promise = db.promise();
      const event = await promise;

      expect(event.type).toBe(IDBStatus.Open);
    });

    it('should resolve promise when database closes', async () => {
      const db = new TestIndexedDb('test-db');

      // Immediately close the database
      db.close(new Error('Test error'));

      const event = await db.promise();
      expect(event.type).toBe(IDBStatus.Closed);
    });

    it('should handle upgrade error', async () => {
      class ErrorUpgradeDb extends IndexedStore {
        constructor(dbName: string) {
          super(dbName);
          this.init().open();
        }

        protected upgrade(): void {
          throw new Error('Upgrade error');
        }
      }

      const db = new ErrorUpgradeDb('error-db');
      const event = await db.promise();

      expect(event.type).toBe(IDBStatus.Closed);
      expect(db.error).toBeDefined();
      expect(db.error?.message).toBe('Upgrade error');
    });

    it('should handle setup error', async () => {
      class ErrorSetupDb extends IndexedStore {
        constructor(dbName: string) {
          super(dbName);
          this.init().open();
        }

        protected setup(): void {
          throw new Error('Setup error');
        }
      }

      const db = new ErrorSetupDb('error-db');
      const event = await db.promise();

      expect(event.type).toBe(IDBStatus.Closed);
      expect(db.error).toBeDefined();
      expect(db.error?.message).toBe('Setup error');
    });

    it('should handle finalize method', () => {
      class FinalizeDb extends IndexedStore {
        public finalizeCalled = false;

        constructor(dbName: string) {
          super(dbName);
        }

        protected finalize(): void {
          this.finalizeCalled = true;
        }
      }

      const db = new FinalizeDb('finalize-db');

      // Call the protected finalize method
      (db as never as { finalize: () => void }).finalize();

      expect(db.finalizeCalled).toBe(true);
    });
  });
});

describe('Shared DB Instance', () => {
  beforeEach(() => {
    mockIndexedDB();
  });

  afterEach(() => {
    clearIndexedDBMock();
  });

  it('should share the same connection for instances with same dbName', () => {
    const db1 = new TestIndexedDb('sameName');
    const db2 = new TestIndexedDb('sameName');

    expect(db1.connection === db2.connection).toBe(true);
  });

  it('should have same status for shared instances', async () => {
    const db1 = new TestIndexedDb('sameName');
    const db2 = new TestIndexedDb('sameName');

    expect(db1.status).toBe(db2.status);

    await db1.promise();
    await db2.promise();

    expect(db1.status).toBe(IDBStatus.Open);
    expect(db2.status).toBe(IDBStatus.Open);

    expect(db1.status).toBe(db2.status);
  });

  it('should close connection for all shared instances', async () => {
    const db1 = new TestIndexedDb('sameName');
    const db2 = new TestIndexedDb('sameName');

    await db1.promise(); // Wait for db to open

    // Close first instance
    db1.close(new Error('Test error'));

    expect(db1.status).toBe(IDBStatus.Closed);
    expect(db2.status).toBe(IDBStatus.Closed);
    expect(db1.error).toBeDefined();
    expect(db2.error).toBeDefined();
  });
});
