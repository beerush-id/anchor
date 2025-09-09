# Initializing Your Reactive State in React

Initialization is the crucial first step in using Anchor: it's how you define and set up your reactive state. In React, the primary tool for component-scoped reactive state is the `useAnchor` hook. This hook not only creates your reactive state but also seamlessly integrates with React's lifecycle, handling concerns like Fast Refresh (HMR) and Strict Mode. To ensure your React components automatically re-render when the state created by `useAnchor` changes, you'll typically wrap them with the `observable` Higher-Order Component (HOC).

The `observable` HOC plays a vital role by subscribing your React components to changes in the reactive state. When any part of the state managed by `useAnchor` within an `observable`-wrapped component changes, the HOC detects this and triggers a re-render of that component, ensuring your UI stays synchronized with your data.

## Global vs. Local State

Anchor provides flexibility in how you manage your application's state, allowing for both local (component-scoped) and global states. The choice between them depends on the scope and complexity of the data you're managing.

### Local State (Component-Scoped)

Local state is ideal for data that is only relevant to a single component or a small, isolated part of your component tree. It's initialized directly within a component using the `useAnchor` hook. When the component unmounts, its local state is typically garbage collected, making it efficient for transient or component-specific data.

**When to use Local State:**

- Form input values that don't need to be shared with other parts of the application.
- UI-specific states like toggle switches, modal visibility, or tab selections.
- Any data that is self-contained within a component and doesn't affect sibling or parent components directly.

The examples below for "Initializing Reactive Objects" and "Initializing Reactive Arrays" demonstrate the creation of local, component-scoped state using `useAnchor`.

### Global State (Application-Wide)

Global state is preferred for data that needs to be accessed and modified by multiple, potentially unrelated components across your application. To create a global reactive state that exists independently of any React component's lifecycle, you should use the core `anchor` function from `@anchor/core`. By defining your state outside of any specific React component, you create a single source of truth that can be imported and observed wherever needed. This approach simplifies data flow in complex applications and avoids prop drilling.

**When to use Global State:**

- User authentication status and user profile information.
- Application-wide settings or themes.
- Data fetched from an API that needs to be shared across many views (e.g., a list of products, a shopping cart).
- Any core business logic data that forms the backbone of your application.

#### Initializing a Global State

To create a global state, define your Anchor state using the `anchor` function from `@anchor/core` in a separate file and export it. Then, import this instance into any component that needs to interact with it. Remember to wrap components that consume this global state with `observable` to ensure they re-render when the state changes.

```tsx
// store/settings.ts
import { anchor } from '@anchor/core'; // Import the core anchor function

export const appSettings = anchor({
  theme: 'light',
  notificationsEnabled: true,
});

// components/ThemeSwitcher.tsx
import React from 'react';
import { observable } from '@anchor/react';
import { appSettings } from '../store/settings'; // Import the global state

const ThemeSwitcher = observable(() => {
  const toggleTheme = () => {
    appSettings.theme = appSettings.theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div>
      <p>Current Theme: {appSettings.theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
});

export default ThemeSwitcher;

// components/NotificationStatus.tsx
import React from 'react';
import { observable } from '@anchor/react';
import { appSettings } from '../store/settings'; // Import the global state

const NotificationStatus = observable(() => {
  const toggleNotifications = () => {
    appSettings.notificationsEnabled = !appSettings.notificationsEnabled;
  };

  return (
    <div>
      <p>Notifications: {appSettings.notificationsEnabled ? 'Enabled' : 'Disabled'}</p>
      <button onClick={toggleNotifications}>Toggle Notifications</button>
    </div>
  );
});

export default NotificationStatus;
```

In this example, `appSettings` is a global reactive state created with `anchor` from `@anchor/core`. Any component that imports `appSettings` and is wrapped with `observable` will automatically re-render when `appSettings.theme` or `appSettings.notificationsEnabled` changes.

## The `useAnchor` Hook: Your Gateway to Reactive Data (Local State)

The `useAnchor` hook is how you bring Anchor's powerful reactivity into your React components for component-scoped state. It takes an initial value for your state and optional configuration options.

When you call `useAnchor`:

- You provide an `initial value` for your state. This can be any plain JavaScript object, array, `Map`, or `Set`.
- You can also pass an optional `options` object to configure advanced behaviors of your reactive state, such as schema validation, immutability, or recursion depth.

`useAnchor` then gives you back two things:

