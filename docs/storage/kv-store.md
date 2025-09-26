# **KV Store**

The Key-Value (KV) Store in Anchor provides a simple key-value storage solution backed by IndexedDB. It's designed for
scenarios where you need to store simple key-value pairs with automatic persistence and synchronization.

## **Overview**

The KV Store functionality is provided through the **`createKVStore`** function. It offers an optimistic storage model where
operations are performed in-memory first and then synchronized with IndexedDB in the background.

## **API**

### **`createKVStore()` Function**

Creates a key-value store function that provides reactive state management synchronized with IndexedDB.

```typescript
type createKVStore = <T extends Storable>(
  name: string,
  version = 1,
  dbName = `${name}.kv`,
  seeds?: KVSeed<T>[]
) => KVFn;
```

**Parameters:**

- `name` - The name of the object store in IndexedDB
- `version` - The version of the database schema
- `dbName` - The name of the database
- `seeds` - An initial set of key-value pairs to seed the database

**Returns:** A KVFn function that can create and manage reactive key-value states

### **`kv` Default Store**

A default KV store instance is provided for convenience.

```typescript
kv: KVFn;
```

#### **`KVFn` Function**

Creates a reactive key-value state that is synchronized with IndexedDB.

```typescript
type KVFn = <T extends Storable>(key: string, init?: T) => KVState<T>;
```

**Parameters:**

- `key` - The unique key to identify the stored value
- `init` - The initial value to use if no existing value is found

**Returns:** A reactive state object containing the data and status

##### **`.leave()`**

Cleans up the subscription for a reactive key-value state.

```typescript
type leave = <T extends Storable>(state: KVState<T>) => void;
```

**Parameters:**

- `state` - The state object to unsubscribe

##### **`.remove()`**

Removes a key-value pair from the storage.

```typescript
type remove = (key: string) => void;
```

**Parameters:**

- `key` - The key to remove

##### **`.ready()`**

A helper to wait for the store operations to complete.

```typescript
type ready = () => Promise<true>;
```

**Returns:** A promise that resolves when all operations are completed

## **Usage Examples**

### **Basic Usage**

```typescript
import { createKVStore } from '@anchorlib/storage/db';

// Create a custom KV store for application data
const appData = createKVStore<{ name: string; age: number }>('app-data');

// Use the custom store
const user1 = appData('user1', { name: 'John', age: 30 });
const user2 = appData('user2', { name: 'Jane', age: 25 });

// Update values
user1.data.name = 'John Doe';
user2.data.age = 26;
```

### **Using the Default Store**

```typescript
import { subscribe } from '@anchorlib/core';
import { kv } from '@anchorlib/storage/db';

// Use the default KV store
const userSettings = kv('user-settings', { theme: 'light' });

// Update settings
userSettings.data.theme = 'dark';
userSettings.data.notifications = true;

// Listen for changes
const unsubscribe = subscribe(userSettings, (event) => {
  if (event.type === 'set') {
    console.log('Settings updated:', event.value);
  }
});

// Remove a key
kv.remove('user-settings');

// Clean up
unsubscribe();
```

### **Subscribing to Changes**

```typescript
import { subscribe } from '@anchorlib/core';
import { createKVStore } from '@anchorlib/storage/db';

// Create a custom KV store
const users = createKVStore<{ name: string }>('users');

// Use the store
const user1 = users('user1', { name: 'John' });

// Subscribe to all changes
const unsubscribe = subscribe(user1, (event) => {
  console.log(event); // Logs changes
});

// Perform operations
user1.data.name = 'John Doe';

// Clean up
unsubscribe();
```

## **Best Practices**

### **1. Error Handling**

Handle errors when performing KV store operations:

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const users = createKVStore<{ name: string }>('users');

// Use the store
const user1 = users('user1', { name: 'John' });

// Errors are available in the state
if (user1.status === 'error') {
  console.error('Failed to save user:', user1.error);
}
```

### **2. Waiting for Operations**

When you need to ensure operations are completed, use the **`.ready()`** method:

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const users = createKVStore<{ name: string }>('users');

// Use the store
const user1 = users('user1', { name: 'John' });
const user2 = users('user2', { name: 'Jane' });

// Update values
user1.data.name = 'John Doe';
user2.data.name = 'Jane Smith';

// Wait for all operations to complete
await users.ready();

// Now you can be sure all operations are finished
console.log('All operations completed');
```

### **3. Data Types**

The KV store supports JSON-serializable data types:

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const dataStore = createKVStore<any>('data');

// Supported types
const stringVal = dataStore('string', 'hello');
const numberVal = dataStore('number', 42);
const booleanVal = dataStore('boolean', true);
const arrayVal = dataStore('array', [1, 2, 3]);
const objectVal = dataStore('object', { a: 1, b: 'test' });
const nullVal = dataStore('null', null);
const dateVal = dataStore('date', new Date());

// Update values
stringVal.data = 'world';
numberVal.data = 100;
booleanVal.data = false;
arrayVal.data.push(4);
objectVal.data.c = 'new value';
nullVal.data = 'not null anymore';
dateVal.data = new Date();
```

### **4. Naming Conventions**

Use descriptive names for your KV stores and keys:

```typescript
// Good
const userPreferences = createKVStore('user-preferences-v1');
const theme = userPreferences('user-123-theme', 'dark');
const lang = userPreferences('user-123-lang', 'en');

// Avoid
const data = createKVStore('data');
const val = data('123', 'value');
```

### **5. Resource Management**

Clean up subscriptions to prevent memory leaks:

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const users = createKVStore<{ name: string }>('users');

// Use the store
const user = users('user1', { name: 'John' });

// When done with the state, leave it
users.leave(user);
```

### **6. Seeding Data**

Use the seeds parameter to initialize your store with default data:

```typescript
import { createKVStore } from '@anchorlib/storage/db';

const appSettings = createKVStore('app-settings', 1, 'myapp', [
  ['default-theme', 'light'],
  ['default-lang', 'en'],
  ['version', '1.0.0'],
]);

// The store will be initialized with these values
const theme = appSettings('default-theme', 'dark'); // Will use 'light' from seeds
console.log(theme.data); // 'light'
```

## **Browser Compatibility**

IndexedDB is supported in all modern browsers:

- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+
- Internet Explorer 10+ (with prefixes)

In environments where IndexedDB is not available, operations will fail gracefully with appropriate error messages.

## **Performance Considerations**

1. **Batch Operations**: The KV store is optimized for multiple operations. It's more efficient to perform several
   operations and then wait for completion than to wait after each operation.

2. **Memory Usage**: Values are stored in-memory for fast access. Be mindful of storing large objects.

3. **Asynchronous Nature**: All IndexedDB operations are asynchronous. Use the promise interface to handle completion
   properly.

4. **Optimistic Updates**: The store uses optimistic updates, meaning operations are reflected immediately in-memory
   while being processed in the background.
