# Storage APIs (Solid)

These Solid hooks provide integration with browser storage mechanisms and IndexedDB, allowing you to persist state and data in various storage backends.

## Persistent Storage APIs

These APIs synchronize reactive state with the browser's `localStorage` for data that persists across browser sessions.

### `persistentRef()`

Creates a persistent state reference that automatically cleans up when the component unmounts.

This function wraps the core `persistent` storage mechanism with Solid.js lifecycle management, ensuring that persistent state is properly cleaned up when the component using it is destroyed.

```typescript
declare function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T;
```

- `name`: A unique identifier for the persistent state.
- `init`: The initial value for the state.
- `options` (optional): Optional configuration for state behavior and schema validation.
- **Returns**: A reactive state object that persists across sessions.

## Session Storage APIs

These APIs synchronize reactive state with the browser's `sessionStorage` for data that persists only during a browser session.

### `sessionRef()`

Creates a session state reference that automatically cleans up when the component unmounts.

This function wraps the core `session` storage mechanism with Solid.js lifecycle management, ensuring that session state is properly cleaned up when the component using it is destroyed.

```typescript
declare function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T;
```

- `name`: A unique identifier for the session state.
- `init`: The initial value for the state.
- `options` (optional): Optional configuration for state behavior and schema validation.
- **Returns**: A reactive state object that persists across sessions.

## Key-Value Storage APIs

These APIs provide access to IndexedDB-based key-value storage with reactive state management.

### `kvRef()`

Creates a reactive key-value store reference with automatic cleanup.

This function initializes a key-value store and sets up automatic cleanup when the component using this store is unmounted. It's designed to work within Solid.js reactivity system.

```typescript
declare function kvRef<T extends Storable>(name: string, init: T): KVState<T>;
```

- `name`: The unique identifier for the key-value store.
- `init`: The initial value for the store.
- **Returns**: A reactive key-value store state object.

## Table Storage APIs

These APIs provide access to IndexedDB-based table storage with reactive state management.

### `createTableRef()`

Creates a TableRef from an existing ReactiveTable instance or creates a new one.

```typescript
// Create from existing table
declare function createTableRef<T extends ReactiveTable<Rec>>(table: T): TableRef<InferRec<T>>;

// Create new table
declare function createTableRef<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<T, R>;
```

- `table`: The existing ReactiveTable instance to wrap.
- `name`: The name of the table to create.
- `version` (optional): The version of the table schema (default: 1).
- `indexes` (optional): Array of property names to create indexes for.
- `remIndexes` (optional): Array of property names to remove indexes for.
- `dbName` (optional): The name of the database to use (defaults to tableName).
- **Returns**: A TableRef wrapping the provided or newly created table.

### `TableRef` Methods

#### `get()`

Get a row by its id.

```typescript
declare function get(id: string): RowState<R>;
```

- `id`: The id of the row to get.
- **Returns**: The state of the requested row.

#### `add()`

Add a new row to the table.

```typescript
declare function add(payload: T): RowState<R>;
```

- `payload`: The data to add as a new row.
- **Returns**: The state of the newly added row.

#### `remove()`

Remove a row by its id.

```typescript
declare function remove(id: string): RowState<R>;
```

- `id`: The id of the row to remove.
- **Returns**: The state of the removed row.

#### `list()`

List rows in the table with optional filtering, limiting, and ordering.

```typescript
declare function list(
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): RowListState<R>;
```

- `filter` (optional): A filter function or IDBKeyRange to filter rows.
- `limit` (optional): Maximum number of rows to return.
- `direction` (optional): Direction to iterate through the rows.
- **Returns**: The state of the row list.

#### `listByIndex()`

List rows by a specific index with optional filtering, limiting, and ordering.

```typescript
declare function listByIndex(
  name: keyof R,
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): RowListState<R>;
```

- `name`: The index name to use for listing.
- `filter` (optional): A filter function or IDBKeyRange to filter rows.
- `limit` (optional): Maximum number of rows to return.
- `direction` (optional): Direction to iterate through the rows.
- **Returns**: The state of the row list.

#### `seed()`

Seed the table with initial data.

```typescript
declare function seed<T extends R[]>(seeds: T): this;
```

- `seeds`: Array of initial row data.
- **Returns**: The table reference instance for chaining.

#### `table()`

Get the underlying reactive table instance.

```typescript
declare function table(): ReactiveTable<T>;
```

- **Returns**: The reactive table instance.
