import { isFunction, merge } from '@beerush/utils';
import { shortId } from '@anchor/core';

export type Rec = {
  [key: string]: unknown;
};
export type Row<T extends Rec> = T & {
  id: string;
  created_at: Date;
  updated_at: Date;
};

export type FilterFn = <T extends Rec>(record: Row<T>) => boolean;
export const DEFAULT_FIND_LIMIT = 25;

export const find = <T>(
  table: IDBObjectStore | IDBIndex,
  filter?: IDBKeyRange | FilterFn,
  limit = DEFAULT_FIND_LIMIT,
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

export const read = <T>(table: IDBObjectStore, id?: string): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    const request = id ? table.get(id) : table.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const put = <T>(table: IDBObjectStore, key: string, value: T): Promise<T> => {
  return new Promise((resolve, reject) => {
    const request = table.put(value, key);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};

export const remove = (table: IDBObjectStore, key: string): Promise<true> => {
  return new Promise((resolve, reject) => {
    const request = table.delete(key);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const create = <T extends Rec, R extends Row<T> = Row<T>>(table: IDBObjectStore, payload: T): Promise<R> => {
  return new Promise((resolve, reject) => {
    const record = {
      id: shortId(),
      created_at: new Date(),
      updated_at: new Date(),
      ...payload,
    } as R;
    const request = table.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

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

    request.onsuccess = () => resolve(current);
    request.onerror = () => reject(request.error);
  });
};
