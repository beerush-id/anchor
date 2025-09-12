# Key-Value Storage APIs

This API provides a reactive key-value store synchronized with IndexedDB.

## Core KV Store Functions

### `createKVStore()`

Creates a key-value store function ([KVFn](types.md#kvfn)) that provides reactive state management synchronized with IndexedDB.

```typescript
type createKVStore = <T extends Storable>(name: string, version?: number, dbName?: string, seeds?: KVSeed<T>[]) => KVFn;
```

- `name`: The name of the object store in IndexedDB.
- `version` (optional): The version of the database schema (default: `1`).
- `dbName` (optional): The name of the database (default: `${name}.kv`).
- `seeds` (optional): An initial set of key-value pairs to seed the database. See [KVSeed](types.md#kvseed-t).
- **Returns**: A [KVFn](types.md#kvfn) function that can create and manage reactive key-value states.

### `kv`

The default key-value store instance, created with the name `'anchor'`.

```typescript
const kv: KVFn;
```

## KV Store Interfaces

### `KVFn`

The `KVFn` is a callable function that creates and manages reactive key-value states. It also has several utility methods attached to it.

```typescript
interface KVFn {
  <T extends Storable>(key: string, init: T): KVState<T>;
  store(): IndexedKv<any>;
  leave(state: KVState<any>): void;
  remove(key: string): void;
  ready(): Promise<true>;
}
```

#### Call Signature

##### `<T extends Storable>(key: string, init: T)`

Creates a reactive state object ([KVState](types.md#kvstate-t)) for a given key, synchronized with IndexedDB. If a state for the given key already exists, it returns the existing state and increments its usage counter.

- `key`: The key for the state object.
- `init`: The initial value for the state object if it doesn't exist in the database. See [T](types.md#kvfn).
- **Returns**: A [KVState](types.md#kvstate-t) object that automatically syncs with IndexedDB.

#### Methods

##### `store()`

Returns the underlying, lower-level `IndexedKv` store instance for more advanced use cases.

- **Returns**: The `IndexedKv` instance.

##### `leave(state: KVState<any>)`

Manages memory by signaling that you are no longer using a specific reactive state. It decrements an internal reference counter, and if the count reaches zero, the state is cleaned up.

- `state`: The reactive state object to disconnect. See [KVState](types.md#kvstate-t).

##### `remove(key: string)`

Removes a key-value pair from the store and disconnects its associated reactive state.

- `key`: The key to remove.

##### `ready()`

Returns a promise that resolves when the underlying IndexedDB store is initialized, open, and all pending operations have been completed.

- **Returns**: A promise that resolves to [true](file://G:\Domains\beerush\anchor\node_modules@types\chai\index.d.ts#L181-L181) when the store is ready.

## KV Store State Objects

### `KVState`

This is the reactive state object returned when you access a key-value pair using the [KVFn](types.md#kvfn) call signature. It contains the data and metadata about the state of the item.

```typescript
interface KVState<T extends Storable> {
  data: T;
  status: 'init' | 'ready' | 'error' | 'removed';
  error?: Error;
}
```

- `data`: The actual value of the key-value pair. See [T](types.md#kvstate-t).
- `status`: The current synchronization status of the state. See [KVStatus](types.md#kvstate-t).
  - `init`: The state has been created but not yet synchronized with the database.
  - `ready`: The state is successfully loaded and synchronized.
  - `error`: An error occurred during synchronization.
  - `removed`: The key-value pair has been removed from the database.
- `error` (optional): An `Error` object containing details if the status is `'error'`.
