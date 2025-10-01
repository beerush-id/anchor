---
title: 'A Deep Dive into Immutability with Anchor for React'
description: 'Explore how Anchor for React revolutionizes immutability. This guide covers useImmutable, useWriter, and how to achieve high performance without complex update logic.'
keywords:
  - anchor for react
  - react immutability
  - immutable state react
  - useImmutable hook
  - useWriter hook
  - true immutability
  - react state management
  - performance react
  - write contract
---

# A Deep Dive into Immutability in Anchor for React

Immutability is a cornerstone of robust, predictable React applications. It ensures that state objects cannot be changed
once created, preventing unintended side effects and making your application easier to reason about. Anchor provides
powerful immutability features that work seamlessly with React's component model.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/immutable.webp" alt="Immutable Schema" />
</div>

## Why Anchor's Immutability Matters in React

React's rendering and reconciliation system relies on the principle of immutability to efficiently detect when state
changes occur. However, maintaining true immutability in complex applications presents several challenges:

- **Performance Overhead**: Traditional immutable patterns require creating new object instances for every state change,
  even for deeply nested structures. This leads to expensive deep cloning operations that consume memory and CPU
  resources.
- **Complex Update Logic**: Updating nested state requires careful handling of object spreads and array operations to
  maintain immutability, resulting in verbose and error-prone code.
- **Developer Experience**: The verbosity of immutable update patterns can obscure the intent of the code and make it
  harder to maintain.
- **Memory Management**: Creating new objects for every state change can lead to increased garbage collection pressure
  and memory usage.

Traditional approaches to immutability in React involve creating new objects for every change:

::: info Verbosity, Hard to Maintain

Traditional React - complex immutable updates

```tsx
setState((prev) => ({
  ...prev,
  user: {
    ...prev.user,
    profile: {
      ...prev.user.profile,
      name: 'New Name',
    },
  },
}));
```

For arrays, even more complex patterns are needed:

```tsx
setTodos((prev) => [...prev.slice(0, index), { ...prev[index], completed: true }, ...prev.slice(index + 1)]);
```

:::

Anchor addresses these challenges by providing true immutability without the performance costs:

::: tip Intuitive, Easy to Maintain

```tsx
// With Anchor - direct mutation syntax with true immutability
state.user.profile.name = 'New Name';
state.todos[1].completed = true;
```

:::

## True Immutability in Anchor for React

Anchor's approach to immutability provides the benefits of immutable state without the complexity:

- **Direct Mutation Syntax**: Write code that looks like direct mutation but maintains immutability guarantees
- **Performance**: No expensive deep cloning operations
- **Type Safety**: Strong TypeScript support prevents accidental mutations at compile time
- **Controlled Mutations**: Write contracts ensure only authorized changes occur

::: details Catch Illegal Mutation Early! {open}
<img style="border-radius: 8px" src="/images/ide-warning.webp" alt="Write Contract Violation" />
:::

::: details Developer Friendly Error! {open}
<img style="border-radius: 8px" src="/images/contract-violation.webp" alt="Write Contract Violation" />
:::

::: details Try It Yourself!

::: anchor-react-sandbox

