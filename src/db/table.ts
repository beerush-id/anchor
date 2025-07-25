import { Rec, type Writable, writable } from '../core/index.js';
import { Part } from '../core/base.js';
import { merge } from '../utils/index.js';
import { type IndexedRecord, open, type QueryFn, type QueryOptions, read, remove, search, write } from './db.js';

const DB_NAME = 'anchor-db';

export type TableRow<T extends Rec> = IndexedRecord<T>;

export class IndexedTable<T extends Rec> {
  private db?: IDBDatabase;

  constructor(
    public name: string,
    public indexes?: Array<keyof IndexedTable<T> | string>,
    public dbVersion = 1,
    public dbName = DB_NAME
  ) {}

  public async create(payload: Part<T>): Promise<TableRow<T>> {
    await this.initialize();
    return write<T>(this.db as IDBDatabase, this.name, {
      createdAt: new Date().toISOString(),
      createdAtI: Date.now(),
      updatedAt: new Date().toISOString(),
      updatedAtI: Date.now(),
      ...payload,
    });
  }

  public async read(id: string): Promise<TableRow<T>> {
    await this.initialize();
    return read<T>(this.db as IDBDatabase, this.name, id);
  }

  public async update(id: string, payload: Part<T>): Promise<TableRow<T>> {
    await this.initialize();

    const data = await read<T>(this.db as IDBDatabase, this.name, id);
    merge(data, { ...payload, updatedAt: new Date().toISOString(), updatedAtI: Date.now() });
    return write<T>(this.db as IDBDatabase, this.name, data);
  }

  public async delete(id: string) {
    await this.initialize();
    return remove(this.db as IDBDatabase, this.name, id);
  }

  public async query(options?: QueryOptions<T>): Promise<TableRow<T>[]> {
    await this.initialize();
    return search(this.db as IDBDatabase, this.name, undefined, options);
  }

  public async search(fn: QueryFn<T>, options?: QueryOptions<T>): Promise<TableRow<T>[]> {
    await this.initialize();
    return search(this.db as IDBDatabase, this.name, fn, options);
  }

  private async initialize() {
    if (!this.db) {
      await this.open();
    }
  }

  private async open() {
    this.db = await open(this.dbName, this.name, this.dbVersion, this.indexes as never);
  }
}

export function table<T extends Rec>(
  name: string,
  indexes?: Array<keyof IndexedTable<T> | string>,
  version = 1,
  db = DB_NAME
) {
  return new IndexedTable<T>(name, indexes, version, db);
}

export type QueryState<T extends Rec> = Writable<{
  data: TableRow<T>[];
  status: 'idle' | 'pending' | 'done' | 'error';
  canLoadMore: boolean;
  load: (options?: RequestInit) => Promise<TableRow<T>[]>;
  more: (options?: QueryOptions<T>) => Promise<TableRow<T>[]>;
  find: (fn: QueryFn<T>, options?: QueryOptions<T>) => Promise<TableRow<T>[]>;
  delete: (...ids: string[]) => Promise<void>;
  update: (...records: Array<Part<T> & { id: string }>) => Promise<void>;
}>;

export function query<T extends Rec>(table: IndexedTable<T>, initOptions?: QueryOptions<T>): QueryState<T> {
  const { limit = 50 } = initOptions ?? {};
  const [state] = writable({ data: [], status: 'idle', canLoadMore: false }) as never as [QueryState<T>];

  let filterFn: QueryFn<T> | void;

  Object.assign(state, {
    load: async (options?: QueryOptions<T>) => {
      if (!options) {
        options = initOptions;
      }

      filterFn = undefined;

      state.set({ status: 'pending' });

      const result = await table.query(options);

      state.set({
        data: result,
        status: 'done',
        canLoadMore: result.length >= (options?.limit ?? limit),
      });

      return result;
    },
    find: async (fn: QueryFn<T>, options?: QueryOptions<T>) => {
      if (!options) {
        options = initOptions;
      }

      filterFn = fn;

      state.set({ status: 'pending' });

      const result = await table.search(fn, options);

      state.set({
        data: result,
        status: 'done',
        canLoadMore: result.length >= (options?.limit ?? limit),
      });
    },
    more: async (options?: QueryOptions<T>) => {
      if (!options) {
        options = initOptions;
      }

      state.set({ status: 'pending' });

      let result: TableRow<T>[] = [];

      if (typeof filterFn === 'function') {
        result = await table.search(filterFn, {
          ...options,
          offset: state.data.length,
          limit: options?.limit ?? limit,
        });
      } else {
        result = await table.query({
          ...options,
          offset: state.data.length,
          limit: options?.limit ?? limit,
        });
      }

      state.set({
        data: [...state.data, ...result.filter((rec) => !state.data.find((r) => r.id === rec.id))],
        status: 'done',
        canLoadMore: result.length >= (options?.limit ?? limit),
      });
    },
    update: async (...records: TableRow<T>[]) => {
      state.set({ status: 'pending' });

      await Promise.all(
        records.map(async (record) => {
          const rec = state.data.find((rec) => rec.id === record.id);

          if (rec) {
            const result = await table.update(record.id, record);
            Object.assign(rec, result);
          }
        })
      );

      state.set({ status: 'idle' });
    },
    delete: async (...ids: string[]) => {
      state.set({ status: 'pending' });

      await Promise.all(
        ids.map(async (id) => {
          const rec = state.data.find((rec) => rec.id === id);

          if (rec) {
            await table.delete(id);
            state.data.splice(state.data.indexOf(rec), 1);
          }
        })
      );

      state.set({ status: 'idle' });
    },
  });

  Object.defineProperty(state, 'load', { enumerable: false });
  Object.defineProperty(state, 'find', { enumerable: false });
  Object.defineProperty(state, 'more', { enumerable: false });

  return state as never;
}
