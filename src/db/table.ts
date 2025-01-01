import { Rec } from '../core/index.js';
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
    return write<T>(this.db as IDBDatabase, this.name, data, id);
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
