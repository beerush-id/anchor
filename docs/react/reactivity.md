---
title: 'Reactivity in Anchor for React: The DSV Pattern Explained'
description: 'A deep dive into the reactivity model of Anchor for React. Learn about the DSV (Data-State-View) pattern, selective re-rendering, and how it improves performance.'
keywords:
  - anchor for react
  - react reactivity
  - dsv pattern
  - data-state-view
  - fine-grained reactivity
  - react performance
  - selective re-rendering
  - anchor reactivity model
---

# Understanding Reactivity in Anchor for React

**Anchor** redefines reactivity in **React** by providing a more intuitive and efficient approach to state
management that aligns with how developers naturally think about UI components.

Unlike traditional React where components re-render whenever their state change, **Anchor** uses **granular
reactivity** system where only the parts of your UI that actually depend on changed data are updated.

## Anchor's Reactivity

**Anchor** introduces a fundamentally different approach to reactivity that
eliminates [these issues](#traditional-issues) by separating
concerns and providing **granular control** over rendering through the **DSV (Data-State-View)** pattern.

### The DSV (Data-State-View) Pattern

**Anchor** promotes the **DSV** pattern that clearly separates responsibilities:

- **`Data`**: Reactive state objects that hold your application data.
- **`State`**: Components that manage state but doesn't re-render.
- **`View`**: Small components that observe specific state changes and re-render efficiently.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/react-dsv.webp" alt="Reactivity Schema" />
</div>

This pattern allows for more efficient rendering because only the **`View`** components that actually depend on changed
data need to re-render, while the **`State`** components that manage the data remain stable, all with code that is easy
to reason about and feels natural.

::: details Anchor's DSV Example

```tsx {4,7,10,15,19,20,21,29,35,36,42}
// State Component - Renders only once.
const CounterManager = () => {
  // Data - reactive state that holds your application data.
  const [count] = useVariable(0);

  // This variable is stable because the CounterManager itself doesn't re-render.
  let renderCount = 0;

  // Expensive computation only runs once.
  const expensiveValue = computeExpensiveValue();

  // View - only re-renders when the observed data changes.
  const Count = view(() => {
    // Assignment to local variable works as normally would.
    renderCount++;

    return (
      <>
        <h1>Count: {count.count}</h1>
        <p>Render Count: {renderCount}</p>
        <p>Expensive Value: {expensiveValue}</p>
      </>
    );
  });

  // Mutation - Directly mutates the reactive state.
  useEffect(() => {
    setInterval(() => {
      count.count++;
    }, 1000);
  }, []);

  // Reset works as we normaly expect.
  const reset = () => {
    count.value = 0;
    renderCount = 0;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Count />
      <button onClick={reset}>Reset</button>
    </div>
  );
};
```

:::

## Reactivity Lifecycle

**Anchor**'s reactivity follows a clear **lifecycle** that optimizes **performance** and **predictability**:

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/react-dsv-cycle.webp" alt="Reactivity Schema" />
</div>

### 1. Initialization

During **initialization**, the **State Component** creates **reactive state** objects. This happens only once, or when
the parent
component re-renders (creating a completely new instance). The state object is created with all its initial values and
is **ready to be observed by the View components**.

::: details State Initialization {open}

```tsx {2,4,6}
const CounterManager = () => {
  const [count] = useVariable(0);

  let renderCount = 0;

  const expensiveValue = computeExpensiveValue();
};
```

:::

### 2. Observation

In the observation phase, **View Components** declare what state they depend on. Anchor automatically tracks these
dependencies using a sophisticated observer system. When a **View component** renders, **Anchor** monitors which state
properties are accessed and creates a dependency map.

::: details State Observation {open}

```tsx {6}
const Count = view(() => {
  renderCount++;

  return (
    <>
      <h1>Count: {count.count}</h1>
      <p>Render Count: {renderCount}</p>
      <p>Expensive Value: {expensiveValue}</p>
    </>
  );
});
```

:::

### 3. Mutation

State mutations in Anchor happen directly and immediately, without waiting for React's render cycle. When you modify a
state property, the change is applied instantly to the underlying data structure. You get predictable, synchronous state
updates that make it easier to reason
about your application's behavior.

::: details State Mutation {open}

```tsx {2,6}
setInterval(() => {
  count.count++;
}, 1000);

const reset = () => {
  count.value = 0;
  renderCount = 0;
};
```

:::

### 4. Re-render

Only the specific View Components that depend on changed state re-render. This selective rendering is what makes Anchor
so efficient compared to traditional React.

::: details Re-rendered part {open}

```tsx {6}
const Count = view(() => {
  renderCount++;

  return (
    <>
      <h1>Count: {count.count}</h1>
      <p>Render Count: {renderCount}</p>
      <p>Expensive Value: {expensiveValue}</p>
    </>
  );
});
```

:::

When a state change occurs, Anchor's observer system checks which View components depend on the changed data and only
triggers re-renders for those components. This means:

- Unaffected components remain untouched
- Performance scales better with application complexity
- No need for manual optimization techniques
- Predictable rendering behavior

::: details Selective Re-rendering Example

```tsx
const UserDashboard = () => {
  const [user] = useAnchor({ name: 'John Doe', age: 30 });

  // Only re-renders when user.name changes
  const UserName = view(() => {
    return <h1>Hello, {user.name}!</h1>;
  });

  // Only re-renders when user.age changes
  const UserAge = view(() => {
    return <p>You are {user.age} years old</p>;
  });

  return (
    <div>
      {/* These views are independent and render separately */}
      <UserName />
      <UserAge />
      <button onClick={() => (user.name = 'Jane Doe')}>Change Name</button>
      <button onClick={() => user.age++}>Increment Age</button>
    </div>
  );
};
```

:::

## Key Benefits

There are several key benefits to using **Anchor**'s reactivity:

### Stable Function Closures

With Anchor's approach, the **State Component**'s closure remains stable, making it behave more like a traditional class
component but with the benefits of functional components.

This stability allows you to:

- Store local variables that persist between state changes.
- Create functions that don't need to be memoized.
- Avoid the complexity of `useRef` for simple persistence.

::: details Stable Closures

::: anchor-react-sandbox

```tsx App.tsx
import { useAnchor, view } from '@anchorlib/react';

const TaskManager = () => {
  const [tasks] = useAnchor([]);

  let newTasks = 0; // This remains stable!

  // These functions are never re-created unnecessarily.
  const addTask = (text) => {
    tasks.push({ id: Date.now(), text: `${text} ${newTasks + 1}`, completed: false });
    newTasks++; // This works as expected!
    console.log(newTasks);
  };

  // Only this view is re-rendered when tasks change.
  const TaskListView = view(() => (
    <div>
      {tasks.length > 0 && (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.text}</li>
          ))}
        </ul>
      )}
      {!tasks.length && <p>No tasks.</p>}
      <p>New tasks: {newTasks}</p>
    </div>
  ));

  return (
    <div>
      <TaskListView />
      <button onClick={() => addTask('New Task')}>Add Task</button>
    </div>
  );
};

export default TaskManager;
```

:::

### No Stale Data Issues

Because state mutations are immediate and don't depend on React's render cycle, you never encounter stale data issues.
In traditional React, event handlers can capture stale state values, leading to bugs that are difficult to track down.

Anchor's immediate mutation model ensures that when you access state, you always get the current values. This eliminates
entire classes of bugs related to stale closures and makes your code more predictable.

::: details No Stale Data

::: anchor-react-sandbox

```tsx App.tsx
import { useAnchor, view } from '@anchorlib/react';

const Counter = () => {
  const [counter] = useAnchor({ count: 0 });

  // No stale closure problems
  const incrementMultiple = () => {
    counter.count++;
    counter.count++;
    counter.count++;
    // All changes are immediately applied
  };

  const Display = view(() => {
    return <p>Count: {counter.count}</p>;
  });

  return (
    <div>
      <Display />
      <button onClick={incrementMultiple}>Increment by 3</button>
    </div>
  );
};

export default Counter;
```

:::

### Efficient and Intuitive

**Anchor**'s reactivity eliminates the need for excessive memoization and provides an intuitive development experience.
You
don't need to **extensively** think about dependency arrays, memoization, or complex optimization patterns.

Additionally, direct state mutations feel natural and intuitive. Instead of calling setter functions or dispatching
actions, you simply assign new values to state properties.

::: details Shopping Cart Example

::: anchor-react-sandbox

```tsx App.tsx
import { useAnchor, view } from '@anchorlib/react';

const ShoppingCart = () => {
  const [cart] = useAnchor({
    items: [],
    total: 0,
  });

  // Automatically updates when cart.items changes
  const CartItems = view(() => (
    <div>
      <h2>Total: ${cart.total.toFixed(2)}</h2>
      <ul>
        {cart.items.map((item) => (
          <li key={item.id}>
            {item.name} - ${item.price} x {item.quantity}
          </li>
        ))}
      </ul>
    </div>
  ));

  const addItem = () => {
    cart.items.push({
      id: Date.now(),
      name: `Product ${cart.items.length + 1}`,
      price: 10,
      quantity: 1,
    });

    // Expensive computation runs only when needed.
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  return (
    <div>
      <CartItems />
      <button onClick={addItem}>Add Item</button>
    </div>
  );
};

export default ShoppingCart;
```

:::

## Component Types

In **Anchor**'s **Reactivity** Model, you would categorize your components into the following types:

### State Component

State Components manage reactive state and doesn't re-render. They serve as the **brain** of your UI, initializing state
and coordinating between different parts of your application.

These components are responsible for:

- **Initializing** and managing reactive state.
- **Coordinating** between different parts of the UI.
- Handling **business logic**.
- Serving as the **single source of truth** for the **views**.

They should contain minimal presentation logic and focus on state management.

::: details State Component Example

```tsx
const AppState = () => {
  // This component only renders once
  const [state] = useAnchor({
    user: null,
    preferences: {},
    ui: {
      sidebarOpen: false,
      theme: 'light',
    },
  });

  // Child components can observe specific parts of the state
  return (
    <div>
      <UserView user={state.user} />
      <PreferencesView preferences={state.preferences} />
      <UIControls ui={state.ui} />
    </div>
  );
};
```

:::

### View Component

**View Components** observe specific state and **re-render** only when that state changes. They should be small, focused
components that handle **presentation logic**.

These components should:

- Focus on **presentation logic** only.
- **Observe** minimal state dependencies.
- Be small and **focused**.
- Avoid complex business logic.

They automatically re-render when their observed state changes, providing efficient UI updates.

::: details View Component Example

```tsx
import { observer } from '@anchorlib/react';

const UserView = observer(({ user }) => {
  // Only re-renders when user changes
  if (!user) return <div>Please log in</div>;

  // Only re-renders when user.name and user.email change.
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
});
```

:::

### Mutator Component

**Mutator Components** both **change** state and can **observe** changes. They bridge **user interactions** with state
updates.

These components:

- Handle **user interactions**.
- **Modify** specific parts of state and **focused**.
- Can also **observe** state changes.
- Bridge **user actions** with state updates.

They often contain both presentation elements (like buttons or forms) and logic for updating state.

::: details Mutator Component Example

```tsx
const ThemeToggle = ({ ui }) => {
  // Observes theme changes
  const ThemeIndicator = view(() => {
    return <span>Current theme: {ui.theme}</span>;
  });

  // Mutates state
  const toggleTheme = () => {
    ui.theme = ui.theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div>
      <ThemeIndicator />
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

:::

## Why Anchor's Reactivity?

Anchor's reactivity model solves fundamental problems with traditional React state management:

1. **Performance**: Only the necessary parts of your UI re-render, leading to better performance especially in complex
   applications
2. **Predictability**: State changes are immediate and consistent, making your application behavior easier to reason
   about
3. **Simplicity**: No need for excessive memoization or complex optimization patterns reduces boilerplate and cognitive
   load
4. **Developer Experience**: Write code that feels natural and intuitive, focusing on features rather than framework
   intricacies

By embracing Anchor's reactivity model, you can build React applications that are not only more performant but also
easier to reason about and maintain. The DSV pattern promotes clean architecture where responsibilities are clearly
separated, making your codebase more modular and testable.

## Traditional Issues

Traditional React components must re-render entirely when any state changes, which means all variables are re-declared
and all functions are re-created on each render cycle. This can lead to several issues:

::: details The Problems {open}

```jsx {2,5,8,13,16}
function TraditionalComponent() {
  // When the count changes, the whole component re-renders.
  const [count, setCount] = useState(0);

  // Always 0 because it's re-declared on each render.
  let renderCount = 0;

  // Expensive computation always run on each render.
  const expensiveValue = computeExpensiveValue();

  useEffect(() => {
    setInterval(() => {
      // Always starts from 0 because count is a stale closure value.
      setCount(count + 1);

      // The view always shows 0 because it's updating the stale closure variable.
      renderCount++;
    }, 1000);
  }, []);
}
```

:::

To optimize traditional React components, developers must use hooks like `useRef`, `useCallback`, and `useMemo`:

::: details Traditional Workaround {open}

```jsx {2,5,10,15,18}
// Creating a stable reference.
const renderCount = useRef(0);

// Prevent function re-creation.
const handleIncrement = useCallback(() => {
  setCount((c) => c + 1);
}, []);

// Memoize expensive computations.
const expensiveValue = useMemo(() => {
  return computeExpensiveValue();
}, []);

// Using callback to get the current count value.
setCount((current) => current + 1);

// Updating a reference
renderCount.current++;
```

:::

Even with these optimizations, developers still face challenges:

- Persistent performance issues with large component trees.
- Complex dependency management.
- Boilerplate code for simple interactions.
- Difficulty in reasoning about component behavior.
