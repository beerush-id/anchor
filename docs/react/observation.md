# Observation in Anchor for React

Observation is a core concept in **Anchor**, enabling your React components to automatically react to changes in your
application's state. **Anchor**'s fine-grained reactivity system ensures that only components or parts of components
that depend on specific pieces of data re-render when that data changes, leading to highly optimized performance.

## How Observation Works

When you access a property of an **Anchor** reactive state within a component or a reactive computation, **Anchor**
automatically tracks that dependency. If the value of that property later changes, **Anchor** intelligently identifies
all components that observed it and triggers a re-render for only those components, avoiding unnecessary updates to the
rest of your application.

## Higher-Order Components (HOCs)

These are Higher-Order Components that make React components reactive to **Anchor**'s state changes.

### **`observe(factory, displayName?)`**

A higher-order component (HOC) that creates a React component which automatically re-renders when any observable state
accessed within the provided `factory` callback changes. It uses an internal `StateObserver` to track dependencies and
trigger updates.

::: tip Recommended!

This is the most recommended way to observe state changes in **Anchor** because it provides fine-grained reactivity -
only the observed part re-renders, not the entire component where it's declared.

:::

**Params**

- **`factory`** - A function that receives a `Ref` object and returns a `ReactNode`. The `Ref` object can be used to
  access the component's instance.
- **`displayName`** _(optional)_ - A name for the component, useful for debugging.

[API Reference](../apis/react/observation.md#observe)

#### Usage

::: details Basic Observation Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observe } from '@anchorlib/react/components';