```tsx
import { useImmutable, useWriter, observe } from '@anchorlib/react';
import { Input } from '@anchorlib/react/components';

export default function UserProfile() {
  // Attempt to mutate any property of the user object will be rejected.
  const [user] = useImmutable({
    name: 'John Doe',
    age: 42,
    settings: {
      notifications: true,
      theme: 'light',
    },
  });

  // Allow only name to be updated.
  const userWriter = useWriter(user, ['name']);
  // Allow only theme to be updated.
  const settingsWriter = useWriter(user.settings, ['theme']);

  const toggleTheme = () => {
    // Updating theme is allowed because it's declared in the contract.
    settingsWriter.theme = settingsWriter.theme === 'light' ? 'dark' : 'light';

    // Updating notifications is not allowed because it's not declared in the contract.
    // Thus, only the theme will be updated and you will see a warning about this line.
    settingsWriter.notifications = !settingsWriter.notifications;
  };

  const UserView = observe(() => (
    <div>
      <h1>{user.name}</h1>
      <p>Age: {user.age}</p>
      <p>Notifications: {user.settings.notifications ? 'enabled' : 'disabled'}</p>
      <button onClick={toggleTheme}>Toggle theme: {user.settings.theme}</button>
    </div>
  ));

  return (
    <div>
      <UserView />
      <p>Form</p>
      <div>
        <label>Update name: </label>
        <Input bind={userWriter} name="name" />
        <button onClick={() => user.age++}>Happy Birthday! (Not Allowed!)</button>
      </div>
    </div>
  );
}
```

:::

## Shared Immutable States

Global states are declared outside component bodies and shared across multiple components. These states are always
declared using **Anchor's Core APIs** and persist throughout the application lifecycle.

### Creating Global Immutable States

To create a global immutable state, use the `anchor.immutable` method from `@anchorlib/core`:

::: details Global State {open}

```ts
// lib/state.ts
import { anchor } from '@anchorlib/core';

// Create a global immutable state
export const userState = anchor.immutable({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

// Create a writer for controlled mutations
export const userWriter = anchor.writable(userState, ['name']);
export const preferenceWriter = anchor.writable(userState.preferences, ['theme']);
```

:::

### Using Global Immutable States in Components

To use global immutable states in React components, import them and access their values directly:

::: details Using Global Immutable States in Components {open}

```tsx
// components/UserProfile.tsx
import { observe } from '@anchorlib/react';
import { userState, preferenceWriter } from '../lib/state';

const UserProfile = observe(() => {
  return (
    <div>
      <h1>{userState.name}</h1>
      <p>{userState.email}</p>
      <p>Theme: {preferenceWriter.theme}</p>
      <button onClick={() => (preferenceWriter.theme = preferenceWriter.theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
    </div>
  );
});

export default UserProfile;
```

:::

::: details Try It Yourself! {open}

::: anchor-react-sandbox

```tsx /App.tsx [active]
import { observe } from '@anchorlib/react';
import { userState, userWriter, preferenceWriter } from '../lib/state';

const UserProfile = observe(() => {
  return (
    <div>
      <h1>{userState.name}</h1>
      <p>{userState.email}</p>
      <p>Theme: {preferenceWriter.theme}</p>
      <button onClick={() => (preferenceWriter.theme = preferenceWriter.theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
      <button onClick={() => (userState.name = 'Jane Doe')}>Change Name (Illegal)</button>
      <button onClick={() => (userWriter.name = 'Jane Doe')}>Change Name (Allowed)</button>
    </div>
  );
});

export default UserProfile;
```

```ts /lib/state.ts
import { anchor } from '@anchorlib/core';

// Create a global immutable state
export const userState = anchor.immutable({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

// Create a writer for controlled mutations
export const userWriter = anchor.writable(userState, ['name']);
export const preferenceWriter = anchor.writable(userState.preferences, ['theme']);
```

:::

## Local Immutable States

Local states are declared inside component bodies using React hooks and are primarily used for component-specific data.
These states are created when a component mounts and are destroyed when it unmounts.

### Creating Local Immutable States

