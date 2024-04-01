import { Rec } from '../core/index.js';
import { Part } from '../core/base.js';
import { merge } from '../utils/index.js';
import { open, read, write } from './db.js';

const DB_NAME = 'anchor-db';

export class IndexedTable<T extends Rec> {
  private db?: IDBDatabase;

  constructor(public name: string, public dbName = DB_NAME, public dbVersion = 1) {}

  public async get(id: string) {
    await this.initialize();
    return read<T>(this.db as IDBDatabase, this.name, id);
  }

  public async create(payload: Part<T>) {
    await this.initialize();
    return write<T>(this.db as IDBDatabase, this.name, payload);
  }

  public async update(id: string, payload: Part<T>) {
    await this.initialize();

    const data = await read<T>(this.db as IDBDatabase, this.name, id);
    merge(data, payload);
    return write<T>(this.db as IDBDatabase, this.name, data);
  }

  private async initialize() {
    if (!this.db) {
      await this.open();
    }
  }

  private async open() {
    this.db = await open(this.dbName, this.name, this.dbVersion);
  }
}

export function table<T extends Rec>(name: string, db = DB_NAME, version = 1) {
  return new IndexedTable<T>(name, db, version);
}
