# Storage Types

This page documents the various types used across the Storage APIs.

## DB Types

These types are used for IndexedDB operations.

### `IDBStatus`

An enum representing the status of an IndexedDB connection.

```typescript
enum IDBStatus {
  Idle = 'idle',
  Init = 'init',
  Open = 'open',
  Closed = 'closed',
}
```

### `DBEvent`

Represents a database event with a type from [IDBStatus](#idbstatus).

```typescript
type DBEvent = {
  type: IDBStatus;
};
```

### `DBSubscriber`

Function type for database event subscribers.

```typescript
type DBSubscriber = (event: DBEvent) => void;
```

### `DBUnsubscribe`

Function type that unsubscribes from database events.

```typescript
type DBUnsubscribe = () => void;
```

### `Connection`

Represents an IndexedDB connection with all its properties and methods.

```typescript
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
```

## Key-Value Types

These types are used in key-value storage operations.

### `Storable`

Type definition for values that can be stored in the key-value store.

```typescript
type Storable =
  | string
  | number
  | boolean
  | null
  | Date
  | {
      [key: string]: Storable;
    }
  | Array<Storable>;
```

### `KVSeed`

Represents a key-value pair used for seeding the database.

```typescript
type KVSeed<T> = [string, T];
```

### `KVState`

Represents the state of a key-value storage item.

```typescript
type KVState<T extends Storable> = {
  data: T;
  status: 'init' | 'ready' | 'error' | 'removed';
  error?: Error;
};
```

- `data`: The actual stored data
- `status`: The initialization status of the state
- `error` (optional): Error object if status is 'error'

### `KVEvent`

Event object for key-value storage operations.

```typescript
type KVEvent<T> = {
  type: IDBStatus | 'set' | 'delete';
  key?: string;
  value?: T;
};
```

### `KVSubscriber`

Function type for key-value storage event subscribers.

```typescript
type KVSubscriber<T> = DBSubscriber & ((event: KVEvent<T>) => void);
```

### `Operation`

Represents an operation in the key-value store.

```typescript
type Operation = {
  promise: () => Promise<void>;
};
```

## Table Types

These types are used in table storage operations.

### `Rec`

Base type for table records.

```typescript
type Rec = {
  [key: string]: Storable;
};
```

### `Row`

Represents a table row with metadata.

```typescript
type Row<T extends Rec> = T & {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};
```

### `RowList`

Represents a list of rows with a count.

```typescript
type RowList<T extends Rec> = {
  rows: Rows<T>;
  count: number;
};
```

### `FilterFn`

Function type for filtering records.

```typescript
type FilterFn<T> = (record: T) => boolean;
```

### `RowStatus`

Enum representing the status of a row.

```typescript
type RowStatus = 'init' | 'pending' | 'ready' | 'error' | 'removed';
```

### `RowRequest`

Base type for row requests with status and optional error.

```typescript
type RowRequest = {
  status: RowStatus;
  error?: Error;
};
```

### `RowState`

Represents the state of a single row.

```typescript
type RowState<R extends Row<Rec>> = RowRequest & {
  data: R;
};
```

### `RowListState`

Represents the state of a list of rows.

```typescript
type RowListState<R extends Row<Rec>> = RowRequest & {
  count: number;
  data: R[];
};
```

## Storage Types

These types are used in memory, session, and persistent storage operations.

### `StorageEvent`

Represents a storage event.

```typescript
type StorageEvent = {
  type: 'set' | 'assign' | 'delete' | 'clear';
  name: KeyLike;
  value?: unknown;
};
```

### `StorageSubscriber`

Function type for storage event subscribers.

```typescript
type StorageSubscriber = (event: StorageEvent) => void;
```

## Utility Types

These are utility types used for type inference.

### `InferRec`

Infers the record type from a ReactiveTable.

```typescript
type InferRec<T> = T extends ReactiveTable<infer R> ? R : never;
```

### `InferRow`

Infers the row type from a ReactiveTable.

```typescript
type InferRow<T> = T extends ReactiveTable<Rec, infer R> ? R : never;
```

### `InferList`

Infers the list type from a ReactiveTable.

```typescript
type InferList<T> = T extends ReactiveTable<Rec, infer R> ? R[] : never;
```
