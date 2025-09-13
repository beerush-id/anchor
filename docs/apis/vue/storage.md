# Storage APIs (Vue)

These Vue composables provide integration with browser storage mechanisms and IndexedDB, allowing you to persist state and data in various storage backends.

## Key-Value Storage APIs

These APIs provide access to IndexedDB-based key-value storage with reactive state management.

### `kvRef()`

Provides access to a key-value storage backed by IndexedDB with reactive state management.

```typescript
function kvRef<T extends Storable>(name: string, init: T): ConstantRef<KVState<T>>;
```

- `name`: A unique identifier for the storage entry.
- `init`: The initial value to store if no existing value is found.
- **Returns**: A constant ref of the KVState type. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.

## Persistent Storage APIs

These APIs synchronize reactive state with the browser's `localStorage` for data that persists across browser sessions.

### `persistentRef()`

Creates a reactive state that automatically synchronizes with `localStorage`. Changes to the state are persisted to `localStorage`, and the state is initialized from `localStorage` when the component mounts.

```typescript
function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T>;
```

- `name`: A unique key for the storage instance.
- `init`: The initial state, used if no data exists in local storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A constant ref that is synced with `localStorage`. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.

## Session Storage APIs

These APIs synchronize reactive state with the browser's `sessionStorage` for data that persists only during a browser session.

### `sessionRef()`

Creates a reactive state that automatically synchronizes with `sessionStorage`. Changes to the state are persisted to `sessionStorage`, and the state is initialized from `sessionStorage` when the component mounts.

```typescript
function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T>;
```

- `name`: A unique key for the storage instance.
- `init`: The initial state, used if no data exists in session storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A constant ref that is synced with `sessionStorage`. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.

## Table Storage APIs

These APIs provide access to IndexedDB-based table storage with reactive state management.

### `createTableRef()`

Creates a table reference object that provides a set of methods to interact with a reactive table stored in IndexedDB.

```typescript
// Create from existing table
function createTableRef<T extends ReactiveTable<Rec>>(table: T): TableRef<InferRec<T>>;

// Create new table
function createTableRef<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<T, R>;
```

- `table`: A ReactiveTable instance.
- `name`: The name of the table to create.
- `version` (optional): The version number for the table (default: 1).
- `indexes` (optional): Array of keys to create indexes on.
- `remIndexes` (optional): Array of keys to remove indexes from.
- `dbName` (optional): Database name (defaults to the table name if not provided).
- **Returns**: A TableRef object with methods to interact with the table. See [TableRef&lt;T&gt;](#tableref-t) for more information.

### `TableRef` Methods

#### `get()`

Gets a specific row from the table by its ID.

```typescript
function get(id: string): ConstantRef<RowState<R>>;
```

- `id`: The ID of the row to retrieve.
- **Returns**: A constant ref containing the current row state.

#### `add()`

Adds a new row to the table.

```typescript
function add(payload: T): ConstantRef<RowState<R>>;
```

- `payload`: The data to add as a new row.
- **Returns**: A constant ref containing the row state of the newly added row.

#### `remove()`

Removes a row from the table by its ID.

```typescript
function remove(id: string): ConstantRef<RowState<R>>;
```

- `id`: The ID of the row to remove.
- **Returns**: A constant ref containing the row state of the removed row.

#### `list()`

Gets a list of rows from the table based on filter criteria.

```typescript
function list(
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantRef<RowListState<R>>;
```

- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A constant ref containing the current list of rows.

#### `listByIndex()`

Gets a list of rows from the table based on an index and filter criteria.

```typescript
function listByIndex(
  name: keyof R,
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantRef<RowListState<R>>;
```

- `name`: The name of the index to use for querying.
- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A constant ref containing the current list of rows.

#### `seed()`

Seeds the table with initial data.

```typescript
function seed<T extends R[]>(seeds: T): this;
```

- `seeds`: Array of rows to seed the table with.
- **Returns**: The TableRef instance for method chaining.

#### `table()`

Returns the underlying ReactiveTable instance.

```typescript
function table(): ReactiveTable<T>;
```

- **Returns**: The underlying ReactiveTable instance.

## Type References

### `TableRef<T, R>`

```typescript
interface TableRef<T extends Rec, R extends Row<T> = Row<T>> {
  get(id: string): ConstantRef<RowState<R>>;
  add(payload: T): ConstantRef<RowState<R>>;
  remove(id: string): ConstantRef<RowState<R>>;
  list(
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantRef<RowListState<R>>;
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantRef<RowListState<R>>;
  seed<T extends R[]>(seeds: T): this;
  table(): ReactiveTable<T>;
}
```

An interface that provides methods to interact with a reactive table stored in IndexedDB.
