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
accessed within the provided `factory` callback changes.

::: tip Recommended!

This is the most recommended way to observe state changes in **Anchor** because it provides fine-grained reactivity -
only the observed part re-renders, not the entire component where it's declared.

:::

**Params**

- **`factory`** - A callback function that returns a `ReactNode`. This function will be executed within an observing context.
- **`displayName`** _(optional)_ - A string to be used as the display name for the returned component in React DevTools.

**Returns**: A new React component that is reactive to observable state changes.

[API Reference](../apis/react/observation.md#observe)

#### Usage

::: details Basic Observation Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observe } from '@anchorlib/react';

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
import { observe } from '@anchorlib/react';

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
coupled with their parent's state logic. This HOC is most suitable for selective rendering, acting as the **View** in the **DSV** pattern.

:::

::: warning Caveat

When using the **`observe()`** API you are not creating a component. Thus, you cannot use React hooks such as `useEffect()`
inside it. This API is designed to be an intuitive way to render a template and re-render when the required state
changes. Its main purpose is to be used as a **`View`**.

:::

### **`observable(Component, displayName?)`**

A Higher-Order Component (HOC) that wraps a React component to make it reactive to changes in observable state.

It automatically sets up and manages a `StateObserver` instance for the wrapped component. When any observable dependencies used within the component's render phase change, the component will automatically re-render.

**Params**

- **`Component`** - The React component to be made observable. It should accept its original props `T`.
- **`displayName`** _(optional)_ - A string to be used as the display name for the wrapped component in React DevTools. If not provided, it
  will derive from the original component's display name or name.

**Returns**: A new React component that is reactive to observable state changes.

[API Reference](../apis/react/observation.md#observable)

#### Usage

::: details Wrapping an Existing Component {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { observable } from '@anchorlib/react';

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
import { observable } from '@anchorlib/react';

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

Use `observable` when you have an existing React component that you want to make reactive. This HOC will re-render the wrapped component whenever there are changes to the observed states. Thus, this HOC is most suitable for use case where a full re-render is needed such as wrapping a 3rd party components, or need a simple component setup without manually declare a selective rendering.

:::

::: details Difference between `observable()` and `observe()`

The key difference lies in their approach and use cases:

- **`observable(Component)`:** Wraps an existing component and is best for full component re-renders, especially when working with third-party components or when you need a simple setup without selective rendering.
- **`observe(factory)`:** Creates a new component from a factory function and is best for selective rendering within the DSV pattern, where you want fine-grained control over what gets re-rendered.
  :::

## Hook APIs

These are the primary React hooks for observing reactive state changes.

### **`useObservedRef(observe, deps?)`**

Creates a reactive reference to a computed value. It automatically tracks reactive dependencies accessed within the observe function and updates the reference value when those dependencies change.

This hook is particularly useful for creating computed values that depend on multiple reactive states without manually specifying them as dependencies. The computation is automatically re-executed when any of the accessed reactive states change.

The returned ref is itself a reactive state that can be consumed by other observers or displayed in views (`observable()` or `observe()`).

**Params**

- **`observe`** - A function that computes and returns the desired value. Any reactive state accessed within this function will be automatically tracked, and the function will re-run when that state changes.
- **`deps`** _(optional)_ - An array of additional dependencies. This is useful for computation that also depends on external state such as props.

**Returns**: A constant reference (`ConstantRef<T>`) to the computed value. The reference object remains stable, but its `.value` property updates when the computed value changes.

[API Reference](../apis/react/observation.md#useobservedref)

#### Usage

::: details Basic Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObservedRef } from '@anchorlib/react';

const UserProfile = () => {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  // useObservedRef tracks user.firstName and user.lastName
  // The returned ref can be consumed by other observers
  const fullNameRef = useObservedRef(() => {
    return `${user.firstName} ${user.lastName}`;
  });

  // Create a component that observes the computed ref value
  const FullNameDisplay = observe(() => <h1>Welcome, {fullNameRef.value}!</h1>);

  const incrementAge = () => {
    user.age++;
  };

  const changeName = () => {
    user.firstName = 'Jane';
    user.lastName = 'Smith'; // This will update fullNameRef.value and trigger re-render of FullNameDisplay
  };

  return (
    <div>
      <FullNameDisplay />
      <p>Age: {user.age}</p>
      <button onClick={incrementAge}>Increment Age</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useObservedRef` when you need to create a computed value that can be consumed by other reactive observers. The returned ref is itself a reactive state that can be used in other computations or displayed in views.

:::

### **`useObserver(observe, deps?)`**

A custom React hook that creates a computed value by running the provided observe function within a reactive tracking context. It automatically tracks reactive dependencies accessed within the observe function and triggers re-rendering when those dependencies change.

This hook is particularly useful for creating computed values that depend on multiple reactive states without manually specifying them as dependencies. The computation is automatically re-executed when any of the accessed reactive states change.

Unlike [observe()](#observe-factory-displayname) which provides fine-grained reactivity by creating a separate
component, `useObserver` triggers re-render of the entire component where it's declared.

**Params**

- **`observe`** - A function that computes and returns the desired value. Any reactive state accessed within this function will be
  automatically tracked, and the function will re-run when that state changes.
- **`deps`** _(optional)_ - An array of additional dependencies. This is useful for computations that also depend on
  external state such as props. These dependencies are used to determine when the computation should be re-executed.

**Returns**: The computed value returned by the observe function. This value is memoized and will only
be recomputed when the tracked reactive dependencies or the additional dependencies change.

[API Reference](../apis/react/observation.md#useobserver)

#### Usage

To use `useObserver`, call it within your component body with a function that accesses reactive state:

::: details Basic Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useObserver } from '@anchorlib/react';

const UserProfile = () => {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  // useObserver tracks user.firstName and user.lastName
  const fullName = useObserver(() => {
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
import { useObserver } from '@anchorlib/react';

const ProductCard = ({ currency }) => {
  const [product] = useAnchor({
    name: 'Laptop',
    price: 1000,
    discount: 0.1,
  });

  // useObserver tracks product.price and product.discount
  // It also re-runs when the currency prop changes
  const displayPrice = useObserver(() => {
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

Use `useObserver` when you need to create a reactive computation that derives values from reactive state. It's the most
common hook for creating computed values that automatically update when their dependencies change.

Note that unlike [observe()](#observe-factory-displayname), `useObserver` triggers re-render of the entire component
where it's declared, not just the observed part.

:::

### **`useObserved(observe, deps?)`** (Deprecated)

::: danger Deprecated

This API is deprecated. Use [useObserver](#useobserver-observe-deps) instead.

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
import { useObservedList } from '@anchorlib/react';

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
import { useObservedList } from '@anchorlib/react';

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
import { useObserverRef } from '@anchorlib/react';

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
not need to use this hook directly, as higher-level APIs like [useObserver](#useobserver-observe-deps) provide easier
ways to work with reactive computations.

:::
