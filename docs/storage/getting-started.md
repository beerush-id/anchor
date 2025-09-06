# **Getting Started**

Anchor's storage module provides a comprehensive set of storage solutions for modern web applications. It offers
multiple storage backends including IndexedDB, Session Storage, and Local Storage with reactive capabilities and
automatic synchronization.

## **Overview**

The storage module offers several storage mechanisms:

1. **SessionStorage** - Browser session storage with reactive updates
2. **PersistentStorage** - Local storage persistence across browser sessions
3. **IndexedKv** - Key-value storage backed by IndexedDB
4. **IndexedTable** - Table-based storage with indexing support for IndexedDB

## **Installation**

The storage module is part of the `@anchor/storage` package:

::: code-group

```sh [Bun]
bun add @anchor/storage
```

```sh [NPM]
npm install @anchor/storage
```

```sh [Yarn]
yarn add @anchor/storage
```

```sh [PNPM]
pnpm add @anchor/storage
```

:::

## **Basic Usage**

### **Session Storage**

Browser session storage that automatically syncs with `sessionStorage` and provides reactive updates.

```typescript
import { session } from '@anchor/storage';

const userSession = session('user', { id: null, name: '' });
userSession.id = 123;
userSession.name = 'John';
// Data is automatically persisted to sessionStorage
```

### **Persistent Storage**

Persistent storage that automatically syncs with `localStorage` for data that persists across browser sessions.

```typescript
import { persistent } from '@anchor/storage';

const userSettings = persistent('user-settings', { theme: 'light', notifications: true });
userSettings.theme = 'dark';
// Data is automatically persisted to localStorage
```

### **IndexedDB Storage**

IndexedDB implementations providing robust client-side storage with advanced querying capabilities.

#### **IndexedKV**

A key-value store backed by IndexedDB with optimistic concurrency control.

```typescript
import { derive } from '@anchor/core';
import { createKVStore } from '@anchor/storage/db';

// Create a new KV store
const kvStore = createKVStore<{ name: string }>('my-kv-store');

// Use the store
const user = kvStore('user', { name: 'John' });
user.data.name = 'Jane';

// Subscribe to changes
const unsubscribe = derive(user, (event) => {
  console.log(`KV Event: ${event.type}`, event.key, event.value);
});
```

#### **IndexedTable**

Table-based IndexedDB storage with indexing support for complex queries.

```typescript
import { createTable } from '@anchor/storage/db';

type User = {
  name: string;
  email: string;
};

const userTable = createTable<User>('users');

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
