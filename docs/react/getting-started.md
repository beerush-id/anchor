---
title: "Getting Started with Anchor for React: A Beginner's Tutorial"
description: 'A step-by-step guide to getting started with Anchor for React. Learn to install, create reactive state, and build high-performance components with this tutorial.'
keywords:
  - anchor for react tutorial
  - react state management getting started
  - anchor react guide
  - useAnchor hook
  - anchor observer hoc
  - react reactive state
  - getting started react state
---

# Getting Started with Anchor for React: A Beginner's Tutorial

This guide will quickly get you up and running with Anchor in your React project. You'll learn how to install Anchor,
create your first reactive state, and connect it to your React components to build dynamic and performant UIs.

## Installation

To begin, install the `@anchorlib/react` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/react
```

```bash [pnpm]
pnpm add @anchorlib/react
```

```bash [Bun]
bun add @anchorlib/react
```

:::

## Basic Usage

To get started quickly, import `useAnchor` and `observer` from `@anchorlib/react`,
then wrap your component with `observer` HoC.

### Your First Reactive Component

```tsx
import { useAnchor, observer } from '@anchorlib/react';

const Counter = observer(() => {
  const [counter] = useAnchor({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
});

export default Counter;
```

::: details Try It Yourself

::: anchor-react-sandbox

```tsx /App.tsx [active]
import { useAnchor, observer } from '@anchorlib/react';

const Counter = observer(() => {
  const [counter] = useAnchor({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
});

export default Counter;
```

:::

::: tip In this example:

- **`observer` HOC:** By wrapping `Counter` with `observer()`, you tell Anchor to automatically track any reactive
  state properties accessed inside `Counter`. When those properties change, `Counter` will re-render.
- **`useAnchor` Hook:** This hook initializes your state (`{ count: 0 }`) and makes it reactive. The `state` variable
  you get back is a special state that aware of observer and subscriber.
- **Direct Mutation:** Notice `state.count++` and `state.count--`. With Anchor, you directly modify your state. There's
  no need for immutable pattern updates (like `setState(prev => ({...prev, count: prev.count + 1}))`) or dispatching
  actions.
- **Automatic UI Updates:** Because `Counter` is an `observer`, when `state.count` changes, the component automatically
  re-renders to display the new value.

:::

::: tip Why Anchor is different:

- **Direct Mutation, Safe Execution:** Unlike other state management libraries, you can directly modify your state (
  e.g., `counter.count++`) without worrying about stale closures.

- **Smart Reactivity:** Anchor only re-renders components that actually use the changed data, not your entire app. This
  means better performance without manual optimizations.

- **No Boilerplate:** Say goodbye to action creators, reducers, and complex update patterns. Just change your state
  directly and let Anchor handle the rest.

:::

## Global State

For managing global state that can be shared across multiple components, you can use Anchor's core API to create a
global reactive state object and observe it in any component that needs it.

```tsx
import { anchor } from '@anchorlib/core';
import { observer } from '@anchorlib/react';

// Create a global state that can be shared across components.
const counter = anchor({ count: 0 });

// Observe the global state in your component.
export const Counter = observer(() => {
  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
});
```

::: details Try It Yourself

::: anchor-react-sandbox

```tsx
import { anchor } from '@anchorlib/core';
import { observer } from '@anchorlib/react';

// Create a global state.
const counter = anchor({ count: 0 });

// Observe the global state in your component.
const Counter = observer(() => {
  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
});

export default Counter;
```

:::

## Computed Properties

In Anchor, you can use JavaScript's native getter syntax to create computed properties. These are reactive properties
that are automatically calculated based on other reactive state values and will update whenever their dependencies
change. This allows you to create dynamic values that are always in sync with your state without manual updates.

```tsx
import { useAnchor, observer } from '@anchorlib/react';

export const Counter = observer(() => {
  const [counter] = useAnchor({
    count: 0,
    firstName: 'John',
    lastName: 'Doe',

    // Create read-only doubled value.
    get double() {
      return this.count * 2;
    },
    // Create read-only full name.
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
  });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <h2>Doubled: {counter.double}</h2>
      <h2>Full Name: {counter.fullName}</h2>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
      <button
        onClick={() => {
          counter.firstName = 'Jane';
          counter.lastName = 'Smith';
        }}>
        Change Name
      </button>
    </div>
  );
});
```

::: tip JavaScript's Native Getter API

JavaScript's getter syntax provides a natural way to define properties that are computed on-the-fly. Rather than storing
a value directly, getters allow you to define a function that is executed whenever the property is accessed.

This aligns perfectly with how modern JavaScript developers think about data:

1. **Natural Syntax**: Getters use standard JavaScript syntax, requiring no special libraries or frameworks to
   understand.
2. **Dynamic Values**: They allow you to define values that are computed based on other properties, without needing to
   manually manage when those computations happen.
3. **Encapsulation**: Getters encapsulate the logic for computing a value within the object itself, keeping related
   functionality together.
4. **Transparent Access**: Properties defined with getters are accessed the same way as regular properties, making the
   API consistent and intuitive.
5. **Clean Separation**: Getters separate the concern of how a value is computed from how it's used, leading to more
   maintainable code.

Anchor embraces this native JavaScript feature, allowing you to use getters exactly as you would in any other JavaScript
context, while adding reactivity to make them update automatically when dependencies change.

:::

::: details Try It Yourself

::: anchor-react-sandbox

```tsx
import { useAnchor, observer } from '@anchorlib/react';

const Counter = observer(() => {
  const [counter] = useAnchor({
    count: 0,
    firstName: 'John',
    lastName: 'Doe',
    get double() {
      return this.count * 2;
    },
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
  });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <h2>Doubled: {counter.double}</h2>
      <h2>Full Name: {counter.fullName}</h2>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
      <button
        onClick={() => {
          counter.firstName = 'Jane';
          counter.lastName = 'Smith';
        }}>
        Change Name
      </button>
    </div>
  );
});

export default Counter;
```

:::

## Advanced Properties

Beyond simple computed properties, Anchor fully supports JavaScript's native getter and setter syntax for creating
advanced properties. This allows you to define properties that not only derive their value from other state properties
but also enable two-way data binding or complex transformations when the property is set. This is particularly useful
for encapsulating complex logic related to a property's value.

```tsx
import { useAnchor, observer } from '@anchorlib/react';

const Unit = observer(() => {
  const [unit] = useAnchor({
    value: 0,
    unit: 'px',

    // Get the css value string.
    get css() {
      return `${this.value}${this.unit}`;
    },

    // Change the value and unit using css value string.
    set css(newValue: string) {
      const [, v, u] = newValue.match(/^(\d+)([a-z]+)$/) || [];
      this.value = parseFloat(v ?? '0');
      this.unit = u ?? 'px';
    },
  });

  return (
    <div>
      <div>
        <strong>
          {unit.value}
          {unit.unit}
        </strong>
      </div>
      <hr />
      <input type="number" value={unit.value} onChange={(e) => (unit.value = parseFloat(e.target.value))} />
      <input type="text" value={unit.unit} onChange={(e) => (unit.unit = e.target.value)} />
      <hr />
      <button onClick={() => (unit.css = '0px')}>Reset</button>
      <button onClick={() => (unit.value += 10)}>Increment</button>
      <button onClick={() => (unit.value -= 10)}>Decrement</button>
      <button onClick={() => (unit.css = '30vw')}>Change Unit</button>
      <button onClick={() => (unit.css = '40px')}>Change Value</button>
      <button onClick={() => (unit.css = '50em')}>Change Both</button>
    </div>
  );
});
```

::: details Try It Yourself

::: anchor-react-sandbox

```tsx
import { useAnchor, observer } from '@anchorlib/react';

const Unit = observer(() => {
  const [unit] = useAnchor({
    value: 0,
    unit: 'px',

    // Get the css value string.
    get css() {
      return `${this.value}${this.unit}`;
    },

    // Change the value and unit using css value string.
    set css(newValue: string) {
      const [, v, u] = newValue.match(/^(\d+)([a-z]+)$/) || [];
      this.value = parseFloat(v ?? '0');
      this.unit = u ?? 'px';
    },
  });

  return (
    <div>
      <div>
        <strong>
          {unit.value}
          {unit.unit}
        </strong>
      </div>
      <hr />
      <input type="number" value={unit.value} onChange={(e) => (unit.value = parseFloat(e.target.value))} />
      <input type="text" value={unit.unit} onChange={(e) => (unit.unit = e.target.value)} />
      <hr />
      <button onClick={() => (unit.css = '0px')}>Reset</button>
      <button onClick={() => (unit.value += 10)}>Increment</button>
      <button onClick={() => (unit.value -= 10)}>Decrement</button>
      <button onClick={() => (unit.css = '30vw')}>Change Unit</button>
      <button onClick={() => (unit.css = '40px')}>Change Value</button>
      <button onClick={() => (unit.css = '50em')}>Change Both</button>
    </div>
  );
});

export default Unit;
```

:::

## Reactivity Principles

While **Anchor** provides a suite of **React** hooks, most of them serve as initializers. Their primary purpose is to
create reactive states and cache them, ensuring consistency and efficiency across renders. To dive deeper into the
Anchor's **Reactivity Model**, we recommend reading the [**Reactivity**](/react/reactivity) section.

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

**Anchor** introduces the **[Ref System](/react/ref-system)** to the **React ecosystem**. A **Ref** is a reactive state
that holds a reference to a
value, enabling primitives to be observed. It also allows you to pass the ref to a child component, granting them access
and control over the value without the need to pass a setter function.

This approach allows each component to control when it updates itself based on changes to the ref value, eliminating the
need for the entire
component tree to re-render.

## Basic Ref Usage

::: code-group

```jsx [UserProfile.jsx]
import { useVariable, observer } from '@anchorlib/react';
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
      age: Math.floor(Math.random() * 100),
      account: {
        email: 'jane@example.com',
        username: 'janedoe',
      },
    };
  };

  const ProfileView = observe(() => {
    const { name, age, account } = userRef.value;
    return (
      <div>
        <p>Name: {name}</p>
        <p>Age: {age}</p>
      </div>
    );
  });

  const AccountView = observe(() => {
    const { email, username } = userRef.value.account;
    return (
      <div>
        <p>Email: {email}</p>
        <p>Username: {username}</p>
      </div>
    );
  });

  return (
    <div>
      <h1>Profile</h1>
      <ProfileView />
      <UserAccount userRef={userRef} />
      <button onClick={() => userRef.value.age++}>Happy Birthday!</button>
      <button onClick={changeUser}>Reset Profile</button>
    </div>
  );
};
```

```jsx [UserAccount.jsx]
import { observer } from '@anchorlib/react';