const CounterManager = () => {
  const [count] = useAnchor({ value: 0 });

  // Create an observed component that re-renders when count.value changes
  const CountDisplay = observe(() => (
    <div>
      <h1>Count: {count.value}</h1>
      <p>This component only re-renders when count.value changes</p>
    </div>
  ));

  const increment = () => {
    count.value++;
  };

  const decrement = () => {
    count.value--;
  };

  return (
    <div>
      <CountDisplay />
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
};
```

:::

::: details Using the Ref Parameter

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observe } from '@anchorlib/react/components';

const Timer = () => {
  const [timer] = useAnchor({ seconds: 0 });

  // The factory function receives a ref parameter
  const TimerDisplay = observe((ref) => {
    // Store data on the ref for later use
    if (!ref.current) {
      ref.current = {
        renderCount: 0,
      };
    }

    ref.current.renderCount++;

    return (
      <div>
        <h1>Timer: {timer.seconds}s</h1>
        <p>Renders: {ref.current.renderCount}</p>
      </div>
    );
  }, 'TimerDisplay');

  React.useEffect(() => {
    const interval = setInterval(() => {
      timer.seconds++;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <TimerDisplay />;
};
```

:::

::: tip When to use it?

Use `observe` when you want to create a reactive render function directly, often for inline rendering or when you don't
need a separate component definition. It's particularly useful when you need to create components that are tightly
coupled with their parent's state logic.

This is the most recommended approach for observing state changes because it provides fine-grained reactivity - only the
observed part re-renders, not the entire component where it's declared.

:::

::: warning Caveat

When using the **`observe()`** API you are not creating a component. Thus, you cannot use React hooks such as `useEffect()`
inside it. This API is designed to be an intuitive way to render a template and re-render when the required state
changes. Its main purpose is to be used as a **`View`**.

:::

### **`observable(Component, displayName?)`**

A Higher-Order Component (HOC) that wraps a React component to make it reactive to changes in observable state. It
automatically sets up and manages a `StateObserver` instance for the wrapped component.

**Params**

- **`Component`** - The React component to be made observable. It should accept its original props `T` plus an internal
  `_state_version` prop.
- **`displayName`** _(optional)_ - A name for the wrapped component, useful for debugging.

[API Reference](../apis/react/observation.md#observable)

#### Usage

::: details Wrapping an Existing Component {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observable } from '@anchorlib/react/components';

// A regular React component
const UserCard = ({ user }) => {
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Age: {user.profile.age}</p>
    </div>
  );
};

// Make it observable
const ObservableUserCard = observable(UserCard);

const UserManager = () => {
  const [user] = useAnchor({
    name: 'John Doe',
    email: 'john@example.com',
    profile: {
      age: 30,
    },
  });

  const updateAge = () => {
    user.profile.age++;
  };

  return (
    <div>
      {/* This component will re-render when user.profile.age changes */}
      <ObservableUserCard user={user} />
      <button onClick={updateAge}>Increment Age</button>
    </div>
  );
};
```

:::

::: details With Custom Display Name {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observable } from '@anchorlib/react/components';

const TodoItem = ({ todo }) => {
  return (
    <div>
      <input type="checkbox" checked={todo.completed} readOnly />
      <span>{todo.text}</span>
    </div>
  );
};

// Wrap with a custom display name for debugging
const ObservableTodoItem = observable(TodoItem, 'ObservableTodoItem');

const TodoList = () => {
  const [todos] = useAnchor([
    { id: 1, text: 'Learn Anchor', completed: false },
    { id: 2, text: 'Build an app', completed: true },
  ]);

  const toggleTodo = (id) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {/* This component will re-render when todo.completed changes */}
          <ObservableTodoItem todo={todo} />
        </div>
      ))}
    </div>
  );
};
```

:::

::: tip When to use it?

Use `observable` when you have an existing React component that you want to make reactive, or you need the full power of a component and make it reactive. It's perfect for making
third-party components or components from your component library reactive to Anchor's state changes.

:::

::: details Difference between `observable()` and `observe()`

Both `observable()` and `observe()` are Higher-Order Components (HOCs) that make React components reactive to
**Anchor**'s state changes. The key difference lies in their primary use case:

- **`observable(Component)`:** Use this when you have an _existing React component_ (class or functional) that you want
  to make reactive. It wraps your component and passes an internal `_state_version` prop to trigger re-renders.
- **`observe(factory)`:** Use this when you want to create a reactive _render function_ directly, often for inline
  rendering or when you don't need a separate component definition. It takes a `factory` function that returns JSX and
  makes that function reactive.

:::

## Hook APIs

These are the primary React hooks for observing reactive state changes.

### **`useObserved(observe, deps?)`**

The primary hook for creating a reactive computation that automatically re-runs when its observed dependencies change.
It combines [useObserverRef](#useobserverref) and React's [useMemo](https://react.dev/reference/react/useMemo) to create
a memoized value that updates whenever any reactive dependencies accessed within the `observe` function change.

Unlike [observe()](#observe-factory-displayname) which provides fine-grained reactivity by creating a separate
component, `useObserved` triggers re-render of the entire component where it's declared.

**Params**

- **`observe`** - A function that performs the computation. Any reactive state accessed within this function will be
  automatically tracked, and the function will re-run when that state changes.
- **`deps`** _(optional)_ - An array of additional dependencies. If any of these dependencies change (using React's
  default shallow comparison), the `observe` function will re-run. This is useful for incorporating non-reactive values
  into the computation.

[API Reference](../apis/react/observation.md#useobserved)

#### Usage

To use `useObserved`, call it within your component body with a function that accesses reactive state:

::: details Basic Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObserved } from '@anchorlib/react/components';

const UserProfile = () => {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  // useObserved tracks user.firstName and user.lastName
  const fullName = useObserved(() => {
    console.log('Recalculating full name...');
    return `${user.firstName} ${user.lastName}`;
  });

  const incrementAge = () => {
    user.age++; // This will NOT trigger fullName recalculation
  };

  const changeName = () => {
    user.firstName = 'Jane';
    user.lastName = 'Smith'; // This WILL trigger fullName recalculation and re-render
  };

  return (
    <div>
      <h1>Welcome, {fullName}!</h1>
      <p>Age: {user.age}</p>
      <button onClick={incrementAge}>Increment Age</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};
```

:::

::: details With Additional Dependencies {open}

```tsx
import React from 'react';
import { useAnchor, useVariable } from '@anchorlib/react';
import { useObserved } from '@anchorlib/react/components';

const ProductCard = ({ currency }) => {
  const [product] = useAnchor({
    name: 'Laptop',
    price: 1000,
    discount: 0.1,
  });

  // useObserved tracks product.price and product.discount
  // It also re-runs when the currency prop changes
  const displayPrice = useObserved(() => {
    const discountedPrice = product.price * (1 - product.discount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(discountedPrice);
  }, [currency]);

  const updatePrice = () => {
    product.price = 1200; // This will trigger displayPrice recalculation
  };

  const updateDiscount = () => {
    product.discount = 0.15; // This will also trigger displayPrice recalculation
  };

  return (
    <div>
      <h2>{product.name}</h2>
      <p>Price: {displayPrice}</p>
      <button onClick={updatePrice}>Update Price</button>
      <button onClick={updateDiscount}>Update Discount</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useObserved` when you need to create a reactive computation that derives values from reactive state. It's the most
common hook for creating computed values that automatically update when their dependencies change.

Note that unlike [observe()](#observe-factory-displayname), `useObserved` triggers re-render of the entire component
where it's declared, not just the observed part.

:::

### **`useObservedList(state, key?)`**

Derives a list of objects from a reactive array state, providing stable keys for rendering. This is particularly useful
when rendering lists in React where you need stable keys for efficient reconciliation.

**Params**

- **`state`** - The reactive array state.
- **`key`** _(optional)_ - A property name to use as the key for each item. If not provided, the array index will be
  used.

[API Reference](../apis/react/observation.md#useobservedlist)

#### Usage

::: details Using Index as Key {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObservedList } from '@anchorlib/react/components';

const TodoList = () => {
  const [todos] = useAnchor([
    { id: 1, text: 'Learn Anchor', completed: false },
    { id: 2, text: 'Build an app', completed: false },
    { id: 3, text: 'Deploy to production', completed: false },
  ]);

  // Using index as key
  const observedTodos = useObservedList(todos);

  const toggleTodo = (index) => {
    todos[index].completed = !todos[index].completed;
  };

  return (
    <ul>
      {observedTodos.map(({ key, value: todo }, index) => (
        <li key={key}>
          <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(index)} />
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
};
```

:::

::: details Using Custom Property as Key {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObservedList } from '@anchorlib/react/components';

const UserList = () => {
  const [users] = useAnchor([
    { id: 'user1', name: 'John Doe', email: 'john@example.com' },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com' },
  ]);

  // Using 'id' property as key
  const observedUsers = useObservedList(users, 'id');

  const updateUser = (userId, newName) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.name = newName;
    }
  };

  return (
    <ul>
      {observedUsers.map(({ key, value: user }) => (
        <li key={key}>
          <span>
            {user.name} ({user.email})
          </span>
          <button onClick={() => updateUser(user.id, 'Updated Name')}>Update Name</button>
        </li>
      ))}
    </ul>
  );
};
```

:::

::: tip When to use it?

Use `useObservedList` when you need to render a list of reactive objects and want to ensure stable keys for efficient
React reconciliation. This hook is especially useful when working with reactive arrays where items can be added,
removed, or reordered.

:::

## Low Level APIs

These are lower-level APIs primarily intended for internal use or advanced scenarios.

### **`useObserverRef(deps?, displayName?)`**

Provides a stable `StateObserver` instance for tracking reactive dependencies. This is a low-level hook.

**Params**

- **`deps`** _(optional)_ - Dependencies that, when changed, re-establish the observer.
- **`displayName`** _(optional)_ - Name for debugging.

[API Reference](../apis/react/observation.md#useobserverref)

#### Usage

::: details Basic Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObserverRef } from '@anchorlib/react/components';

const CustomObserver = () => {
  const [data] = useAnchor({ value: 0, text: 'Hello' });

  // Get an observer instance
  const [observer, version] = useObserverRef([], 'CustomObserver');

  // Use the observer to track reactive dependencies
  const observedValue = React.useMemo(() => {
    return observer.run(() => {
      // This access will be tracked by the observer
      return `Value: ${data.value}, Text: ${data.text}`;
    });
  }, [observer, version, data]);

  const updateValue = () => {
    data.value++;
  };

  return (
    <div>
      <p>{observedValue}</p>
      <button onClick={updateValue}>Update Value</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useObserverRef` when you need direct access to an observer instance for advanced scenarios. Most developers will
not need to use this hook directly, as higher-level APIs like [useObserved](#useobserved-observe-deps) provide easier
ways to work with reactive computations.

:::
