# Anchor - Vue

## Usage

After setting up Anchor in your Vue project, you can start using its powerful state management features. This guide
covers the main APIs and how to use them effectively.

::: tip Concepts

Anchor Vue integration is designed to follow the Vue's patters. It uses **`*Ref`** naming conventions for
each API to make it easier to understand and use.

:::

## Core APIs

Below are the core APIs available in Anchor Vue:

### **`derivedRef(state, transform?)`**

Observe a state, or creates a computed ref that automatically updates when the source state changes. It can optionally
transform the state value.

**Parameters:**

- **`state`**: The state to observe.
- **`transform?`**: A function to transform the state value. It receives the state value and returns the transformed
  value.

::: tip FYI

This API is the core bridge between Anchor's state and Vue's reactivity system. All the other APIs are built on top of
this one.

:::

::: code-group

```vue [App.vue]
<script setup>
import { derivedRef } from '@anchor/vue';
import { userProfile } from './state.ts';

// Convert Anchor's state into Vue's ref.
const profile = derivedRef(userProfile);

// Create a computed value.
const uppercaseName = derivedRef(userProfile, (value) => {
  return `${value.firstName.toUpperCase()} ${value.lastName.toUpperCase()}`;
});
</script>

<template>
  <div>
    <p>Full name: {{ profile.firstName }} {{ profile.lastName }}</p>
    <p>Uppercase: {{ uppercaseName }}</p>
    <button @click="profile.firstName = 'Jane'">Change First Name</button>
  </div>
</template>
```

```ts [state.ts]
import { anchor } from '@anchor/core';

export const userProfile = anchor({
  firstName: 'John',
  lastName: 'Doe',
});
```

:::

::: tip References

