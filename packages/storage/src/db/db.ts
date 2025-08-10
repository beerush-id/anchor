import { isFunction } from '@beerush/utils';
import { logger } from '@anchor/core';

export const DB_NAME = 'anchor';

export enum IDBStatus {
  Idle = 'idle',
  Init = 'init',
  Open = 'open',
  Closed = 'closed',
}

export type DBEvent = {
  type: IDBStatus;
};
export type DBSubscriber = (event: DBEvent) => void;
export type DBUnsubscribe = () => void;

const DB_CONNECTIONS = new Map<string, Connection>();

type UpgradeList = Set<(event: IDBVersionChangeEvent) => void>;
type LoaderList = Set<(db: IDBDatabase) => Promise<void> | void>;
type RejectList = Set<(error: DOMException | null) => void>;
type CloseList = Set<(error?: Error) => void>;

type Connection = {
  name: string;
  version: number;
  error?: DOMException | Error | null;
  status: IDBStatus;
  onUpgrade: UpgradeList;
  onLoaded: LoaderList;
  onClosed: CloseList;
  onError: RejectList;
  open: () => Connection;
  close: (error?: Error) => void;
  instance?: IDBDatabase;
};

const createConnection = (name: string, version: number): Connection => {
  if (hasIndexedDb()) {
    const connection = {
      name,
      version,
      status: IDBStatus.Idle,
      onUpgrade: new Set(),
      onLoaded: new Set(),
      onClosed: new Set(),
      onError: new Set(),
      open: () => {
        const request = indexedDB.open(connection.name, connection.version);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest)?.result;
          const transaction = (event.target as IDBOpenDBRequest).transaction;

          if (!db || !transaction) {
            throw new Error(`Unable to upgrade database: ${connection.name}@${connection.version}.`);
          }

          for (const upgrade of connection.onUpgrade) {
            upgrade(event);
          }
        };
        request.onsuccess = async () => {
          connection.instance = request.result;
          connection.status = IDBStatus.Open;

          for (const load of connection.onLoaded) {
            await load(request.result);
          }
        };
        request.onerror = () => {
          connection.error = request.error;
          connection.status = IDBStatus.Closed;

          for (const reject of connection.onError) {
            reject(request.error);
          }
        };

        return connection;
      },
      close: (error) => {
        DB_CONNECTIONS.delete(connection.name);

        if (error) {
          connection.error = error;
        }

        connection.status = IDBStatus.Closed;
        connection.instance?.close();

        for (const close of connection.onClosed) {
          close(error);
        }
      },
    } as Connection;

    DB_CONNECTIONS.set(connection.name, connection);

    return connection;
  } else {
    return {
      name,
      version,
      error: new Error('IndexedDB is not available.'),
      status: IDBStatus.Closed,
      close: () => {},
    } as Connection;
  }
};

export class IndexedStore {
  #subscribers = new Set<DBSubscriber>();

  protected get connectionName() {
    return `${DB_NAME}://${this.dbName}`;
  }

  public connection: Connection;
  public status = IDBStatus.Idle;
  public error?: Error;

  public get instance(): IDBDatabase | undefined {
    return this.connection.instance;
  }

  constructor(
    protected dbName: string,
    protected version = 1
  ) {
    this.connection = DB_CONNECTIONS.get(this.connectionName) as Connection;

    if (!this.connection) {
      this.connection = createConnection(this.connectionName, version);
    }

    if (version > this.connection.version) {
      this.connection.version = version;
    }

    this.status = this.connection.status;
    this.error = this.connection.error as Error;
  }

  public init(): this {
    const connection = this.connection;

    if (connection.status === IDBStatus.Idle) {
      this.status = connection.status = IDBStatus.Init;
    }

    if (connection.status === IDBStatus.Init) {
      connection.onUpgrade.add((event: IDBVersionChangeEvent) => {
        if (this.status !== IDBStatus.Init) return;

        try {
          this.upgrade?.(event);
        } catch (error) {
          this.error = error as Error;
          this.status = IDBStatus.Closed;
          this.finalize();
        }
      });
      connection.onClosed.add((error) => {
        if (error) {
          this.error = error;
        }

        this.status = IDBStatus.Closed;
        this.publish({ type: IDBStatus.Closed });
      });
      connection.onLoaded.add(async () => {
        if (this.status !== IDBStatus.Init) return;

        try {
          await this.setup?.();
          this.status = IDBStatus.Open;
        } catch (error) {
          this.error = error as Error;
          this.status = IDBStatus.Closed;
        }

        this.finalize();
      });
      connection.onError.add((error) => {
        this.error = error as Error;
        this.status = IDBStatus.Closed;
        this.finalize();
      });
    } else {
      this.connection.onClosed?.add((error) => {
        if (error) {
          this.error = error;
        }

        this.status = IDBStatus.Closed;
        this.publish({ type: IDBStatus.Closed });
      });

      if (connection.status === IDBStatus.Open) {
        (async () => {
          this.status = IDBStatus.Init;

          try {
            await this.setup?.();
            this.status = IDBStatus.Open;
          } catch (error) {
            logger.error(error);
            this.error = error as Error;
            this.status = IDBStatus.Closed;
          } finally {
            this.finalize();
          }
        })();
      } else {
        this.finalize();
      }
    }

    return this;
  }

  public open(): this {
    this.connection?.open?.();
    return this;
  }

  public close(error?: Error) {
    this.connection.close(error);
  }

  protected finalize(): void {
    this.publish({ type: this.status });
  }

  protected publish(event: DBEvent) {
    for (const subscriber of this.#subscribers) {
      if (isFunction(subscriber)) {
        subscriber(event);
      }
    }
  }

  public subscribe(handler: DBSubscriber): DBUnsubscribe {
    this.#subscribers.add(handler);
    return () => {
      this.#subscribers.delete(handler);
    };
  }

  protected upgrade?(event: IDBVersionChangeEvent): void;
  protected setup?(): Promise<void> | void;

  public async promise(): Promise<DBEvent> {
    if (this.status !== IDBStatus.Init) {
      return { type: this.status };
    }

    return await new Promise((resolve) => {
      const unsubscribe = this.subscribe((event) => {
        if (event.type === IDBStatus.Open || event.type === IDBStatus.Closed) {
          resolve(event);
          unsubscribe();
        }
      });
    });
  }
}

const hasIndexedDb = () => typeof indexedDB !== 'undefined';
