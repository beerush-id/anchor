import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

export function mockIndexedDB() {
  Object.defineProperty(global, 'indexedDB', {
    value: indexedDB,
    writable: true,
  });

  Object.defineProperty(global, 'IDBKeyRange', {
    value: IDBKeyRange,
    writable: true,
  });
}

export function clearIndexedDBMock() {
  if (global.indexedDB) {
    // Clear all mock data
  }
}