export const UserAccount = observer(({ userRef }) => {
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
  - Crucially, `UserProfile` itself does **not** observe the `userRef`'s value in its render path. As a result, it \*
    \*never re-renders\*\* when the user data changes. It purely manages the state and orchestrates the UI.

- **The "View" (`ProfileView` and `UserAccount.jsx`):** These components represent the **View** layer.
  - `ProfileView` is wrapped in `observe`. It reads data from `userRef.value` and will only re-render when the specific
    values it uses (`name`, `age`, `email`, `username`) change.
  - `UserAccount` is wrapped in `observer()` and also accesses `userRef`. It will re-render only when the `account`
    properties it observes are modified.
  - They are responsible for presenting the data and capturing user input, but they don't own the state itself.

- **Decoupled and Efficient:**
  - By passing the `userRef` down, the "State" (`UserProfile`) provides access to the data without creating a rendering
    dependency.
  - The "View" components (`ProfileView`, `UserAccount`) subscribe to only the data they need, leading to highly
    optimized re-renders. The parent component is not involved in the update process of its children.

- **Direct State Mutation:** Notice how state is still modified directly (e.g., `userRef.value.age++`). Anchor's
  reactivity system ensures that even with direct mutation, the correct "View" components will update automatically.

:::

::: details Try It Yourself {open}

::: anchor-react-sandbox

```tsx /UserProfile.tsx [active]
import { useVariable, debugRender, setDebugRenderer, observe } from '@anchorlib/react';
import { UserAccount } from './UserAccount.tsx';
import { useRef } from 'react';

setDebugRenderer(true, 500);

export const UserProfile = () => {
  const ref = useRef(null);
  debugRender(ref);

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
      age: Math.floor(Math.random() * 100),
      account: {
        email: 'jane@example.com',
        username: 'janedoe',
      },
    };
  };

  // Only this ProvileView block is re-rendered when the observed value changes.

  const ProfileView = observe((ref) => {
    debugRender(ref);

    const { name, age, account } = userRef.value;
    return (
      <div ref={ref}>
        <p>Name: {name}</p>
        <p>Age: {age}</p>
      </div>
    );
  });

  const AccountView = observe((ref) => {
    debugRender(ref);

    const { email, username } = userRef.value.account;
    return (
      <div ref={ref}>
        <p>Email: {email}</p>
        <p>Username: {username}</p>
      </div>
    );
  });

  return (
    <div ref={ref}>
      <h1>Profile</h1>
      <ProfileView />
      <AccountView />
      <UserAccount userRef={userRef} />
      <button onClick={() => userRef.value.age++}>Happy Birthday!</button>
      <button onClick={changeUser}>Reset Profile</button>
    </div>
  );
};
```

```tsx /UserAccount.tsx
import { useRef } from 'react';
import { debugRender, observer } from '@anchorlib/react';

export const UserAccount = observer(({ userRef }) => {
  const ref = useRef(null);
  const { account } = userRef.value;
  const { email, username } = account;

  debugRender(ref);

  return (
    <div ref={ref}>
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

```tsx /App.tsx
import { UserProfile } from './UserProfile.tsx';

export default function App() {
  return <UserProfile />;
}
```

:::

::: tip Notes

Red flashes means the component is first rendered. Blue flashes means the component is re-rendered.

:::

This DSV approach allows you to build complex UIs where state management is centralized and rendering is granular and
efficient, avoiding the common pitfall of cascading re-renders in large component trees.

This covers the fundamental aspects of getting started with Anchor in your React applications. In the next sections, we
will delve deeper into more advanced features like initialization options, observation patterns, derivation, and
component integration.
