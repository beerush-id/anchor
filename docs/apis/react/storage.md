# Storage APIs (React)

These React hooks provide integration with browser storage mechanisms and IndexedDB, allowing you to persist state and data in various storage backends.

## Persistent Storage APIs

These APIs synchronize reactive state with the browser's `localStorage` for data that persists across browser sessions.

### `usePersistent()`

Creates a reactive state that automatically synchronizes with `localStorage`. Changes to the state are persisted to `localStorage`, and the state is initialized from `localStorage` when the component mounts.

```typescript
function usePersistent<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantState<T>;
```

- `name`: A unique key for the storage instance. You can also specify a version by appending `@x.x.x` and a version to migrate from with `@x.x.x:x.x.x`.
- `init`: The initial state, used if no data exists in local storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A constant state tuple `[value, state]` that is synced with `localStorage`.

## Session Storage APIs

These APIs synchronize reactive state with the browser's `sessionStorage` for data that persists only during a browser session.

### `useSession()`

Creates a reactive state that automatically synchronizes with `sessionStorage`. Changes to the state are persisted to `sessionStorage`, and the state is initialized from `sessionStorage` when the component mounts.

```typescript
function useSession<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantState<T>;
```

- `name`: A unique key for the storage instance. Versioning is also supported, just like `usePersistent`.
- `init`: The initial state, used if no data exists in session storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A constant state tuple `[value, state]` that is synced with `sessionStorage`.

## Key-Value Storage APIs

These APIs provide access to IndexedDB-based key-value storage with reactive state management.

### `useKv()`

Provides access to a key-value storage backed by IndexedDB with reactive state management.

```typescript
function useKv<T extends Storable>(name: string, init: T): ConstantState<KVState<T>>;
```

- `name`: A unique identifier for the storage entry.
- `init`: The initial value to store if no existing value is found.
- **Returns**: A constant state tuple `[value, state]` of the KVState type.

## Table Storage APIs

These APIs provide access to IndexedDB-based table storage with reactive state management.

### `createTableRef()`

Creates a table reference object that provides a set of methods to interact with a reactive table stored in IndexedDB.

```typescript
// Create from existing table
function createTableRef<P extends Rec, R extends Row<P> = Row<P>>(table: ReactiveTable<P, R>): TableRef<P, R>;

// Create new table
function createTableRef<P extends Rec, R extends Row<P> = Row<P>>(
  name: string,
  version: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<P, R>;
```

- `table`: Either a ReactiveTable instance or a string name to create a new table.
- `name`: The name of the table to create.
- `version`: The version number for the table (default: 1).
- `indexes` (optional): Array of keys to create indexes on.
- `remIndexes` (optional): Array of keys to remove indexes from.
- `dbName` (optional): Database name (defaults to the table name if not provided).
- **Returns**: A TableRef object with methods to interact with the table.

### `TableRef` Methods

#### `get()`

Gets a specific row from the table by its ID.

```typescript
function get(id: string): ConstantState<RowState<R>>;
```

- `id`: The ID of the row to retrieve.
- **Returns**: A constant state containing the current row state and the state object.

#### `add()`

Adds a new row to the table.

```typescript
function add(payload: P): RowState<R>;
```

- `payload`: The data to add as a new row.
- **Returns**: The row state of the newly added row.

#### `remove()`

Removes a row from the table by its ID.

```typescript
function remove(id: string): RowState<R>;
```

- `id`: The ID of the row to remove.
- **Returns**: The row state of the removed row.

#### `list()`

Gets a list of rows from the table based on filter criteria.

```typescript
function list(
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>>;
```

- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A constant state containing the current list of rows and the state object.

#### `listByIndex()`

Gets a list of rows from the table based on an index and filter criteria.

```typescript
function listByIndex(
  index: keyof R,
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>>;
```

- `index`: The name of the index to use for querying.
- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A constant state containing the current list of rows and the state object.

#### `seed()`

Seeds the table with initial data.

```typescript
function seed(seeds: R[]): TableRef<P, R>;
```

- `seeds`: Array of rows to seed the table with.
- **Returns**: The TableRef instance for method chaining.

#### `table()`

Returns the underlying ReactiveTable instance.

```typescript
function table(): ReactiveTable<P, R>;
```

- **Returns**: The underlying ReactiveTable instance.

## Table Hooks

These are specialized React hooks for working with table data and rows.

### `useTableRow()`

Custom hook to manage a specific row from a reactive table with proper cleanup handling.

```typescript
function useTableRow<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  row: RowState<R>
): RowState<R>;
```

- `table`: The reactive table instance containing the row.
- `row`: The row state to manage.
- **Returns**: The same row state passed as argument, but with proper cleanup handling.

### `useTableGet()`

Custom hook to get a specific row from a reactive table by its ID.

```typescript
function useTableGet<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  id: string
): ConstantState<RowState<R>>;
```

- `table`: The reactive table instance to get the row from.
- `id`: The ID of the row to retrieve.
- **Returns**: A constant state containing the current row state and the state object.

### `useTableList()`

Custom hook to get a list of rows from a reactive table based on filter criteria.

```typescript
function useTableList<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>>;
```

- `table`: The reactive table instance to get the list from.
- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A tuple containing the current list of rows and the state object.

### `useTableListByIndex()`

Custom hook to get a list of rows from a reactive table based on an index and filter criteria.

```typescript
function useTableListByIndex<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  index: keyof R,
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>>;
```

- `table`: The reactive table instance to get the list from.
- `index`: The name of the index to use for querying.
- `filter` (optional): Filter criteria (IDBKeyRange or custom filter function).
- `limit` (optional): Limit on the number of rows to retrieve.
- `direction` (optional): Cursor direction for sorting (e.g., 'next', 'prev').
- **Returns**: A tuple containing the current list of rows and the state object.
