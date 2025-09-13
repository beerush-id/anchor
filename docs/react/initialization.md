# Initialization

Initialization in **Anchor** for React is the process of creating reactive state objects that can be observed and
mutated.
Understanding how to properly initialize state is crucial for building efficient and maintainable applications with
**Anchor**.

## State Types

In **Anchor**, states are categorized into two main types based on their scope and usage pattern:

### Global State

**Global states** are declared outside component bodies, typically in separate files, and are shared across multiple
components. These states are always declared using **Anchor's Core APIs** and persist throughout the application
lifecycle.

Global states are ideal for:

- Application-wide data (user profile, settings, etc.)
- Data shared across multiple components
- Complex business logic that needs to be accessed from different parts of the application

::: details Global State {open}

```ts
// lib/app.ts
import { anchor } from '@anchor/core';

// Global state is declared outside component body.
export const appState = anchor.immutable({
  currentUser: {
    name: 'John Doe',
    age: 30,
  },
});
```

:::

::: warning Global State Recommendations

When working with global states, it's always recommended to use **`immutable`** states. This ensures that your
application remains predictable and your states remains stable.

When working with a critical data structure, it's also recommended to combine **`immutable`** with
**`schema`** to ensure the data shape remains consistent.

:::

### Local State

**Local states** are declared inside **component** bodies using React hooks and are primarily used for UI behavior logic such as toggle
states,
tab states, form inputs, etc. These states are created when a component mounts and are destroyed when it unmounts.

Local states are ideal for:

- Component-specific UI state
- Temporary data that doesn't need to persist
- Simple interactions within a component

::: details Local State {open}

```tsx
// components/UserProfile.tsx
import { useAnchor } from '@anchor/react';

export const UserProfile = () => {
  // Local state is declared inside component body.
  const [tab] = useAnchor({
    buttons: ['Tab 1', 'Tab 2', 'Tab 3'],
    current: 0,
  });
};
```

:::

## Core State APIs

These are the primary APIs for creating reactive state in your React components.

### **`useAnchor(init, options?)`**

The primary hook for creating and managing reactive state within React components. It's most suitable for objects and
complex data structures. The state object can be directly mutated, and changes will be automatically tracked.

**Params**

- **`init`** - The initial value for the state.
- **`schema`** _(optional)_ - Zod schema to validate and structure the state.
- **`options`** _(optional)_ - Configuration options for the state.

