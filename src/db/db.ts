import { Rec } from '../core/index.js';
import { Part } from '../core/base.js';

const DB_STORE = new Map<string, IDBDatabase>();

export const open = async (name: string, table: string, version = 1): Promise<IDBDatabase> => {
  let db = DB_STORE.get(name);

  if (!db) {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(table, { keyPath: 'id' });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    DB_STORE.set(name, db);
  }

  return db;
};

export const read = <T extends Rec>(db: IDBDatabase, name: string, id: string): Promise<T> => {
  if (!db) throw new Error('Database not initialized.');

  return new Promise<T>((resolve, reject) => {
    const request = db?.transaction(name).objectStore(name).get(id);

    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
};

export const write = <T extends Rec>(db: IDBDatabase, name: string, payload: Part<T>): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  return new Promise<void>((resolve, reject) => {
    const request = db?.transaction(name, 'readwrite').objectStore(name).put(payload);

    if (request) {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });
};
