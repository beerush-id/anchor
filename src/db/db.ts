import { Rec } from '../core/index.js';
import { Part } from '../core/base.js';
import { logger } from '../utils/index.js';

const DB_STORE = new Map<string, IDBDatabase>();

export type IndexedRecord<T extends Rec> = T & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdAtI: number;
  updatedAtI: number;
};

export const open = async (name: string, table: string, version = 1, indexes?: string[]): Promise<IDBDatabase> => {
  name = `${name}-${table}`;

  let db = DB_STORE.get(name);

  if (!db) {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onupgradeneeded = (event) => {
        const dbx = (event.target as never as IDBOpenDBRequest)?.result;
        const trx = (event.target as never as IDBOpenDBRequest)?.transaction;

        if (!dbx) {
          reject(new Error('Failed to upgrade database.'));
        }

        if (!dbx.objectStoreNames.contains(table)) {
          const store = dbx.createObjectStore(table, { keyPath: 'id' });

          if (indexes) {
            for (const name of indexes) {
              if (!name.startsWith('-')) {
                store.createIndex(name, name);
              }
            }
          }
        } else if (indexes) {
          const store = trx?.objectStore(table);

          if (!store) {
            throw new Error(`Failed to read object store ${table}.`);
          }

          for (const name of indexes) {
            if (!name.startsWith('-') && !store.indexNames.contains(name)) {
              try {
                store.createIndex(name, name);
              } catch (error) {
                logger.warn(error);
              }
            }

            if (name.startsWith('-')) {
              const flatName = name.replace(/^-/, '');

              if (store.indexNames.contains(flatName)) {
                store.deleteIndex(flatName);
              }
            }
          }
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });

    DB_STORE.set(name, db);
  }

  return db;
};

export const read = <T extends Rec>(db: IDBDatabase, name: string, id?: string): Promise<IndexedRecord<T>> => {
  if (!db) throw new Error('Database not initialized.');

  return new Promise<IndexedRecord<T>>((resolve, reject) => {
    const store = db?.transaction(name).objectStore(name);
    let request;

    if (id) {
      request = store.get(id);
    } else {
      request = store.getAll();
    }

    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      reject(new Error('Failed to read from database.'));
    }
  });
};

export type QueryFn<T extends Rec> = (rec: IndexedRecord<T>) => boolean;

export type QueryWhereFilter<T extends Rec> = {
  [K in keyof T]?: T[K] | ((value: T[K]) => boolean);
};
export type QueryOptions<T extends Rec> = {
  where?: QueryWhereFilter<T>;
  orderBy?: string;
  offset?: number;
  limit?: number;
};

export const search = <T extends Rec>(
  db: IDBDatabase,
  name: string,
  fn?: QueryFn<T>,
  options?: QueryOptions<T>
): Promise<IndexedRecord<T>[]> => {
  if (!db) throw new Error('Database not initialized.');

  const { offset = 0, limit } = options ?? {};

  return new Promise<IndexedRecord<T>[]>((resolve, reject) => {
    const start = Date.now();
    const store = db?.transaction(name).objectStore(name);
    const result: IndexedRecord<T>[] = [];

    let request;
    let position = 0;

    if (options?.where) {
      fn = (rec) => {
        return Object.entries(options.where as never).some(([key, value]) => {
          if (typeof value === 'function') {
            return value(rec[key]);
          }

          return rec[key] === value;
        });
      };
    }

    if (options?.orderBy) {
      const name = options.orderBy.replace(/^-/, '');
      const direction = options.orderBy.startsWith('-') ? 'prev' : 'next';
      const index = store.index(name);

      if (typeof fn !== 'function') {
        fn = () => true;
      }

      request = index.openCursor(null, direction);
    } else {
      if (typeof fn === 'function') {
        request = store.openCursor();
      } else {
        request = store.getAll(null, limit);
      }
    }

    request.onsuccess = async (event) => {
      if (typeof fn === 'function') {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          if (fn(cursor.value)) {
            if (position >= offset) {
              result.push(cursor.value);
            }

            position++;
          }

          if (limit && result.length >= limit) {
            resolve(result);
            logger.debug('[anchor:db:search] Query time:', Date.now() - start, 'ms');
            return;
          }

          cursor.continue();
        } else {
          resolve(result);
          logger.debug('[anchor:db:search] Query time:', Date.now() - start, 'ms');
        }
      } else {
        resolve((event.target as IDBRequest).result);
        logger.debug('[anchor:db:search] Query time:', Date.now() - start, 'ms');
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const write = <T extends Rec>(db: IDBDatabase, name: string, payload: Part<T>): Promise<IndexedRecord<T>> => {
  if (!db) throw new Error('Database not initialized.');

  return new Promise<IndexedRecord<T>>((resolve, reject) => {
    const store = db?.transaction(name, 'readwrite').objectStore(name);
    const record = { ...payload } as IndexedRecord<T>;

    if (!record.id) {
      record.id = crypto.randomUUID();
    }

    const request = store.put(record);

    if (request) {
      request.onsuccess = () => resolve(record as never);
      request.onerror = () => reject(request.error);
    } else {
      reject(new Error('Failed to write to database.'));
    }
  });
};

export const remove = (db: IDBDatabase, name: string, id: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  return new Promise((resolve, reject) => {
    const store = db?.transaction(name, 'readwrite').objectStore(name);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