Please refers to the [Core Usage](/usage.md#apis) for detailed information about each API's parameters.

:::

### **`anchorRef(init, options?)`**

The primary function for creating reactive state in Vue components. It works similarly to Vue's `ref` but with Anchor's
enhanced reactivity system.

**Parameters:**

- **`init`**: The initial value of the state.
- **`options?`**: Optional configuration options.

::: details Example

```vue
<script setup>
import { anchorRef } from '@anchor/vue';

const state = anchorRef({
  user: {
    name: 'John Doe',
    age: 30,
  },
  isAuthenticated: false,
});

// Outside templates, you need to use the `.value`
function updateName() {
  state.value.user.name = 'Jane Doe';
}
</script>

<template>
  <div>
    <h1>{{ state.user.name }}</h1>
    <p>Age: {{ state.user.age }}</p>
    <button @click="updateName">Update Name</button>
  </div>
</template>
```

:::

### **`flatRef(init, options?)`**

Creates a reactive array that only reacts to changes in the array itself (e.g., adding or removing items), not to
changes within the items. This can improve performance with large arrays.

**Parameters:**

- `init`: The initial value for the array.
- `options`: Optional configuration object.

::: details Example

```vue
<script setup>
import { flatRef } from '@anchor/vue';

const list = flatRef([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
]);

// Only array mutations trigger reactivity
function addItem() {
  list.value.push({ id: 3, name: 'Item 3' });
}

// Changes to items themselves won't trigger reactivity
function updateItem() {
  list.value[0].name = 'Updated Item 1'; // Won't cause re-render
}
</script>
```

:::

### **`modelRef(init, schema, options?)`**

Creates a reactive state with schema validation. This is useful for ensuring your state conforms to a specific
structure.

**Parameters:**

- `init`: The initial value of the state.
- `schema`: The schema to validate the state against.
- `options?`: Additional options for the state.

::: details Example

```vue
<script setup>
import { modelRef } from '@anchor/vue';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const user = modelRef(UserSchema, {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
});

// Invalid mutations are prevented
function updateEmail() {
  user.value.email = 'invalid-email'; // This will be prevented
}
</script>
```

:::

### **`immutableRef(init, options?)`**

Creates an immutable reactive state object. It behaves like a regular reactive object, but mutations are not allowed.

**Parameters:**

- `init`: The initial value of the state object.
- `options?`: Optional configuration options.

### **`writableRef(state, contracts?)`**

Create a writable version of an immutable state, optionally with contracts.

**Parameters:**

- `state`: The immutable state object to make writable.
- `contracts?`: Optional contracts to pick which properties to make writable.

::: details Example

```vue
<script setup>
import { immutableRef, writableRef } from '@anchor/vue';

// Create an immutable state
const state = immutableRef({ count: 0 });

// This mutation will be prevented
// state.value.count++

// Create a writable version
const writableState = writableRef(state);

// This is allowed
writableState.value.count++;
</script>
```

:::

### **`propsRef(props)`**

Converts Anchor states inside a props into refs. This will allow you to use props as observable in your
component without manually create `derivedRef` for each state in the props.

**Parameters:**

- `props`: The props object to convert into reactive refs.

::: details Example

```vue
<script setup>
import { propsRef } from '@anchor/vue';

const props = defineProps({
  user: Object,
});

const { user } = propsRef(props);

// user is now a reactive ref that when accessed it will be tracked by the observer.
console.log(user.value.name); // This read will be tracked by the observer.
</script>
```

:::

### **`historyRef(state, options?)`**

Creates a reactive reference with history tracking capabilities, allowing undo/redo functionality.

**Parameters:**

- **`state`**: The state to track the history of.
- **`options`**: Optional configuration object.

::: details Example

```vue
<script setup>
import { anchorRef, historyRef } from '@anchor/vue';

const state = anchorRef({ count: 0 });

// Wrap the state with history tracking
const historyState = historyRef(state);

function increment() {
  state.value.count++;
}

function undo() {
  historyState.value.undo();
}

function redo() {
  historyState.value.redo();
}
</script>

<template>
  <div>
    <p>Count: {{ state.count }}</p>
    <button @click="increment">Increment</button>
    <button @click="undo" :disabled="!historyState.canUndo">Undo</button>
    <button @click="redo" :disabled="!historyState.canRedo">Redo</button>
  </div>
</template>
```

:::

## Storage APIs

### **`persistentRef(name, init, options?)`**

Creates a reactive reference that automatically syncs with localStorage.

::: details Example

```vue
<script setup>
import { persistentRef } from '@anchor/vue/storage';

const settings = persistentRef('app-settings', {
  theme: 'light',
  language: 'en',
});

// Changes are automatically persisted to localStorage
function toggleTheme() {
  settings.value.theme = settings.value.theme === 'light' ? 'dark' : 'light';
}
</script>
```

:::

### **`sessionRef(name, init, options?)`**

Creates a reactive reference that automatically syncs with sessionStorage.

::: details Example

```vue
<script setup>
import { sessionRef } from '@anchor/vue/storage';

const sessionData = sessionRef('session-data', {
  lastVisited: Date.now(),
});
</script>
```

:::

### **`kvRef(name, init)`**

Creates a reactive key-value store that persists data in IndexedDB.

::: details Example

```vue
<script setup>
import { kvRef } from '@anchor/vue/storage';

const preferences = kvRef('user-preferences', {
  theme: 'light',
  notifications: true,
});

function toggleTheme() {
  preferences.value.theme = preferences.value.theme === 'light' ? 'dark' : 'light';
}
</script>
```

:::

### **`createTableRef(name, version?, indexes?, dbName?, seeds?)`**

Creates a reactive table reference for working with structured data in IndexedDB.

::: tip Tips

You can pass a reactive table as the `name` in the `createTableRef` function to create a reactive reference to the
table. For example:

```ts
const table = createTable('users');
const tableRef = createTableRef(table);
```

:::

::: details Example

```vue
<script setup>
import { createTableRef } from '@anchor/vue/storage';

// Create a table for storing user data
const users = createTableRef('users', 1, ['email']);

// Add a new user
const newUser = users.add({
  name: 'John Doe',
  email: 'john@example.com',
});

// Get a user by ID
const user = users.get('user-id');

// List users with a filter
const activeUsers = users.list((user) => user.active === true);

user.value.name = 'Jane'; // Automatically saved.
</script>
```

:::

## Request APIs

### **`fetchRef(init, options)`**

Handles asynchronous data fetching with built-in loading and error states.

### **`streamRef(init, options)`**

Handles asynchronous data streaming with built-in loading and error states.

::: details Example

```vue
<script setup>
import { fetchRef, streamRef } from '@anchor/vue';

const userData = fetchRef(
  {},
  {
    url: '/api/user',
    method: 'GET',
  }
);

const message = streamRef('', {
  url: '/api/message/1',
  method: 'GET',
});

// userData.status can be 'idle', 'loading', 'success', or 'error'
// userData.data contains the fetched data
// userData.error contains any error information
</script>

<template>
  <div>
    <div v-if="userData.status === 'loading'">Loading...</div>
    <div v-else-if="userData.status === 'error'">Error: {{ userData.error }}</div>
    <div v-else-if="userData.status === 'success'">
      <h1>{{ userData.data.name }}</h1>
      <p>{{ message.data }}</p>
    </div>
  </div>
</template>
```

:::
