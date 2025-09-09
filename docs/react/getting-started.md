# Getting Started with Anchor for React

This guide will quickly get you up and running with Anchor in your React project. You'll learn how to install Anchor, create your first reactive state, and connect it to your React components to build dynamic and performant UIs.

## Installation

To begin, install the `@anchor/react` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchor/react
```

```bash [Yarn]
yarn add @anchor/react
```

```bash [pnpm]
pnpm add @anchor/react
```

```bash [Bun]
bun add @anchor/react
```

:::

**Note:** `@anchor/react` automatically includes `@anchor/core` as a dependency, so you only need to install the React package directly.

## Basic Usage: Your First Reactive Component

Anchor makes your React components reactive by combining the `useAnchor` hook (to create state) with the `observable` Higher-Order Component (HOC) (to make your component re-render when that state changes). Let's build a simple counter to see this in action.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';

// Wrap your functional component with the `observable` HOC.
// This makes the component reactive to any Anchor state accessed within it.
const Counter = observable(() => {
  // Create your reactive state using `useAnchor`.
  // It returns the reactive state object (a proxy) and a setter function.
  const [state] = useAnchor({
    count: 0,
  });

  // Directly mutate the state to update it.
  // Anchor's fine-grained reactivity will detect this change.
  const increment = () => {
    state.count++;
  };

  const decrement = () => {
    state.count--;
  };

  // Access the reactive state directly in your JSX.
  // Because the component is `observable`, it will re-render when `state.count` changes.
  return (
    <div>
      <h1>Counter: {state.count}</h1>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
});

export default Counter;
```

In this example:

- **`observable` HOC:** By wrapping `Counter` with `observable()`, you tell Anchor to automatically track any reactive state properties accessed inside `Counter`. When those properties change, `Counter` will efficiently re-render.
- **`useAnchor` Hook:** This hook initializes your state (`{ count: 0 }`) and makes it reactive. The `state` variable you get back is a special proxy that Anchor monitors.
- **Direct Mutation:** Notice `state.count++` and `state.count--`. With Anchor, you directly modify your state. There's no need for immutable updates (like `setState(prev => ({...prev, count: prev.count + 1}))`) or dispatching actions. Anchor handles the reactivity behind the scenes.
- **Automatic UI Updates:** Because `Counter` is `observable`, when `state.count` changes, the component automatically re-renders to display the new value.

## Updating the Entire State Object

While direct property mutation is common, you can also replace the entire state object using the `setState` function returned by `useAnchor`. This is useful for resetting the state or replacing it with a completely new structure.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';

const UserProfile = observable(() => {
  const [user, setUser] = useAnchor({
    name: 'John Doe',
    age: 30,
    email: 'john.doe@example.com',
  });

  const resetProfile = () => {
    // Replace the entire user state object with a new one.
    // This will trigger a re-render of the component.
    setUser({
      name: 'Jane Smith',
      age: 25,
      email: 'jane.smith@example.com',
    });
  };

  const updateAge = () => {
    // You can still directly mutate properties of the current state.
    // This will also trigger a re-render.
    user.age++;
  };

  return (
    <div>
      <h1>User Profile</h1>
      <p>Name: {user.name}</p>
      <p>Age: {user.age}</p>
      <p>Email: {user.email}</p>
      <button onClick={updateAge}>Happy Birthday!</button>
      <button onClick={resetProfile}>Reset Profile</button>
    </div>
  );
});

export default UserProfile;
```

In this example, `setUser` is used to replace the `user` state with a completely new object. Since `UserProfile` is wrapped with `observable`, any changes to the `user` state (whether by direct mutation or by `setUser`) will automatically trigger a re-render of the component.

This covers the fundamental aspects of getting started with Anchor in your React applications. In the next sections, we will delve deeper into more advanced features like initialization options, observation patterns, derivation, and component integration.
