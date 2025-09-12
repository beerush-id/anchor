# Getting Started with Anchor for React

This guide will quickly get you up and running with Anchor in your React project. You'll learn how to install Anchor,
create your first reactive state, and connect it to your React components to build dynamic and performant UIs.

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

## Basic Usage

To get started quickly, import `useAnchor` from `@anchor/react` and `observable` from `@anchor/react/components`, then
wrap your component with `observable` HoC.

### Your First Reactive Component

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { observable } from '@anchor/react/components';

const Counter = observable(() => {
  const [counter] = useAnchor({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
    </div>
  );
});

export default Counter;
```

::: tip In this example:

- **`observable` HOC:** By wrapping `Counter` with `observable()`, you tell Anchor to automatically track any reactive
  state properties accessed inside `Counter`. When those properties change, `Counter` will efficiently re-render.
- **`useAnchor` Hook:** This hook initializes your state (`{ count: 0 }`) and makes it reactive. The `state` variable
  you get back is a special state that aware of observer and subscriber.
- **Direct Mutation:** Notice `state.count++` and `state.count--`. With Anchor, you directly modify your state. There's
  no need for immutable updates (like `setState(prev => ({...prev, count: prev.count + 1}))`) or dispatching actions.
  Anchor handles the reactivity behind the scenes.
- **Automatic UI Updates:** Because `Counter` is `observable`, when `state.count` changes, the component automatically
  re-renders to display the new value.

:::

::: tip Why Anchor is different:

- **Direct Mutation, Safe Execution:** Unlike other state management libraries, you can directly modify your state (e.g., `counter.count++`) without worrying about breaking React's rules or causing performance issues.

- **Smart Reactivity:** Anchor only re-renders components that actually use the changed data, not your entire app. This means better performance without manual optimizations.

- **No Boilerplate:** Say goodbye to action creators, reducers, and complex update patterns. Just change your state directly and let Anchor handle the rest.

:::

## Reactivity Principles

While **Anchor** provides a suite of **React** hooks, most of them serve as initializers. Their primary purpose is to
create reactive states and cache them, ensuring consistency and efficiency across renders.

::: tip Why they don't trigger re-render?

**Anchor**'s core principle is to deliver the best possible **UX** and **DX**
([AX](/philosophy#the-ax-philosophy-all-experience) principle). If every hook were to trigger a re-render, components
would constantly re-render whenever a state changes, leading to uncontrolled and inefficient rendering. This goes
against our core principle of optimized performance.

:::

## Observation and Derivation

The primary mechanisms to trigger a re-render when a state changes are the **[Observation](/react/observation)** **HOC**
and **hooks**, or the **[Derivation](/react/derivation)** **hooks**. These tools are specifically designed to observe a
state and derive a value from it, subsequently triggering a re-render only when the observed or derived value changes.

This approach allows us to meticulously control the re-rendering process, thereby avoiding unnecessary updates. We can
selectively re-render only the necessary parts of a component, leaving static sections untouched, all without the need
to break down the UI into numerous smaller components.

## Ref System

**Anchor** introduces the **[Ref System](/react/ref-system)** to the **React ecosystem**. A **Ref** is a reactive state that holds a reference to a
value, enabling primitives to be observed. It also allows you to pass the ref to a child component, granting them access
and control over the value without the need to pass a setter function.

This approach allows each component to control when it updates itself based on changes to the ref value, eliminating the need for the entire
component tree to re-render.

## Basic Ref Usage

::: code-group

```jsx [UserProfile.jsx]
import React from 'react';
import { useVariable } from '@anchor/react';
import { observe } from '@anchor/react/components';
import { UserAccount } from './UserAccount.jsx';

export const UserProfile = () => {
  const [userRef] = useVariable({
    name: 'John Doe',
    age: 30,
    account: {
      email: 'john@example.com',
      username: 'johndoe',
    },
  });

  const changeUser = () => {
    userRef.value = {
      name: 'Jane Doe',
      age: 28,
      account: {
        email: 'jane@example.com',
        username: 'janedoe',
      },
    };
  };

  // Only this ProvileView block is re-rendered when the observed value changes.
  const ProfileView = observe(() => {
    const { name, age, account } = userRef.value;
    const { email, username } = account;

    return (
      <div>
        <h1>Profile</h1>
        <p>Name: {name}</p>
        <p>Age: {age}</p>
        <p>Email: {email}</p>
        <p>Username: {username}</p>
      </div>
    );
  });

  return (
    <div>
      <ProfileView />
      <UserAccount userRef={userRef} />
      <button onClick={() => userRef.value.age++}>Happy Birthday!</button>
      <button onClick={changeUser}>Reset Profile</button>
    </div>
  );
};
```

```jsx [UserAccount.jsx]
import { observable } from '@anchor/react/components';

export const UserAccount = observable(({ userRef }) => {
  const { account } = userRef.value;
  const { email, username } = account;

  return (
    <div>
      <label>
        <span>Email:</span>
        <input value={email} onChange={(e) => (account.email = e.target.value)} />
      </label>
      <label>
        <span>Username:</span>
        <input value={username} onChange={(e) => (account.username = e.target.value)} />
      </label>
    </div>
  );
});
```

:::

::: tip In this example (The DSV Pattern):

This example demonstrates the **Data-State-View (DSV)** pattern, a core concept in Anchor for building performant UIs.

- **The "State" (`UserProfile.jsx`):** The `UserProfile` component acts as the **State** layer.
  - It uses the `useVariable` hook to create and hold the reactive `userRef` (the **Data**).
  - Crucially, `UserProfile` itself does **not** observe the `userRef`'s value in its render path. As a result, it **never re-renders** when the user data changes. It purely manages the state and orchestrates the UI.

- **The "View" (`ProfileView` and `UserAccount.jsx`):** These components represent the **View** layer.
  - `ProfileView` is wrapped in `observe`. It reads data from `userRef.value` and will only re-render when the specific values it uses (`name`, `age`, `email`, `username`) change.
  - `UserAccount` is wrapped in `observable` and also accesses `userRef`. It will re-render only when the `account` properties it observes are modified.
  - They are responsible for presenting the data and capturing user input, but they don't own the state itself.

- **Decoupled and Efficient:**
  - By passing the `userRef` down, the "State" (`UserProfile`) provides access to the data without creating a rendering dependency.
  - The "View" components (`ProfileView`, `UserAccount`) subscribe to only the data they need, leading to highly optimized re-renders. The parent component is not involved in the update process of its children.

- **Direct State Mutation:** Notice how state is still modified directly (e.g., `userRef.value.age++`). Anchor's reactivity system ensures that even with direct mutation, the correct "View" components will update automatically.

:::

This DSV approach allows you to build complex UIs where state management is centralized and rendering is granular and efficient, avoiding the common pitfall of cascading re-renders in large component trees.

This covers the fundamental aspects of getting started with Anchor in your React applications. In the next sections, we
will delve deeper into more advanced features like initialization options, observation patterns, derivation, and
component integration.
