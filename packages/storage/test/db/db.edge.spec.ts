import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedStore } from '../../src/db/db.js';
import { create, createRecord, find, put, read, remove, update } from '../../src/db/helper.js';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { setIdProvider } from '../../src/db/index.js';

class TestIndexStore extends IndexedStore {
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
}

describe('IndexedDB - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  it('should handle upgrade error when no db or transaction is available', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockRequest: any = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: null,
      error: null,
      transaction: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockIndexedDB = {
      open: vi.fn().mockReturnValue(mockRequest),
    };

    // Override the global indexedDB with our mock
    Object.defineProperty(global, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    });

    class TestDb extends IndexedStore {
      constructor() {
        super('test-db');
        this.init().open();
      }
    }

    new TestDb();

    // Simulate the onupgradeneeded event with a mock event that has no db or transaction
    const mockEvent = {
      target: {
        result: null,
        transaction: null,
      },
    } as unknown as IDBVersionChangeEvent;

    // This should trigger the error handling code path
    expect(() => {
      if (mockRequest.onupgradeneeded) {
        mockRequest.onupgradeneeded(mockEvent);
      }
    }).toThrow('Unable to upgrade database: anchor://test-db@1.');
  });

  it('should handle onerror event during database opening', async () => {
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
      open: vi.fn().mockReturnValue(mockRequest),
    };

    const originIndexedDB = global.indexedDB;
    Object.defineProperty(global, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    });

    class TestDb extends IndexedStore {
      constructor() {
        super('test-db');
        this.init().open();
      }
    }

    const db = new TestDb();

    // Simulate the onerror event
    if (mockRequest.onerror) {
      mockRequest.onerror?.();
    }

    expect(db.status).toBe('closed');
    expect(db.error).toBeDefined();

    const event = await db.promise();
    expect(event.type).toBe('closed');

    Object.defineProperty(global, 'indexedDB', {
      value: originIndexedDB,
      writable: true,
    });
  });

  it('should handle error during setup when database is already opened', async () => {
    class TestDb extends IndexedStore {
      constructor(dbName: string, dbVersion = 1) {
        super(dbName, dbVersion);
        this.init().open();
      }

      protected setup(): void {
        // Simulate an error during setup
        throw new Error('Internal setup error: [5093]');
      }
    }

    const db = new TestIndexStore('test-db-3');
    await db.promise();

    const db2 = new TestDb('test-db-3');

    // Wait for the setup error to be processed
    const event2 = await db2.promise();

    expect(event2.type).toBe('closed');
    expect(db2.status).toBe('closed');
    expect(db2.error).toBeDefined();
    expect(db2.error?.message).toBe('Internal setup error: [5093]');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should handler table:find error', async () => {
    const request: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Find error') };
    const table = {
      openCursor: () => request,
    };
    const errorHandler = vi.fn();
    const promise = find(table as never).catch(errorHandler);

    request.onerror?.(request.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(request.error);
  });

  it('should handler table:read error', async () => {
    const request: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Read error') };
    const table = {
      getAll: () => request,
    };
    const errorHandler = vi.fn();
    const promise = read(table as never).catch(errorHandler);

    request.onerror?.(request.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(request.error);
  });

  it('should handler table:put error', async () => {
    const request: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Put error') };
    const table = {
      put: () => request,
    };
    const errorHandler = vi.fn();
    const promise = put(table as never, 'key', 'value').catch(errorHandler);

    request.onerror?.(request.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(request.error);
  });

  it('should handler table:remove error', async () => {
    const request: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Remove error') };
    const table = {
      delete: () => request,
    };
    const errorHandler = vi.fn();
    const promise = remove(table as never, 'key').catch(errorHandler);

    request.onerror?.(request.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(request.error);
  });

  it('should handler table:create error', async () => {
    const request: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Create error') };
    const table = {
      add: () => request,
    };
    const errorHandler = vi.fn();
    const promise = create(table as never, {}).catch(errorHandler);

    request.onerror?.(request.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(request.error);
  });

  it('should handler table:update error', async () => {
    const reader: {
      onsuccess: ((event: unknown) => void) | null;
      result: unknown;
    } = { onsuccess: null, result: { value: { id: 'key' } } };

    const updater: {
      onerror: ((error: Error) => void) | null;
      error: Error;
    } = { onerror: null, error: new Error('Update error') };

    const table = {
      get: () => reader,
      put: () => updater,
    };

    const errorHandler = vi.fn();
    const promise = update(table as never, 'key', {}).catch(errorHandler);

    reader.onsuccess?.({
      target: {
        result: {
          id: 'key',
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    updater.onerror?.(updater.error);

    await promise;
    expect(errorHandler).toHaveBeenCalledWith(updater.error);
  });

  it('should handle setting up custom ID Generator', () => {
    setIdProvider(() => 'custom-id');
    const rec = createRecord({ name: 'test' });

    expect(rec.id).toBe('custom-id');
    expect(rec.name).toBe('test');
    expect(rec.created_at).toBeInstanceOf(Date);
    expect(rec.updated_at).toBeInstanceOf(Date);
  });
});
