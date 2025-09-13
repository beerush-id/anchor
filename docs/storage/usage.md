# **Usage**

Before getting started with Anchor's storage modules, ensure you have followed the [installation](/storage/getting-started) instructions. This guide will provide a comprehensive introduction to each storage functionality.

## **Session Storage**

SessionStorage provides browser session storage that automatically syncs with `sessionStorage` and provides reactive updates. Data persists only for the duration of the page session.

### **API**

#### **`session()`**

Creates a reactive session object that automatically syncs with sessionStorage.

```typescript
type session = <T, S>(name: string, init: T, options?: StateOptions<S>, storageClass?: typeof SessionStorage) => T;
```

**Parameters:**

- `name` - Unique identifier for the session storage instance
- `init` - Initial data to populate the session storage
- `options` - Optional anchor configuration options
- `storageClass` - Custom storage class to use (defaults to SessionStorage)

**Returns:** A reactive proxy object that syncs with sessionStorage

#### **`session.leave()`**

Disconnects a reactive session object from sessionStorage synchronization.

```typescript
type leave<T> = (state: T) => void;
```

**Parameters:**

- `state` - The reactive session object to disconnect

### **Example**

```typescript
import { session } from '@anchorlib/storage';

const userSession = session('user', { id: null, name: '' });
userSession.id = 123;
userSession.name = 'John';
// Data is automatically persisted to sessionStorage

// Disconnect from sessionStorage synchronization
session.leave(userSession);
```

## **Persistent Storage**

PersistentStorage provides storage that automatically syncs with `localStorage` for data that persists across browser sessions.

### **API**

#### **`persistent()`**

Creates a reactive persistent object that syncs with localStorage.

```typescript
type persistent = <T, S>(name: string, init: T, options?: StateOptions<S>) => T;
```

**Parameters:**

- `name` - The unique name for the persistent storage instance
- `init` - The initial data to populate the storage with
- `options` - Optional configuration options for the storage

**Returns:** A reactive object that persists data to localStorage

#### **`persistent.leave()`**

Disconnects a reactive persistent object from localStorage synchronization.

```typescript
type leave<T> = (state: T) => void;
```

**Parameters:**

- `state` - The reactive object to stop syncing with localStorage

### **Example**

```typescript
import { persistent } from '@anchorlib/storage';

const userSettings = persistent('user-settings', { theme: 'light', notifications: true });
userSettings.theme = 'dark';
// Data is automatically persisted to localStorage

// Disconnect from localStorage synchronization
persistent.leave(userSettings);
```

## **IndexedDB Storage**

IndexedDB implementations providing robust client-side storage with advanced querying capabilities.

### **IndexedKV**

A key-value store backed by IndexedDB with optimistic concurrency control.

#### **API**

##### **`createKVStore()` Function**

Creates a key-value store function that provides reactive state management synchronized with IndexedDB.

```typescript
createKVStore<T extends Storable>(
  name: string,
  version = 1,
  dbName = `${name}.kv`,
  seeds?: KVSeed<T>[]
): KVFn
```

**Parameters:**

- `name` - The name of the object store in IndexedDB
- `version` - The version of the database schema
- `dbName` - The name of the database
- `seeds` - An initial set of key-value pairs to seed the database

**Returns:** A KVFn function that can create and manage reactive key-value states

##### **KVFn Methods**

###### **`store()`**

Returns the underlying store instance.

```typescript
store<T extends Storable>(): IndexedKv<T>
```

**Returns:** The IndexedKv instance

###### **`leave()`**

Cleans up the subscription for a reactive key-value state.

```typescript
leave<T extends Storable>(state: KVState<T>): void
```

**Parameters:**

- `state` - The state object to unsubscribe

###### **`remove()`**

Removes a key-value pair from the storage.

```typescript
remove(key: string): void
```

**Parameters:**

- `key` - The key to remove

###### **`ready()`**

A helper to wait for the store operations to complete.

```typescript
ready(): Promise<true>
```

**Returns:** A promise that resolves when all operations are completed