1.  The reactive state object (a special kind of JavaScript object called a Proxy). This is the object you'll interact with directly to read and update your state.
2.  A `setter function` (like React's `useState` setter), which allows you to replace the entire state object if needed.

### Initializing Reactive Objects

This is the most common way to define your application's local state. Anchor takes your plain JavaScript object and makes all its properties reactive. Remember to wrap your component with `observable` to ensure it re-renders when the state changes.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';

const UserProfileEditor = observable(() => {
  // Initialize a reactive object state for user profile
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  const updateName = () => {
    // Directly mutate the state properties. Anchor handles the reactivity and triggers re-renders.
    user.firstName = 'Jane';
    user.lastName = 'Smith';
  };

  return (
    <div>
      <h2>User Profile</h2>
      <p>
        Name: {user.firstName} {user.lastName}
      </p>
      <p>Age: {user.age}</p>
      <button onClick={updateName}>Update Name</button>
    </div>
  );
});

export default UserProfileEditor;
```

### Initializing Reactive Arrays

Anchor makes arrays fully reactive, allowing you to use standard array methods (`push`, `pop`, `splice`, `sort`, etc.) directly. Your component, wrapped with `observable`, will automatically re-render when the array structure or its contents change.

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';

const TodoList = observable(() => {
  // Initialize a reactive array of strings for a todo list
  const [todos] = useAnchor<string[]>(['Learn Anchor', 'Build something awesome']);

  const addTodo = () => {
    todos.push('New Task ' + (todos.length + 1));
  };

  return (
    <div>
      <h2>My Todos</h2>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>{todo}</li>
        ))}
      </ul>
      <button onClick={addTodo}>Add Add Todo</button>
    </div>
  );
});

export default TodoList;
```

## Updating the Entire State Object with the Setter Function

While direct property mutation is the most common way to update Anchor state, you can also replace the entire reactive state object using the setter function returned by `useAnchor`. This is particularly useful for completely resetting the state or replacing it with a new structure.

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';

const ResettingComponent = observable(() => {
  const [data, setData] = useAnchor({
    counter: 0,
    message: 'Hello',
  });

  const resetState = () => {
    // Replace the entire state object with a new one. This will trigger a full re-render.
    setData({
      counter: 100,
      message: 'Reset!',
    });
  };

  const incrementCounter = () => {
    // You can also use a function for the setter, similar to React's useState, for derived updates.
    setData((prevData) => ({
      ...prevData,
      counter: prevData.counter + 1,
    }));
  };

  return (
    <div>
      <h2>Dynamic Data</h2>
      <p>Counter: {data.counter}</p>
      <p>Message: {data.message}</p>
      <button onClick={incrementCounter}>Increment</button>
      <button onClick={resetState}>Reset State</button>
    </div>
  );
});

export default ResettingComponent;
```

## Advanced Configuration Options

The `options` object you can pass to `useAnchor` (for local state) or `anchor` (for global state) allows you to customize the behavior of your reactive state. These options provide powerful control over aspects like validation, immutability, and how deeply Anchor tracks changes.

### Schema Validation with `schema`

You can integrate a Zod schema to validate your state. Anchor will automatically validate the state upon initialization and any subsequent mutations. If validation fails, Anchor provides mechanisms to catch and handle these errors (more on error handling in a later section).

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';
import { z } from 'zod';

const UserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
});

const UserForm = observable(() => {
  const [user] = useAnchor(
    {
      username: '',
      email: '',
    },
    { schema: UserSchema } // Apply the Zod schema here
  );

  const handleSubmit = () => {
    try {
      // You can manually parse/validate if needed, or rely on Anchor's internal validation
      UserSchema.parse(user);
      alert('User data is valid!');
    } catch (error: any) {
      alert(error.errors[0].message); // Display first validation error
    }
  };

  return (
    <div>
      <h2>User Registration</h2>
      <div>
        <label>Username:</label>
        <input
          type="text"
          placeholder="Username"
          value={user.username}
          onChange={(e) => (user.username = e.target.value)}
        />
      </div>
      <div>
        <label>Email:</label>
        <input type="email" placeholder="Email" value={user.email} onChange={(e) => (user.email = e.target.value)} />
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
});

export default UserForm;
```

### Compile-Time Immutability with `immutable`

Setting `immutable: true` will make the state read-only at the TypeScript level. This means if you try to directly modify a property of this state, TypeScript will give you a compile-time error, preventing accidental mutations. To modify such a state, you would explicitly use `anchor.writable()` from `@anchor/core`.

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';
import { anchor } from '@anchor/core'; // Import anchor from core for writable

const ConfigDisplay = observable(() => {
  const [config] = useAnchor(
    {
      theme: 'dark',
      fontSize: 16,
    },
    { immutable: true } // State is now TypeScript read-only
  );

  const increaseFontSize = () => {
    // To modify an immutable state, create a writable version
    const writableConfig = anchor.writable(config, ['fontSize']);
    writableConfig.fontSize = 18;
  };

  return (
    <div>
      <h2>Application Configuration</h2>
      <p>Theme: {config.theme}</p>
      <p>Font Size: {config.fontSize}</p>
      <button onClick={increaseFontSize}>Increase Font Size</button>
    </div>
  );
});

export default ConfigDisplay;
```

### Controlling Reactivity Depth with `recursive`

By default, Anchor makes all nested objects and arrays reactive. You can control this behavior using the `recursive` option. Setting `recursive: 'flat'` will only make the top-level properties reactive. This can be useful for performance in very large, deeply nested states where only top-level changes matter for a particular component.

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';

const NestedStateViewer = observable(() => {
  const [data] = useAnchor(
    {
      id: 1,
      details: {
        name: 'Item A',
        properties: {
          color: 'red',
          size: 'M',
        },
      },
    },
    { recursive: 'flat' } // Only top-level properties (id, details) are reactive
  );

  const updateColor = () => {
    // This change to a deeply nested property will update the underlying state,
    // but if this component only observes 'data.details.name', it won't re-render
    // because 'properties.color' is not directly reactive due to recursive: 'flat'.
    data.details.properties.color = 'blue';
    console.log('Color updated (underlying state changed):', data.details.properties.color);
  };

  const updateName = () => {
    // This change WILL trigger a re-render because 'details.name' is a direct property
    // of a top-level reactive object.
    data.details.name = 'Item B';
  };

  return (
    <div>
      <h2>Nested State Example</h2>
      <p>Item Name: {data.details.name}</p>
      <p>Item Color (from underlying state): {data.details.properties.color}</p>
      <button onClick={updateName}>Update Name</button>
      <button onClick={updateColor}>Update Color (check console)</button>
    </div>
  );
});

export default NestedStateViewer;
```

### Other Useful Options

- `cloned` (boolean): If `true` (default), Anchor creates a deep clone of your initial state. Set to `false` if you want Anchor to operate directly on your provided object (use with caution, as it means your original object will become reactive).
- `strict` (boolean): When `true`, Anchor will throw runtime errors for schema validation failures or other violations, rather than just logging them. Defaults to `false` in production.
- `ordered` (boolean) & `compare` (function): For arrays, `ordered: true` combined with a `compare` function ensures the array remains sorted after mutations, maintaining a consistent order.

## Initializing Reactive Maps and Sets (Less Common)

While plain objects and arrays are most common, Anchor also fully supports `Map` and `Set` objects, making them reactive. This can be powerful for specific use cases, such as managing unique collections or key-value pairs where keys are not strings.

### Initializing Reactive Maps

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';

const SettingsMap = observable(() => {
  // Initialize a reactive Map for user settings
  const [settings] = useAnchor<Map<string, boolean>>(
    new Map([
      ['darkMode', false],
      ['notifications', true],
    ])
  );

  const toggleDarkMode = () => {
    settings.set('darkMode', !settings.get('darkMode'));
  };

  return (
    <div>
      <h2>User Settings (Map)</h2>
      <p>Dark Mode: {settings.get('darkMode') ? 'On' : 'Off'}</p>
      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
    </div>
  );
});

export default SettingsMap;
```

### Initializing Reactive Sets

```tsx
import React from '@anchor/react';
import { useAnchor, observable } from '@anchor/react';

const TagsInput = observable(() => {
  // Initialize a reactive Set for managing unique tags
  const [tags] = useAnchor<Set<string>>(new Set(['react', 'javascript', 'state-management']));

  const addTag = () => {
    const newTag = prompt('Enter a new tag:');
    if (newTag) {
      tags.add(newTag);
    }
  };

  return (
    <div>
      <h2>My Tags (Set)</h2>
      <p>Tags: {Array.from(tags).join(', ')}</p>
      <button onClick={addTag}>Add Tag</button>
    </div>
  );
});

export default TagsInput;
```

This comprehensive guide covers the various ways to initialize and configure your reactive states using the `useAnchor` hook in React (for local state) and the `anchor` function from `@anchor/core` (for global state). In the next section, we will explore how to observe changes in your reactive states.
