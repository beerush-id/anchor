# Table Storage APIs

This API provides a reactive, promise-first interface for interacting with IndexedDB tables.

## Core Table Functions

### `createTable()`

Creates and returns a [ReactiveTable](types.md#reactivetable) instance. This is the primary function you will use to interact with a table. The returned [ReactiveTable](types.md#reactivetable) is a higher-level, reactive interface that simplifies state management for IndexedDB records.

```typescript
type createTable = <T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string,
  seeds?: R[]
) => ReactiveTable<T, R>;
```

- `name`: The name of the object store (table).
- `version` (optional): The database version. Changing this will trigger an upgrade.
- `indexes` (optional): An array of field names to create indexes on for faster queries. See [keyof R](types.md#row-t).
- `remIndexes` (optional): An array of index names to remove during an upgrade. See [keyof R](types.md#row-t).
- `dbName` (optional): The name of the database. Defaults to the table name.
- `seeds` (optional): An array of initial data to populate the table with when it is first created. See [R](types.md#row-t).
- **Returns**: A [ReactiveTable](types.md#reactivetable) object, which provides methods to get, add, list, and remove records in a reactive way.

## Table Interfaces

### `ReactiveTable`

This is the higher-level, reactive interface returned by [createTable()](#createtable). It provides methods to manage records and their states, automatically handling synchronization between your application state and the IndexedDB database.

```typescript
interface ReactiveTable<T extends Rec, R extends Row<T> = Row<T>> {
  get(id: string): RowState<R>;
  add(payload: T): RowState<R>;
  list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): RowListState<R>;
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): RowListState<R>;
  remove(id: string): RowState<R>;
  seed(seeds: R[]): this;
  leave(id: string): void;
  promise<S extends RowState<R> | RowListState<R>>(state: S): Promise<S>;
  store(): IndexedTable<T, R>;
}
```

#### Methods

##### `get(id: string)`

Retrieves a single record by its ID and returns it as a reactive state object ([RowState](types.md#rowstate-r-extends-row-rec)). If the record is not in memory, it will be fetched from the database.

- `id`: The unique identifier of the record to retrieve.
- **Returns**: A reactive state object ([RowState](types.md#rowstate-r-extends-row-rec)) representing the database record.

##### `add(payload: T)`

Creates a new record in the database with the given payload. It returns a reactive state object for the new record.

- `payload`: The data for the new record, without an `id` (which will be generated automatically). See [T](types.md#reactivetable).
- **Returns**: A reactive state object ([RowState](types.md#rowstate-r-extends-row-rec)) for the newly created record.

##### `list(filter?, limit?, direction?)`

Retrieves a list of records that match the given filter criteria. It returns a reactive state object ([RowListState](types.md#rowliststate-r-extends-row-rec)) that contains the list of records and the total count.

- `filter` (optional): An `IDBKeyRange` or a filter function to apply to the records. See [FilterFn](types.md#filterfn-t).
- `limit` (optional): The maximum number of records to return.
- `direction` (optional): The direction to traverse the cursor (`'next'`, `'prev'`, etc.).
- **Returns**: A reactive state object ([RowListState](types.md#rowliststate-r-extends-row-rec)) containing the array of records and the total count.

##### `listByIndex(name, filter?, limit?, direction?)`

Similar to [list()](#list-filter-limit-direction), but performs the search on a specified index, which can be more efficient for querying non-primary key fields.

- `name`: The name of the index to query. See [keyof R](types.md#row-t).
- `filter` (optional): An `IDBKeyRange` or a filter function to apply to the records. See [FilterFn](types.md#filterfn-t).
- `limit` (optional): The maximum number of records to return.
- `direction` (optional): The direction to traverse the cursor.
- **Returns**: A reactive state object ([RowListState](types.md#rowliststate-r-extends-row-rec)) containing the array of records and the total count.

##### `remove(id: string)`

Deletes a record from the database by its ID. It returns the reactive state of the removed record, with its status updated to `'removed'`.

- `id`: The unique identifier of the record to remove.
- **Returns**: The reactive state object ([RowState](types.md#rowstate-r-extends-row-rec)) of the removed record.

##### `seed(seeds: R[])`

Allows you to provide an array of initial data to populate the table with when it is first created and empty.

- `seeds`: An array of record objects to insert. See [R](types.md#row-t).
- **Returns**: The [ReactiveTable](types.md#reactivetable) instance for method chaining.

##### `leave(id: string)`

Manages memory by signaling that you are no longer using a specific record. It decrements an internal reference counter, and if the count reaches zero, the reactive state for that record is cleaned up.

- `id`: The unique identifier of the record to leave.

##### `promise(state: S)`

Converts a reactive state object (like one returned from [get()](#get-id-string) or [list()](#list-filter-limit-direction)) into a promise. This promise resolves when the state is no longer pending (i.e., it's ready or has errored).

- `state`: The reactive state object ([RowState](types.md#rowstate-r-extends-row-rec) or [RowListState](types.md#rowliststate-r-extends-row-rec)) to convert. See [S](types.md#reactivetable).
- **Returns**: A promise that resolves with the state object itself once it is ready.

##### `store()`

Provides access to the underlying, lower-level `IndexedTable` instance for more advanced use cases.

- **Returns**: The underlying `IndexedTable` instance.

## Table State Objects

### `RowState`

This is the reactive state object for a single record, returned by [get()](#get-id-string), [add()](#add-payload-t), and [remove()](#remove-id-string).

```typescript
interface RowState<R extends Row<Rec>> {
  data: R;
  status: 'init' | 'pending' | 'ready' | 'error' | 'removed';
  error?: Error;
}
```

- `data`: The record itself. See [R](types.md#rowstate-r-extends-row-rec).
- `status`: The current synchronization status of the record. See [RowStatus](types.md#rowstatus).
  - `init`: The state has been created but not yet synchronized.
  - `pending`: The state is currently being fetched or updated in the database.
  - `ready`: The state is successfully loaded and synchronized.
  - `error`: An error occurred.
  - `removed`: The record has been removed.
- `error` (optional): An `Error` object if the status is `'error'`.

### `RowListState`

This is the reactive state object for a list of records, returned by [list()](#list-filter-limit-direction) and [listByIndex()](#listbyindex-name-filter-limit-direction).

```typescript
interface RowListState<R extends Row<Rec>> {
  data: R[];
  count: number;
  status: 'init' | 'pending' | 'ready' | 'error' | 'removed';
  error?: Error;
}
```

- `data`: An array of the records. See [R](types.md#rowliststate-r-extends-row-rec).
- `count`: The total number of records in the database that match the query (ignoring the `limit`).
- `status`: The current synchronization status of the list. See [RowStatus](types.md#rowstatus).
- `error` (optional): An `Error` object if the status is `'error'`.