#### **Example**

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const kvStore = createKVStore<{ name: string }>('my-kv-store');
const user = kvStore('user', { name: 'John' });
user.data.name = 'Jane';

// Wait for operations to complete
await kvStore.ready();

// Subscribe to changes
const unsubscribe = kvStore.store().subscribe((event) => {
  console.log(`KV Event: ${event.type}`, event.key, event.value);
});
```

### **IndexedTable**

Table-based IndexedDB storage with indexing support for complex queries.

#### **API**

##### **`createTable()` Function**

Creates a reactive table instance that provides state management for IndexedDB records.

```typescript
createTable<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version = 1,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName = name,
  seeds?: R[]
): ReactiveTable<T, R>
```

**Parameters:**

- `name` - The name of the IndexedDB object store
- `version` - The version of the database schema
- `indexes` - An array of index names to create in the object store
- `remIndexes` - An array of index names to remove from the object store
- `dbName` - The name of the database
- `seeds` - An array of seed data to populate the object store

**Returns:** A reactive table interface with methods for managing records

##### **ReactiveTable Methods**

###### **`get(id)`**

Gets a reactive row state by ID.

```typescript
get(id: string): RowState<R>
```

**Parameters:**

- `id` - The record ID to fetch

**Returns:** RowState containing the reactive data and status

###### **`add(payload)`**

Adds a new record to the table.

```typescript
add(payload: T): RowState<R>
```

**Parameters:**

- `payload` - The record data to create

**Returns:** RowState containing the reactive data and status

###### **`list(filter?, limit?, direction?)`**

Lists records matching the filter criteria.

```typescript
list(
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): RowListState<R>
```

**Parameters:**

- `filter` - The filter criteria (IDBKeyRange or FilterFn) (optional)
- `limit` - Maximum number of records to return (default: 25)
- `direction` - Cursor direction (optional)

**Returns:** RowListState containing the reactive data array and status

###### **`listByIndex(name, filter?, limit?, direction?)`**

Lists records by index matching the filter criteria.

```typescript
listByIndex(
  name: keyof R,
  filter?: IDBKeyRange | FilterFn<R>,
  limit?: number,
  direction?: IDBCursorDirection
): RowListState<R>
```

**Parameters:**

- `name` - The index name to search on
- `filter` - The filter criteria (IDBKeyRange or FilterFn) (optional)
- `limit` - Maximum number of records to return (default: 25)
- `direction` - Cursor direction (optional)

**Returns:** RowListState containing the reactive data array and status

###### **`remove(id)`**

Removes a record by ID.

```typescript
remove(id: string): RowState<R>
```

**Parameters:**

- `id` - The record ID to delete

**Returns:** RowState containing the reactive data and status

###### **`seed(seeds)`**

Seeds the table with initial data.

```typescript
seed<T extends R[]>(seeds: T): this
```

**Parameters:**

- `seeds` - An array of records to seed the table with

**Returns:** The current ReactiveTable instance for method chaining

###### **`leave(id)`**

Decrements the reference count for a row and cleans up if no longer used.

```typescript
leave(id: string): void
```

**Parameters:**

- `id` - The record ID to leave

###### **`promise(state)`**

Convert the state into a promise that resolves when the state is ready.

```typescript
promise<T extends RowState<R> | RowListState<R>>(state: T): Promise<T>
```

**Parameters:**

- `state` - The state to wait for completion

**Returns:** A promise that resolves when the state is completed

#### **Example**

```typescript
import { createTable } from '@anchorlib/storage/db';

type User = {
  name: string;
  email: string;
};

type UserRow = User & {
  id: string;
  created_at: Date;
  updated_at: Date;
};

const userTable = createTable<User, UserRow>('users');

// Add a record
const newUser = userTable.add({
  name: 'John Doe',
  email: 'john@example.com',
});

// Wait for the operation to complete
await userTable.promise(newUser);

// List records
const users = userTable.list(
  (user) => user.data.name.includes('John'),
  10 // limit
);

await userTable.promise(users);

// Update a record
newUser.data.name = 'John Smith';

// Remove a record
userTable.remove(newUser.data.id);
```