[API Reference](../apis/react/initialization.md#useanchor)

#### Usage

To use `useAnchor`, call it within your component body with an initial object value:

::: details Object State {open}

```jsx
import { useAnchor } from '@anchor/react';

const UserProfile = () => {
  const [user] = useAnchor({
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30,
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  });

  // Direct mutation - intuitive and natural
  const updateTheme = () => {
    user.preferences.theme = 'light';
  };

  const updateName = () => {
    user.name = 'Jane Doe';
  };
};
```

:::

::: details With Zod Schema {open}

```jsx
import { useAnchor } from '@anchor/react';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
  email: z.string().email(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
});

const UserProfile = () => {
  const [user] = useAnchor(
    {
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com',
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    },
    userSchema
  );

  // Schema ensures data integrity while allowing direct mutations
  const updateProfile = () => {
    user.name = 'Jane Doe';
    user.preferences.theme = 'light';
  };
};
```

:::

::: tip When to use it?
Use `useAnchor` when you need a fully reactive object state that can be directly mutated. This is the most common hook
for creating complex state objects in Anchor, especially when you need to mutate nested properties.
:::

### **`useVariable(init, deps?, constant?)`**

Creates a reactive variable with update capabilities. This hook is most suitable for primitive values like numbers,
strings, and booleans.

**Params**

- **`init`** - Initial value or initializer function.
- **`deps`** _(optional)_ - Dependencies that trigger updates.
- **`constant`** _(optional)_ - Whether to treat as constant.

[API Reference](../apis/react/initialization.md#usevariable)

#### Usage

::: details Primitive State {open}

```jsx
import { useVariable } from '@anchor/react';

const Counter = () => {
  const [count] = useVariable(0);

  // Direct mutation - simple and intuitive syntax
  const increment = () => {
    count.value++;
  };

  const decrement = () => {
    count.value--;
  };

  const reset = () => {
    count.value = 0;
  };
};
```

:::

::: details Computed Primitive {open}

```jsx
import { useVariable } from '@anchor/react';

const ProductCard = ({ user }) => {
  // The value is automatically updated when user changes, or manually assigned.
  const [userId] = useVariable(() => user.id, [user]);

  const switchUser = () => {
    userId.value = 'some-id';
  };
};
```

:::

::: tip When to use it?
Use `useVariable` when you need a simple reactive primitive value (number, string, boolean) that can be directly
mutated. It's the go-to hook for basic state values like counters, flags, or simple text values.
:::

### **`useConstant(init, deps?)`**

Creates a constant reference that never changes its value or only updates when dependencies change. This hook is perfect
for computed values that depend on props or other changing values.

**Params**

- **`init`** - The initial value or initializer function.
- **`deps`** _(optional)_ - Dependency array that determines when the constant should be recalculated.

[API Reference](../apis/react/initialization.md#useconstant)

#### Usage

::: details Computed Constant {open}

```jsx
import { useConstant } from '@anchor/react';

const UserProfile = ({ userId }) => {
  const [apiEndpoint] = useConstant(() => `/api/users/${userId}/profile`, [userId]);
};
```

:::

::: details Complex Computed Value {open}

```jsx
import { useConstant } from '@anchor/react';

const DataProcessor = ({ rawData, multiplier }) => {
  const [processedData] = useConstant(() => {
    return rawData.map((item) => ({
      ...item,
      computedValue: item.baseValue * multiplier,
    }));
  }, [rawData, multiplier]);
};
```

:::

::: tip When to use it?
Use `useConstant` when you need a stable reference to a computed value that depends on changing inputs. It's especially
useful for derived values that would otherwise need to be recomputed on every render.
:::

## Immutability APIs

These APIs provide immutability features for your state, ensuring controlled mutations.

### **`useImmutable(init, options?)`**

A React hook that creates an immutable state from a linkable object or model input. The resulting state is read-only and
requires special writers for mutations.

**Params**

- **`init`** - The initial linkable object to make immutable.
- **`schema`** _(optional)_ - Zod schema to apply to the model input.
- **`options`** _(optional)_ - Optional anchor configuration options.

[API Reference](../apis/react/initialization.md#useimmutable)

#### Usage

::: details Immutable Data {open}

```jsx
import { useImmutable, useWriter } from '@anchor/react';

const Dashboard = () => {
  const [reportData] = useImmutable({
    generatedAt: new Date(),
    metrics: {
      users: 1250,
      revenue: 35000,
      conversion: 0.08,
    },
  });

  // Use a writer to make changes.
  const writer = useWriter(reportData);

  // For mutations, use a writer
  const refreshData = (newMetrics) => {
    writer.generatedAt = new Date();
    writer.metrics = newMetrics;
  };
};
```

:::

::: tip When to use it?
Use `useImmutable` when you want to create a state that is immutable by default but still reactive. This is useful for
protecting important data from accidental mutations while still allowing controlled changes through writers.
:::

### **`useWriter(state, contracts?)`**

A React hook that creates a mutation gateway of an immutable state. This allows controlled mutations of otherwise
immutable states.

**Params**

- **`state`** - The immutable state to create a writer for.
- **`contracts`** _(optional)_ - Mutation key contracts that define allowed mutations.

[API Reference](../apis/react/initialization.md#usewriter)

#### Usage

::: details Controlled Mutations {open}

```jsx
import { useImmutable, useWriter } from '@anchor/react';

const DocumentEditor = () => {
  const [document] = useImmutable({
    title: 'My Document',
    content: 'Document content...',
    lastModified: new Date(),
  });

  // Full writer allows all mutations
  const writer = useWriter(document);

  const updateTitle = (newTitle) => {
    writer.title = newTitle;
    writer.lastModified = new Date();
  };

  // Contracted writer only allows specific mutations
  const contentWriter = useWriter(document, ['content', 'lastModified']);

  const updateContent = (newContent) => {
    contentWriter.content = newContent;
    contentWriter.lastModified = new Date();
    // writer.title = 'New Title'; // This would be restricted
  };
};
```

:::

::: tip When to use it?
Use `useWriter` when you need to mutate an immutable state. This provides a controlled way to make changes while
maintaining the immutability guarantees for the rest of your application.
:::

## Data Integrity APIs

These APIs provide schema-based validation and data integrity features for your state using Zod schemas.

### **`useModel(schema, init, options?)`**

Creates a reactive model based on the provided Zod schema and initial data. This ensures your state conforms to a
specific structure and validates data according to the schema.

**Params**

- **`schema`** - The Zod schema defining the structure and types of the model.
- **`init`** - The initial data for the model.
- **`options`** _(optional)_ - Optional configuration for the model state.

[API Reference](../apis/react/initialization.md#usemodel)

#### Usage

::: details Form Model {open}

```jsx
import { useModel } from '@anchor/react';
import { z } from 'zod';

const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

const UserForm = () => {
  const [form] = useModel(userFormSchema, {
    name: '',
    email: '',
    age: 18,
  });

  // Direct mutations with automatic validation
  const updateName = (newName) => {
    form.name = newName; // Will be validated automatically
  };

  const updateEmail = (newEmail) => {
    form.email = newEmail; // Validation errors will be caught
  };
};
```

:::

::: tip When to use it?
Use `useModel` when you need to ensure your state conforms to a specific structure with validation using Zod schemas.
This is especially useful for form data or any state that must follow a strict format with validation requirements.
:::

### **`useImmutableModel(schema, init, options?)`**

Creates an immutable reactive model based on the provided Zod schema and initial data. The resulting state is read-only
and requires special writers for mutations.

**Params**

- **`schema`** - The Zod schema defining the structure and types of the model.
- **`init`** - The initial data for the model.
- **`options`** _(optional)_ - Optional configuration for the model state.

[API Reference](../apis/react/initialization.md#useimmutablemodel)

#### Usage

::: details Immutable Model {open}

```jsx
import { useImmutableModel, useWriter } from '@anchor/react';
import { z } from 'zod';

const configSchema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.string(),
  notifications: z.boolean(),
});

const AppSettings = () => {
  const [config] = useImmutableModel(configSchema, {
    theme: 'light',
    language: 'en',
    notifications: true,
  });

  // Use a writer to make changes.
  const writer = useWriter(config);

  // Need to use a writer to make changes
  const updateTheme = () => {
    writer.theme = 'dark';
  };
};
```

:::

::: tip When to use it?
Use `useImmutableModel` when you need a strictly validated state that should be immutable by default using Zod schemas.
Changes require explicit writers, making mutations intentional and controlled.
:::

## Array APIs

These APIs provide specialized state management for array-based data.

### **`useOrderedList(init, compare, options?)`**

Creates a reactive ordered list state that automatically maintains sort order based on the provided comparison function.

**Params**

- **`init`** - The initial array state.
- **`compare`** - A comparison function that defines the sort order.
- **`options`** _(optional)_ - Optional state configuration options.

[API Reference](../apis/react/initialization.md#useorderedlist)

#### Usage

::: details Sorted List {open}

```jsx
import { useOrderedList } from '@anchor/react';

const TaskList = () => {
  const [tasks] = useOrderedList(
    [
      { id: 1, title: 'Low priority task', priority: 'low' },
      { id: 2, title: 'High priority task', priority: 'high' },
      { id: 3, title: 'Medium priority task', priority: 'medium' },
    ],
    (a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
  );

  // Tasks are automatically kept sorted by priority
  // Adding new tasks will insert them in the correct position
  const addTask = (newTask) => {
    tasks.push(newTask); // Will automatically sort into correct position
  };
};
```

:::

::: tip When to use it?
Use `useOrderedList` when you need an array that automatically maintains a specific sort order. Elements are
automatically positioned correctly when added, modified, or when the sort criteria change.
:::

## History APIs

These APIs provide undo/redo functionality for your state.

### **`useHistory(state, options?)`**

Provides history management (undo/redo) for a given reactive state. This allows users to undo and redo changes to the
state.

**Params**

- **`state`** - The reactive state to track history for.
- **`options`** _(optional)_ - History configuration options.

[API Reference](../apis/react/initialization.md#usehistory)

#### Usage

::: details Document History {open}

```jsx
import { useAnchor, useHistory } from '@anchor/react';

const DocumentEditor = () => {
  const [document] = useAnchor({
    title: 'My Document',
    content: 'Document content...',
  });

  const history = useHistory(document, {
    maxHistory: 50,
    debounce: 300,
  });

  // Make changes to document
  const updateContent = (newContent) => {
    document.content = newContent;
    // Change is automatically tracked in history
  };

  // Navigate history intuitively
  const undo = () => {
    if (history.canBackward) {
      history.backward();
    }
  };

  const redo = () => {
    if (history.canForward) {
      history.forward();
    }
  };
};
```

:::

::: tip When to use it?
Use `useHistory` when you want to provide undo/redo functionality for a state. Changes are automatically tracked, making
it easy to implement history navigation without manual intervention.
:::

## Request APIs

These APIs provide reactive data fetching and streaming functionalities.

### **`useFetch(init, options)`**

Provides reactive data fetching functionality, managing the state of an HTTP request. It handles loading states, errors,
and data updates automatically.

**Params**

- **`init`** - Initial data value.
- **`options`** - Fetch configuration options.

[API Reference](../apis/react/initialization.md#usefetch)

#### Usage

::: details Data Fetching {open}

```jsx
import { useFetch } from '@anchor/react';

const UserList = () => {
  const [users] = useFetch([], {
    url: '/api/users',
    method: 'GET',
  });

  // Access request state intuitively
  const refresh = () => {
    users.fetch(); // Trigger a new request
  };

  const cancel = () => {
    users.abort(); // Cancel ongoing request
  };
};
```

:::

::: details POST Request {open}

```jsx
import { useFetch } from '@anchor/react';

const UserCreator = () => {
  const [response] = useFetch(null, {
    url: '/api/users',
    method: 'POST',
    deferred: true, // Defer request until fetch() is called.
  });

  const createUser = (userData) => {
    response.fetch({
      body: userData,
    });
  };
};
```

:::

::: tip When to use it?
Use `useFetch` when you need to fetch data from an API and want automatic state management for loading, error, and
success states. The hook provides a reactive way to handle HTTP requests with minimal boilerplate.
:::

### **`useStream(init, options)`**

Provides reactive streaming data fetch functionality, updating incrementally as chunks are received.

**Params**

- **`init`** - Initial data value.
- **`options`** - Stream configuration options.

[API Reference](../apis/react/initialization.md#usestream)

#### Usage

::: details Streaming Data {open}

```jsx
import { useStream } from '@anchor/react';

const EventFeed = () => {
  const [events] = useStream([], {
    url: '/api/events/stream',
    method: 'GET',
    transform: (current, chunk) => [...current, ...chunk],
  });

  const disconnect = () => {
    events.abort();
  };
};
```

:::

::: tip When to use it?
Use `useStream` when you need to handle streaming data, such as server-sent events or chunked responses. The state
automatically updates as new data arrives, making real-time features simple to implement.
:::
