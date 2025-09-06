# **Persistent Storage**

The Persistent Storage functionality is provided through the **`persistent`** function, which creates reactive objects that
automatically synchronize with `localStorage`. This allows you to work with persistent data as if it were regular
JavaScript objects while having changes automatically saved.

::: tip Two Way Binding

Anchor stores the data in `localStorage` and automatically `syncs` it with the reactive object. When the engine detect a
change made from another browser tab, the object will be updated.

:::

## **API**

### **`persistent()`**

Creates a reactive persistent object that syncs with localStorage.

```typescript
type persistent = <T, S>(name: string, init: T, options?: StateOptions<S>) => T;
```

**Parameters:**

- `name` - The unique name for the persistent storage instance
- `init` - The initial data to populate the storage with
- `options` - Optional configuration options for the storage

**Returns:** A reactive object that persists data to localStorage

#### **Naming Convention**

The `name` parameter supports versioning through a special syntax:

```typescript
// Simple name
const settings = persistent('user-settings', { theme: 'light' });

// With version
const settings = persistent('user-settings@1.0.0', { theme: 'light' });

// With version and previous version for migration
const settings = persistent('user-settings@2.0.0:1.0.0', { theme: 'light' });
```

When a previous version is specified, the storage system will automatically clean up the old version data.

### **`persistent.leave()`**

Disconnects a reactive persistent object from localStorage synchronization.

```typescript
type leave = <T>(state: T) => void;
```

**Parameters:**

- `state` - The reactive object to stop syncing with localStorage

## **Usage Examples**

### **Basic Usage**

```typescript
import { persistent } from '@anchor/storage';

// Create a persistent storage for user preferences
const userPrefs = persistent('user-preferences', {
  theme: 'light',
  language: 'en',
  notifications: true,
});

// Access and modify data as regular object properties
console.log(userPrefs.theme); // 'light'
userPrefs.theme = 'dark';
userPrefs.language = 'es';

// Changes are automatically persisted to localStorage
// No need for manual save operations
```

### **Working with Complex Data**

```typescript
import { persistent } from '@anchor/storage';

// Store complex nested objects
const userProfile = persistent('user-profile', {
  personal: {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
  },
  preferences: {
    theme: 'dark',
    fontSize: 14,
  },
  history: [],
});

// Modify nested properties
userProfile.personal.name = 'Jane Doe';
userProfile.preferences.fontSize = 16;
userProfile.history.push({ action: 'login', timestamp: new Date() });

// All changes are automatically persisted
```

### **Using with Anchor Options**

```typescript
import { persistent } from '@anchor/storage';

// Create persistent storage with Anchor options
const todos = persistent(
  'todos',
  [
    { id: 1, text: 'Learn Anchor', done: false },
    { id: 2, text: 'Build an app', done: false },
  ],
  {
    // Enable immutability
    immutable: true,
    // Disable observation if only derivation is needed
    observable: false,
  }
);

// Work with the data
todos.push({ id: 3, text: 'Profit', done: false });
```

### **Managing Storage Lifecycle**

```typescript
import { persistent } from '@anchor/storage';

// Create persistent storage
const appState = persistent('app-state', {
  currentUser: null,
  lastActivity: null,
});

// ... use the storage in your application ...

// When no longer needed, disconnect from localStorage synchronization
// This helps with memory management
persistent.leave(appState);
```

## **Best Practices**

### **1. Naming Conventions**

Use descriptive and unique names for your persistent storage instances:

```typescript
// Good
const userPreferences = persistent('user-preferences@1.0.0', {});
const appSettings = persistent('myapp-settings@2.0.0', {});

// Avoid
const data = persistent('data', {});
const store = persistent('store', {});
```

### **2. Versioning**

Use versioning to manage schema changes:

```typescript
// Version 1.0.0
const userSettings = persistent('user-settings@1.0.0', {
  theme: 'light',
});

// When you need to change the schema, increment the version
// and handle migration in your application code
const userSettings = persistent('user-settings@2.0.0:1.0.0', {
  ui: {
    theme: 'light',
  },
});
```

### **3. Data Size Considerations**

Be mindful of the amount of data you store in localStorage as browsers have storage limits:

```typescript
// Good - Store only essential data
const userPreferences = persistent('user-preferences', {
  theme: 'dark',
  language: 'en',
});

// Avoid - Don't store large datasets
const largeDataset = persistent('large-dataset', {
  // ... thousands of items ...
});
```

For large datasets, consider using IndexedDB instead.

### **4. Sensitive Data**

Never store sensitive information like passwords or tokens in localStorage:

```typescript
// Bad
const auth = persistent('auth', {
  username: 'user',
  password: 'secret123', // Never do this!
});

// Good
const userPreferences = persistent('user-preferences', {
  theme: 'dark',
  language: 'en',
});
```

### **5. Error Handling**

Handle potential storage errors gracefully:

```typescript
import { persistent } from '@anchor/storage';

try {
  const settings = persistent('app-settings', {
    theme: 'light',
  });

  // Use the settings
  document.body.className = settings.theme;
} catch (error) {
  console.error('Failed to initialize persistent storage:', error);
  // Fallback to in-memory storage or default values
}
```

### **6. Memory Management**

Disconnect from storage when components are unmounted or no longer needed:

```typescript
import { persistent } from '@anchor/storage';

class MyComponent {
  constructor() {
    this.settings = persistent('component-settings', {
      visible: true,
    });
  }

  destroy() {
    // Clean up storage connection
    persistent.leave(this.settings);
  }
}
```

## **Browser Compatibility**

Local Storage is supported in all modern browsers:

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+
- Internet Explorer 8+

In environments where localStorage is not available, the persistent storage will gracefully fall back to in-memory
storage.

## **Storage Limits**

Most browsers limit localStorage to 5-10 MB per origin. Be mindful of this limit when designing your storage strategy.
For larger datasets, consider using IndexedDB instead.
