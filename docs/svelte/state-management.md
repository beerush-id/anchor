---
title: 'State Management in Anchor for Svelte'
description: 'Learn advanced patterns for managing complex state in Svelte applications with Anchor, including global state, derived state, and persistence.'
keywords:
  - anchor for svelte
  - svelte state management
  - global state
  - derived state
  - state persistence
  - svelte state patterns
---

# State Management in Anchor for Svelte

Anchor provides powerful tools for managing state in Svelte applications, from simple local state to complex global state patterns with persistence and derived values.

## Global State Patterns

Anchor provides elegant solutions for global state management that integrate seamlessly with Svelte's reactivity.

### Simple Global State

Create global state by defining it outside of components:

```javascript
import { anchorRef } from '@anchorlib/svelte';

// Define global state outside of any component
export const globalState = anchorRef({
  user: null,
  theme: 'light',
  notifications: [],
});
```

Use it in any component, and Svelte's reactivity will handle the rest.

### Modular Global State

For larger applications, organize state into modules:

```javascript
// stores/userStore.js
import { anchorRef } from '@anchorlib/svelte';

export const userStore = anchorRef({
  currentUser: null,
  permissions: [],
  preferences: {
    language: 'en',
    timezone: 'UTC',
  },
});

// stores/uiStore.js
import { anchorRef } from '@anchorlib/svelte';

export const uiStore = anchorRef({
  sidebarOpen: true,
  modal: null,
  loading: false,
});
```

## Derived State

Anchor makes it easy to create derived state that automatically updates when dependencies change.

### Using Getters

Create computed properties using JavaScript getters for simple derivations:

```javascript
import { anchorRef } from '@anchorlib/svelte';

const todoStore = anchorRef({
  todos: [
    { id: 1, text: 'Learn Anchor', completed: true },
    { id: 2, text: 'Build an app', completed: false },
  ],

  // Computed property - automatically updates when todos change
  get completedCount() {
    return this.todos.filter((todo) => todo.completed).length;
  },

  get totalCount() {
    return this.todos.length;
  },

  get remainingCount() {
    return this.totalCount - this.completedCount;
  },
});
```

### Using derivedRef and observedRef

For more complex derived state, use the `derivedRef` or `observedRef` functions from Anchor:

```javascript
import { anchorRef, derivedRef } from '@anchorlib/svelte';

const products = anchorRef([
  { id: 1, name: 'Product 1', price: 100, category: 'electronics' },
  { id: 2, name: 'Product 2', price: 200, category: 'clothing' },
  { id: 3, name: 'Product 3', price: 150, category: 'electronics' },
]);

// Create derived state that filters and sorts products
const expensiveElectronics = derivedRef(products, (currentProducts) =>
  currentProducts
    .filter((item) => item.category === 'electronics' && item.price > 100)
    .sort((a, b) => b.price - a.price)
);
```

## State Persistence

Anchor provides built-in support for persisting state across sessions.

### Local Storage Persistence

```javascript
import { persistentRef } from '@anchorlib/svelte/storage';

// Create state that persists to localStorage
const userPreferences = persistentRef('user-preferences', {
  theme: 'light',
  language: 'en',
  notifications: true,
});

// State automatically loads from localStorage on init
// and saves to localStorage on changes
```

### Session Storage Persistence

```javascript
import { sessionRef } from '@anchorlib/svelte/storage';

// Create state that persists to sessionStorage
const sessionData = sessionRef('session-data', {
  lastRoute: '/',
  tempSettings: {},
});
```

### Custom Storage

You can also implement custom storage solutions using `kvRef`:

```javascript
import { kvRef } from '@anchorlib/svelte/storage';

// Create a key-value store
const userSettings = kvRef('user-settings', {
  volume: 0.8,
  subtitles: false,
});
```

## Asynchronous State

Handle asynchronous operations with `fetchRef`.

### HTTP Requests

```javascript
import { fetchRef } from '@anchorlib/svelte';

// Create a fetch state for API calls
const userProfile = fetchRef(
  {},
  {
    url: '/api/user/profile',
    method: 'GET',
    auto: true, // Automatically fetch on creation
  }
);
```

You can then use Svelte's `{#await}` block to handle the different states of the fetch operation (pending, success, error).
