# @anchor/storage

A comprehensive storage solution for modern web applications with support for multiple storage backends including IndexedDB, Session Storage, and Memory Storage.

## Features

- **Multi-backend Support**: Works with IndexedDB, Session Storage, and in-memory storage
- **Reactive Storage**: Automatic synchronization with browser storage mechanisms
- **Promise-first API**: IndexedDB operations with modern Promise-based interface
- **Real-time Updates**: Subscribe to storage changes with event system
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Schema Validation**: Integration with @anchor/core for reactive state management

## Installation

```bash
npm install @anchor/storage
```

## Table of Contents

- [API Overview](#api-overview)
- [Memory Storage](#memory-storage)
- [Session Storage](#session-storage)
- [Persistent Storage](#persistent-storage)
- [IndexedDB Storage](#indexeddb-storage)
  - [IndexedKV](#indexedkv)
  - [IndexedTable](#indexedtable)
- [Usage Examples](#usage-examples)

## API Overview

The package provides several storage mechanisms:

1. **MemoryStorage** - In-memory key-value storage with subscription support
2. **SessionStorage** - Browser session storage with reactive updates
3. **PersistentStorage** - Local storage persistence across browser sessions
4. **IndexedStore** - Base class for IndexedDB operations
5. **IndexedKv** - Key-value storage backed by IndexedDB
6. **IndexedTable** - Table-based storage with indexing support for IndexedDB

## Memory Storage

A simple in-memory storage implementation with subscription capabilities.

```typescript
import { MemoryStorage } from '@anchor/storage';

const storage = new MemoryStorage<{ name: string; age: number }>();
storage.set('name', 'John');
storage.set('age', 30);

// Subscribe to storage changes
const unsubscribe = storage.subscribe((event) => {
  console.log(`Event: ${event.type}`, event.name, event.value);
});

console.log(storage.get('name')); // 'John'
console.log(storage.length); // 2
console.log(storage.keys); // ['name', 'age']

// Clean up
unsubscribe();
```

### MemoryStorage API

#### Constructor

```typescript
new MemoryStorage<T>(init?: T)
```

#### Properties

- `length` - Number of items in storage
- `keys` - Array of all storage keys

#### Methods

- `get(key)` - Get value by key
- `set(key, value)` - Set value by key
- `delete(key)` - Delete value by key
- `assign(data)` - Merge data into storage
- `clear()` - Clear all values
- `subscribe(callback)` - Subscribe to storage events
- `json()` - Convert storage to JSON string

## Session Storage

Browser session storage that automatically syncs with `sessionStorage` and provides reactive updates.

```typescript
import { session } from '@anchor/storage';

const userSession = session('user', { id: null, name: '' });
userSession.id = 123;
userSession.name = 'John';
// Data is automatically persisted to sessionStorage
```

### Session Storage API

#### session()

Creates a reactive session object that automatically syncs with sessionStorage.

```typescript
session<T, S>(name: string, init: T, options?: AnchorOptions<S>, storageClass?: typeof SessionStorage): T
```

#### session.leave()

Disconnects a reactive session object from sessionStorage synchronization.

```typescript
session.leave<T>(state: T): void
```

## Persistent Storage

Persistent storage that automatically syncs with `localStorage` for data that persists across browser sessions.

```typescript
import { persistent } from '@anchor/storage';

const userSettings = persistent('user-settings', { theme: 'light', notifications: true });
userSettings.theme = 'dark';
// Data is automatically persisted to localStorage
```

### Persistent Storage API

#### persistent()

Creates a reactive persistent object that syncs with localStorage.

```typescript
persistent<T, S>(name: string, init: T, options?: AnchorOptions<S>): T
```

#### persistent.leave()

Disconnects a reactive persistent object from localStorage synchronization.

```typescript
persistent.leave<T>(state: T): void
```

## IndexedDB Storage

IndexedDB implementations providing robust client-side storage with advanced querying capabilities.

### IndexedKV

A key-value store backed by IndexedDB with optimistic concurrency control.

```typescript
import { IndexedKv } from '@anchor/storage/db';

const kvStore = new IndexedKv<{ name: string }>('my-kv-store');
kvStore.set('user', { name: 'John' });

// Wait for operations to complete
await kvStore.completed();

// Subscribe to changes
const unsubscribe = kvStore.subscribe((event) => {
  console.log(`KV Event: ${event.type}`, event.key, event.value);
});
```

#### IndexedKv API

##### Constructor

```typescript
new IndexedKv<T>(name: string, version = 1, dbName = `${name}.kv`)
```

##### Properties

- `busy` - Indicates if there are ongoing operations

##### Methods

- `get(key)` - Get value by key
- `set(key, value, onerror?)` - Set value by key
- `delete(key, onerror?)` - Delete value by key
- `completed()` - Wait for all operations to complete
- `subscribe(handler)` - Subscribe to storage events

### IndexedTable

Table-based IndexedDB storage with indexing support for complex queries.

```typescript
import { IndexedTable } from '@anchor/storage/db';

type User = {
  name: string;
  email: string;
};

type UserRow = User & {
  id: string;
  created_at: Date;
  updated_at: Date;
};

const userTable = new IndexedTable<User, UserRow>('users');

// Create a record
const user = await userTable.create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Find records
const users = await userTable.find(
  (user) => user.name.includes('John'),
  10 // limit
);

// Update a record
const updatedUser = await userTable.update(user.id, {
  name: 'John Smith',
});

// Delete a record
await userTable.delete(user.id);
```

#### IndexedTable API

##### Constructor

```typescript
new IndexedTable<T, R>(
  name: string,
  version = 1,
  indexes?: Array<keyof R>,
  remIndexes?: Array<keyof R>,
  dbName = name
)
```

##### Methods

- `find(filter?, limit?, direction?)` - Find records matching criteria
- `findByIndex(index, filter?, limit?, direction?)` - Find records by index
- `read(id)` - Read a single record by ID
- `create(payload)` - Create a new record
- `update(id, payload)` - Update an existing record
- `delete(id)` - Delete a record by ID

## Usage Examples

### Basic Memory Storage

```typescript
import { MemoryStorage } from '@anchor/storage';

const storage = new MemoryStorage();
storage.set('key', 'value');
console.log(storage.get('key')); // 'value'
```

### Reactive Session Storage

```typescript
import { session } from '@anchor/storage';

const appState = session('app', {
  user: null,
  theme: 'light',
  language: 'en',
});

// Changes automatically persisted to sessionStorage
appState.theme = 'dark';
```

### Persistent Settings

```typescript
import { persistent } from '@anchor/storage';

const settings = persistent('settings', {
  notifications: true,
  autoSave: false,
  fontSize: 14,
});

// Changes automatically persisted to localStorage
settings.notifications = false;
```

### IndexedDB Key-Value Store

```typescript
import { IndexedKv } from '@anchor/storage/db';

const cache = new IndexedKv<Record<string, any>>('cache');

// Set value
cache.set('user:123', { id: 123, name: 'John' });

// Wait for operation to complete
await cache.set('user:123', { id: 123, name: 'John' }).promise();

// Get value
const user = cache.get('user:123');
```

### IndexedDB Table with Queries

```typescript
import { IndexedTable } from '@anchor/storage/db';

type Product = {
  name: string;
  price: number;
  category: string;
};

const products = new IndexedTable<Product>('products', 1, ['category', 'price']);

// Create products
await products.create({ name: 'Laptop', price: 999, category: 'electronics' });
await products.create({ name: 'Book', price: 19, category: 'education' });

// Query by index
const electronics = await products.findByIndex('category', 'electronics');

// Query with filter function
const expensiveItems = await products.find((product) => product.price > 100, 10);
```

## License

MIT
