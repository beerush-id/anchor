import { isFunction, merge } from '@beerush/utils';
import { uuid } from './uuid.js';
import type { FilterFn, Rec, Row } from './types.js';

export const DEFAULT_FIND_LIMIT = 25;

/**
 * Finds records in an IndexedDB object store or index based on a filter.
 *
 * @template T - The type of records being retrieved.
 * @param {IDBObjectStore | IDBIndex} table - The object store or index to search in.
 * @param {IDBKeyRange | FilterFn} [filter] - Optional filter to apply. Can be an IDBKeyRange for key-based filtering
 * or a FilterFn function for custom filtering.
 * @param {number} limit - The maximum number of records to retrieve. Defaults to DEFAULT_FIND_LIMIT.
 * @param {IDBCursorDirection} [direction] - Optional direction for the cursor (e.g., 'next', 'prev').
 * @returns {Promise<T[]>} A promise that resolves with an array of found records.
 */
export const find = <T>(
  table: IDBObjectStore | IDBIndex,
  filter?: IDBKeyRange | FilterFn,
  limit: number = DEFAULT_FIND_LIMIT,
  direction?: IDBCursorDirection
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const request = table.openCursor(!isFunction(filter) ? filter : undefined, direction);
    const records: T[] = [];

    request.onsuccess = (event) => {
      const cursor = (event?.target as IDBRequest).result;

      if (cursor) {
        if (isFunction(filter)) {
          const match = filter(cursor.value);

          if (match) {
            records.push(cursor.value);
          }
        } else {
          records.push(cursor.value);
        }

        if (records.length < limit) {
          cursor.continue();
        } else {
          resolve(records);
        }
      } else {
        resolve(records);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Reads a record or all records from an IndexedDB object store.
 *
 * @template T - The type of the record(s) being retrieved.
 * @param {IDBObjectStore} table - The object store to read from.
 * @param {string} [id] - Optional ID of the specific record to retrieve. If not provided, all records are fetched.
 * @returns {Promise<T | T[] | undefined>} A promise that resolves with the retrieved record, array of records, or undefined if not found.
 */
export const read = <T>(table: IDBObjectStore, id?: string): Promise<T | T[] | undefined> => {
  return new Promise((resolve, reject) => {
    const request = id ? table.get(id) : table.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Puts a value into an IndexedDB object store with the specified key.
 *
 * @template T - The type of the value being stored.
 * @param {IDBObjectStore} table - The object store to put the value into.
 * @param {string} key - The key under which the value should be stored.
 * @param {T} value - The value to store.
 * @returns {Promise<T>} A promise that resolves with the stored value.
 */
export const put = <T>(table: IDBObjectStore, key: string, value: T): Promise<T> => {
  return new Promise((resolve, reject) => {
    const request = table.put(value, key);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Removes a record from an IndexedDB object store by its key.
 *
 * @param {IDBObjectStore} table - The object store to remove the record from.
 * @param {string} key - The key of the record to remove.
 * @returns {Promise<true>} A promise that resolves with [true](file://G:\Domains\beerush\anchor\node_modules\@types\chai\index.d.ts#L181-L181) when the record is successfully removed.
 */
export const remove = (table: IDBObjectStore, key: string): Promise<true> => {
  return new Promise((resolve, reject) => {
    const request = table.delete(key);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Creates a new record in an IndexedDB object store.
 *
 * @template T - The type of the record being created.
 * @template R - The type of the record with row metadata (id, created_at, updated_at).
 * @param {IDBObjectStore} table - The object store to create the record in.
 * @param {T} payload - The data to be stored in the new record.
 * @returns {Promise<R>} A promise that resolves with the created record including its metadata.
 */
export const create = <T extends Rec, R extends Row<T> = Row<T>>(table: IDBObjectStore, payload: T): Promise<R> => {
  return new Promise((resolve, reject) => {
    const record = createRecord<T, R>(payload);
    const request = table.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

export const createRecord = <T extends Rec, R extends Row<T> = Row<T>>(payload: T): R => {
  return {
    id: uuid(),
    created_at: new Date(),
    updated_at: new Date(),
    ...payload,
  } as R;
};

/**
 * Updates an existing record in an IndexedDB object store.
 *
 * @template T - The type of the record being updated.
 * @template R - The type of the record with row metadata (id, created_at, updated_at).
 * @param {IDBObjectStore} table - The object store to update the record in.
 * @param {string} key - The key of the record to update.
 * @param {Partial<T>} payload - The partial data to merge into the existing record.
 * @returns {Promise<R>} A promise that resolves with the updated record including its metadata.
 * @throws {Error} If the record with the specified key is not found.
 */
export const update = async <T extends Rec, R extends Row<T> = Row<T>>(
  table: IDBObjectStore,
  key: string,
  payload: Partial<T>
): Promise<R> => {
  const current = await read<R>(table, key);

  if (!current) {
    throw new Error(`Record with key "${key}" not found.`);
  }

  return await new Promise((resolve, reject) => {
    merge(current, { ...payload, updated_at: new Date() });
    const request = table.put(current);

    request.onsuccess = () => resolve(current as R);
    request.onerror = () => reject(request.error);
  });
};
