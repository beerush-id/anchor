import { isFunction } from '@beerush/utils';
import { captureStack } from '@anchor/core';

export const DB_NAME = 'anchor';
export const DB_SYNC_DELAY = 100;

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

/**
 * Creates a new IndexedDB connection with the specified name and version.
 *
 * This function initializes a connection object that manages the IndexedDB lifecycle,
 * including opening, upgrading, loading, and closing the database. It handles all
 * the necessary event callbacks and maintains the connection state.
 *
 * @param name - The name of the database to connect to
 * @param version - The version number of the database schema
 * @returns A Connection object that represents the database connection
 */
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

/**
 * IndexedStore is a class that manages IndexedDB connections and provides
 * a high-level interface for database operations. It handles connection
 * lifecycle management, including initialization, opening, closing, and
 * version upgrades.
 *
 * The class provides event subscription capabilities to monitor database
 * status changes and supports both synchronous and asynchronous setup
 * operations during database initialization.
 */
export class IndexedStore {
  /**
   * Set of subscribers that are notified of database status changes
   * @private
   */
  #subscribers = new Set<DBSubscriber>();

  /**
   * Gets the full connection name including the database name prefix
   * @protected
   * @returns The formatted connection name
   */
  protected get connectionName() {
    return `${DB_NAME}://${this.dbName}`;
  }

  /**
   * The underlying database connection object
   */
  public connection: Connection;

  /**
   * Current status of the database connection
   */
  public status = IDBStatus.Idle;

  /**
   * Error that occurred during database operations, if any
   */
  public error?: Error;

  /**
   * Gets the underlying IndexedDB database instance
   * @returns The IDBDatabase instance or undefined if not open
   */
  public get instance(): IDBDatabase | undefined {
    return this.connection.instance;
  }

  /**
   * Creates a new IndexedStore instance
   * @param dbName - The name of the database
   * @param version - The version of the database schema (default: 1)
   */
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

  /**
   * Initializes the database connection by setting up event handlers
   * for upgrade, load, error, and close events. This method should be
   * called before opening the database.
   *
   * @returns This IndexedStore instance for method chaining
   */
  public init(): this {
    const connection = this.connection;

    if (connection.status === IDBStatus.Idle) {
      this.status = connection.status = IDBStatus.Init;
    }

    if (connection.status === IDBStatus.Init) {
      connection.onUpgrade.add((event: IDBVersionChangeEvent) => {
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
            captureStack.error.external(
              `Unable to finish the Database setup of "${this.dbName}".`,
              error as Error,
              this.init
            );
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

  /**
   * Opens the database connection. This method triggers the actual
   * IndexedDB open operation.
   *
   * @returns This IndexedStore instance for method chaining
   */
  public open(): this {
    this.connection?.open?.();
    return this;
  }

  /**
   * Closes the database connection
   * @param error - Optional error that caused the close
   */
  public close(error?: Error) {
    this.connection.close(error);
  }

  /**
   * Finalizes the initialization process by publishing the current status
   * @protected
   */
  protected finalize(): void {
    this.publish({ type: this.status });
  }

  /**
   * Publishes a database event to all subscribers
   * @param event - The database event to publish
   * @protected
   */
  protected publish(event: DBEvent) {
    for (const subscriber of this.#subscribers) {
      if (isFunction(subscriber)) {
        subscriber(event);
      }
    }
  }

  /**
   * Subscribes to database status changes
   * @param handler - The function to call when status changes
   * @returns A function to unsubscribe from status changes
   */
  public subscribe(handler: DBSubscriber): DBUnsubscribe {
    this.#subscribers.add(handler);
    return () => {
      this.#subscribers.delete(handler);
    };
  }

  /**
   * Optional method that is called when the database version needs to be upgraded.
   * Override this method in subclasses to define database schema changes.
   * @param event - The version change event
   * @protected
   */
  protected upgrade?(event: IDBVersionChangeEvent): void;

  /**
   * Optional method that is called after the database is opened.
   * Override this method in subclasses to perform any additional setup.
   * @protected
   */
  protected setup?(): Promise<void> | void;

  /**
   * Returns a promise that resolves when the database reaches either
   * the Open or Closed state. If the database is already in one of
   * these states, the promise resolves immediately.
   *
   * @returns A promise that resolves with the database event
   */
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
