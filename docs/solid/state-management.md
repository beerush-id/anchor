---
title: 'State Management in Anchor for Solid'
description: 'Learn advanced patterns for managing complex state in Solid applications with Anchor, including global state, derived state, and persistence.'
keywords:
  - anchor for solid
  - solid state management
  - global state
  - derived state
  - state persistence
  - solid state patterns
---

# State Management in Anchor for Solid

Anchor provides powerful tools for managing state in Solid applications, from simple local state to complex global state patterns with persistence and derived values.

## Global State Patterns

Unlike React, Solid doesn't suffer from context propagation issues, but Anchor still provides elegant solutions for global state management.

### Simple Global State

Create global state by defining it outside of components:

```tsx
import { anchorRef } from '@anchorlib/solid';

// Define global state outside of any component
export const globalState = anchorRef({
  user: null,
  theme: 'light',
  notifications: [],
});

// Use in any component
const ThemeToggle = () => {
  const toggleTheme = () => {
    globalState.theme = globalState.theme === 'light' ? 'dark' : 'light';
  };

  return <button onClick={toggleTheme}>Switch to {globalState.theme === 'light' ? 'dark' : 'light'} mode</button>;
};
```

### Modular Global State

For larger applications, organize state into modules:

```tsx
// stores/userStore.ts
import { anchorRef } from '@anchorlib/solid';

export const userStore = anchorRef({
  currentUser: null,
  permissions: [],
  preferences: {
    language: 'en',
    timezone: 'UTC',
  },
});

// stores/uiStore.ts
import { anchorRef } from '@anchorlib/solid';

export const uiStore = anchorRef({
  sidebarOpen: true,
  modal: null,
  loading: false,
});
```

## Derived State

Anchor makes it easy to create derived state that automatically updates when dependencies change.

### Using Getters

Create computed properties using JavaScript getters:

```tsx
import { anchorRef } from '@anchorlib/solid';

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

const TodoStats = () => {
  return (
    <div>
      <p>Total: {todoStore.totalCount}</p>
      <p>Completed: {todoStore.completedCount}</p>
      <p>Remaining: {todoStore.remainingCount}</p>
    </div>
  );
};
```

### Using observedRef

For more complex derived state, use the [observedRef](/solid/api/observedref) function:

```tsx
import { anchorRef, observedRef } from '@anchorlib/solid';

const products = anchorRef([
  { id: 1, name: 'Product 1', price: 100, category: 'electronics' },
  { id: 2, name: 'Product 2', price: 200, category: 'clothing' },
  { id: 3, name: 'Product 3', price: 150, category: 'electronics' },
]);

// Create derived state that filters and sorts products
const expensiveElectronics = observedRef(() =>
  products.filter((item) => item.category === 'electronics' && item.price > 100).sort((a, b) => b.price - a.price)
);
```

## State Persistence

Anchor provides built-in support for persisting state across sessions.

### Local Storage Persistence

```tsx
import { persistentRef } from '@anchorlib/solid/storage';

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

```tsx
import { sessionRef } from '@anchorlib/solid/storage';

// Create state that persists to sessionStorage
const sessionData = sessionRef('session-data', {
  lastRoute: '/',
  tempSettings: {},
});
```

### Custom Storage

You can also implement custom storage solutions:

```tsx
import { kvRef } from '@anchorlib/solid/storage';

// Create a key-value store
const userSettings = kvRef('user-settings', {
  volume: 0.8,
  subtitles: false,
});

// Use anywhere in your app
const VolumeControl = () => {
  return (
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={userSettings.volume}
      onInput={(e) => (userSettings.volume = parseFloat(e.target.value))}
    />
  );
};
```

## Asynchronous State

Handle asynchronous operations with fetchRef and streamRef.

### HTTP Requests

```tsx
import { fetchRef } from '@anchorlib/solid';

// Create a fetch state for API calls
const userProfile = fetchRef(
  {},
  {
    url: '/api/user/profile',
    method: 'GET',
    auto: true, // Automatically fetch on creation
  }
);

const UserProfile = () => {
  if (userProfile.status === 'pending') return <div>Loading...</div>;
  if (userProfile.error) return <div>Error: {userProfile.error.message}</div>;

  return (
    <div>
      <h1>{userProfile.data.name}</h1>
      <p>{userProfile.data.email}</p>
    </div>
  );
};
```
