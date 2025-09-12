# Storage APIs (Svelte)

These Svelte functions provide integration with browser storage mechanisms and IndexedDB, allowing you to persist state and data in various storage backends.

## Persistent Storage APIs

These APIs synchronize reactive state with the browser's `localStorage` for data that persists across browser sessions.

### `persistentRef()`

Creates a persistent reactive reference using the provided name, initial value, and options. The persistentRef is tied to the browser's local storage, meaning its value will persist across page reloads and browser sessions until explicitly cleared.

```typescript
function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T>;
```

- `name`: A unique string identifier for the local storage key.
- `init`: The initial value to be stored in local storage.
- `options` (optional): Optional configuration for state behavior and validation schema.
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) that provides reactive access to the stored value.

## Session Storage APIs

These APIs synchronize reactive state with the browser's `sessionStorage` for data that persists only during a browser session.

### `sessionRef()`

Creates a session-scoped reactive reference using the provided name, initial value, and options. The sessionRef is tied to the browser's session storage, meaning its value will persist across page reloads but not after the session ends (e.g., tab/window closed).

```typescript
function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T>;
```

- `name`: A unique string identifier for the session storage key.
- `init`: The initial value to be stored in session storage.
- `options` (optional): Optional configuration for state behavior and validation schema.
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) that provides reactive access to the stored value.

## Key-Value Storage APIs

These APIs provide access to IndexedDB-based key-value storage with reactive state management.

### `kvRef()`

Creates a reactive reference to a key-value store state.

This function initializes a key-value store with the given name and initial value, and automatically cleans up the store subscription when the component is destroyed.

```typescript
function kvRef<T extends Storable>(name: string, init: T): ConstantRef<KVState<T>>;
```

- `name`: The unique identifier for the key-value store
- `init`: The initial value for the store
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [KVState](#kvstate)

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

- `table`: Either a ReactiveTable instance
- `name`: The name of the table to create.
- `version` (optional): The version number for the table (default: 1).
- `indexes` (optional): Array of keys to create indexes on.
- `remIndexes` (optional): Array of keys to remove indexes from.
- `dbName` (optional): Database name (defaults to the table name if not provided).
- **Returns**: A [TableRef](#tableref) object with methods to interact with the table.

### `TableRef` Methods

#### `get()`

Gets a specific row from the table by its ID.

```typescript
function get(id: string): ConstantRef<RowState<R>>;
```

- `id`: The ID of the row to retrieve.
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [RowState](#rowstate)

#### `add()`

Adds a new row to the table.

```typescript
function add(payload: T): ConstantRef<RowState<R>>;
```

- `payload`: The data to add as a new row.
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [RowState](#rowstate)

#### `remove()`

Removes a row from the table by its ID.

```typescript
function remove(id: string): ConstantRef<RowState<R>>;
```

- `id`: The ID of the row to remove.
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [RowState](#rowstate)

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
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [RowListState](#rowliststate)

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
- **Returns**: A [ConstantRef](/apis/svelte/initialization.html#constantref-t) containing the [RowListState](#rowliststate)

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

### `KVState`

Represents the state of a key-value store.

### `RowState`

Represents the state of a single row in a table.

### `RowListState`

Represents the state of a list of rows in a table.

### `TableRef`

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

Interface that provides methods to interact with a reactive table.