To create a local immutable state, use the [useImmutable](../apis/react/initialization.md#useimmutable) hook:

::: details Local Immutable States {open}

```tsx
import { useImmutable } from '@anchorlib/react';

const UserProfile = () => {
  // Create a local immutable state
  const [user] = useImmutable({
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  });

  // Reading properties works normally
  console.log(user.name); // 'John Doe'

  // Direct mutations are prevented
  // user.name = 'Jane Doe'; // This will be trapped and produce an error

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
```

:::

### Using Writers with Local Immutable States

To modify local immutable states, create a writer using the [useWriter](../apis/react/initialization.md#usewriter) hook:

::: details Using Writers {open}

```tsx
import { useImmutable, useWriter } from '@anchorlib/react';

const SettingsPanel = () => {
  // Create local immutable state
  const [settings] = useImmutable({
    theme: 'dark',
    language: 'en',
    notifications: true,
  });

  // Create writer with contracts
  const writer = useWriter(settings, ['theme', 'notifications']);

  return (
    <div>
      <p>Theme: {settings.theme}</p>
      <p>Language: {settings.language}</p>
      <p>Notifications: {settings.notifications ? 'On' : 'Off'}</p>

      <button onClick={() => (writer.theme = settings.theme === 'dark' ? 'light' : 'dark')}>Toggle Theme</button>
      <button onClick={() => (writer.notifications = !settings.notifications)}>Toggle Notifications</button>
      {/* This won't work - language is not in the contract */}
      {/* <button onClick={() => writer.language = 'es'}>Change Language</button> */}
    </div>
  );
};
```

:::

## Immutable with Schema

You can also create immutable models with schema validation
using [useImmutableModel](../apis/react/initialization.md#useimmutablemodel) for local states or `anchor.immutable` with
a schema for global states:

### Global Immutable Models

::: details Global Immutable Models {open}

```ts
// lib/models.ts
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

// Create a global immutable model
export const userState = anchor.immutable(
  {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  },
  userSchema
);

// Create a writer for mutations
export const userWriter = anchor.writable(userState);
```

:::

### Local Immutable Models

::: details Local Immutable Models {open}

```tsx
import { useImmutableModel, useWriter } from '@anchorlib/react';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

const UserEditor = () => {
  const [user] = useImmutableModel(userSchema, {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  });

  // Create a writer for mutations
  const writer = useWriter(user);

  const updateName = (newName) => {
    writer.name = newName; // Valid mutation
  };

  return (
    <div>
      <p>Name: {user.name}</p>
      <input value={user.name} onChange={(e) => updateName(e.target.value)} />
    </div>
  );
};
```

:::

## Benefits of True Immutability in React

### 1. Performance

Anchor's immutability system avoids the performance penalties of deep cloning while maintaining immutability guarantees.

### 2. Developer Experience

Write code that feels natural while maintaining immutability:

```tsx
// Complex nested updates become simple with writers
const addTodo = (todosWriter, text) => {
  todosWriter.push({ id: Date.now(), text, completed: false });
};

// Array mutations work naturally
const removeTodo = (todosWriter, id) => {
  const index = todosWriter.findIndex((todo) => todo.id === id);
  if (index !== -1) {
    todosWriter.splice(index, 1);
  }
};
```

### 3. Predictability

With true immutability, you get predictable state management:

```tsx
// State changes are always explicit and controlled
const writer = useWriter(userState, ['name', 'email']);

// These are the ONLY properties that can be changed
writer.name = 'New Name'; // ✅ Allowed
writer.email = 'new@email.com'; // ✅ Allowed
// writer.id = 123;             // ❌ Not allowed - not in contract
```

## Best Practices for Immutability in React

### 1. Use Global Immutable States for Shared Data

Create global immutable states for data that should be shared across components:

```ts
// lib/appState.ts
import { anchor } from '@anchorlib/core';

// Good: Configuration data that should remain consistent
export const appConfig = anchor.immutable({
  apiUrl: process.env.REACT_APP_API_URL,
  version: '1.0.0',
  features: {
    darkMode: true,
    notifications: true,
  },
});
```

```tsx
// components/App.tsx
import { observe } from '@anchorlib/react';
import { appConfig } from '../lib/appState';

const Header = observe(() => (
  <header>
    <h1>App v{appConfig.version}</h1>
  </header>
));

const Main = observe(() => <main>{/* Content using appConfig */}</main>);

const App = () => {
  return (
    <div>
      <Header />
      <Main />
    </div>
  );
};
```

### 2. Create Specific Write Contracts

Always define specific contracts for writers:

```ts
// lib/userProfile.ts
import { anchor } from '@anchorlib/core';

// Global immutable state
export const userProfile = anchor.immutable({
  personal: { name: 'John', email: 'john@example.com' },
  preferences: { theme: 'dark', lang: 'en' },
});

// Create specific writers for different parts of the app
export const profileWriter = anchor.writable(userProfile, ['personal']);
export const preferencesWriter = anchor.writable(userProfile, ['preferences']);
```

```tsx
// components/ProfileEditor.tsx
import { observe } from '@anchorlib/react';
import { userProfile, profileWriter } from '../lib/userProfile';

const ProfileEditor = observe(() => (
  <input value={userProfile.personal.name} onChange={(e) => (profileWriter.personal.name = e.target.value)} />
));
```

```tsx
// components/Preferences.tsx
import { observe } from '@anchorlib/react';
import { userProfile, preferencesWriter } from '../lib/userProfile';

const Preferences = observe(() => (
  <select
    value={userProfile.preferences.theme}
    onChange={(e) => (preferencesWriter.preferences.theme = e.target.value)}>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
));
```

### 3. Combine with Reactivity Patterns

Use immutability with Anchor's reactivity patterns for optimal performance:

```tsx
import { useImmutable, useWriter, observe } from '@anchorlib/react';

const TodoApp = () => {
  // Local immutable state
  const [todos] = useImmutable([]);

  // Writer for mutations
  const todosWriter = useWriter(todos);

  // View that only re-renders when todos change
  const TodoList = observe(() => (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  ));

  const addTodo = (text) => {
    // Natural array mutation
    todosWriter.push({ id: Date.now(), text, completed: false });
  };

  return (
    <div>
      <TodoList />
      <button onClick={() => addTodo('New Todo')}>Add Todo</button>
    </div>
  );
};
```

## API Reference

### `anchor.immutable(init, schema?)` (Core API)

Creates an immutable reactive state from the provided initial value using Anchor's Core API.

**Parameters:**

- `init`: The initial value for the state
- `schema` _(optional)_: Zod schema to validate and structure the state

### `anchor.writable(state, contracts?)` (Core API)

Creates a writable version of an immutable state with optional contracts using Anchor's Core API.

**Parameters:**

- `state`: The immutable state to make writable
- `contracts` _(optional)_: Array of allowed mutation keys

### `useImmutable(init, options?)` (React Hook)

A React hook that creates an immutable state from a linkable object or model input. The resulting state is read-only and
requires special writers for mutations.

**Parameters:**

- `init`: The initial linkable object to make immutable.
- `schema` _(optional)_: Zod schema to apply to the model input.
- `options` _(optional)_: Optional anchor configuration options.

[API Reference](../apis/react/initialization.md#useimmutable)

### `useWriter(state, contracts?)` (React Hook)

A React hook that creates a mutation gateway of an immutable state. This allows controlled mutations of otherwise
immutable states.

**Parameters:**

- `state`: The immutable state to create a writer for.
- `contracts` _(optional)_: Mutation key contracts that define allowed mutations.

[API Reference](../apis/react/initialization.md#usewriter)

### `useImmutableModel(schema, init, options?)` (React Hook)

Creates an immutable reactive model based on the provided Zod schema and initial data. The resulting state is read-only
and requires special writers for mutations.

**Parameters:**

- `schema`: The Zod schema defining the structure and types of the model.
- `init`: The initial data for the model.
- `options` _(optional)_: Optional configuration for the model state.

[API Reference](../apis/react/initialization.md#useimmutablemodel)

## Next Steps

To learn more about immutability in Anchor for React:

- Review the [Getting Started](/react/getting-started) guide for basic usage
- Explore [Reactivity](/react/reactivity) to understand how immutable state works with observation
