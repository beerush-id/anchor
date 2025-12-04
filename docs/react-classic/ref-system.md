---
title: 'The Ref System in Anchor for React: useVariable & useConstant'
description: "A deep dive into Anchor's Ref System for React. Learn how to use useVariable and useConstant to manage state, decouple components, and optimize rendering."
keywords:
  - anchor for react
  - react ref system
  - useVariable hook
  - useConstant hook
  - reactive state react
  - component decoupling
  - react performance
  - dsv pattern
  - anchor ref
---

# Understanding the Ref System in Anchor for React

In the React ecosystem, managing and sharing state between components can often lead to complex patterns like prop
drilling or context providers. Anchor introduces the **Ref System**, a powerful and intuitive way to handle state that
enhances component decoupling and optimizes rendering performance.

A **Ref** is a reactive object that holds a reference to a value. This simple yet powerful concept allows you to share
and modify state across your application while giving components granular control over their own rendering cycles.

## What is a Ref?

A Ref is a container for a value. Instead of working directly with a state variable, you work with a `Ref` object, which
has a `.value` property.

```tsx
const [myRef] = useVariable('Hello, Anchor!');

console.log(myRef.value); // Outputs: 'Hello, Anchor!'

// Direct mutation is the most common way to update a Ref's value
myRef.value = 'Hello, World!';
```

The magic happens when this `.value` is accessed within an **Observation** or **Derivation** context. Anchor tracks this
access and automatically re-renders the component only when the `.value` changes.

### Synchronous and Immediate Updates

A key difference from React's `useState` is that Anchor's `Ref` updates are **synchronous and immediate**. When you
change a `Ref`'s value, the change is applied instantly. Any subsequent read of that `Ref`'s `.value` will always return
the new, up-to-date value.

This is unlike React's state, which is asynchronous and scheduled for a future render. With `useState`, you can't rely
on the new value being available immediately after calling the setter. This often leads to the need for functional
updates (`setState(current => current + 1)`) to prevent race conditions from rapid state changes.

With an Anchor `Ref`, this is not a concern. You can mutate the value multiple times, and it will always be consistent.

```tsx
const [countRef] = useVariable(0);

const handleClick = () => {
  countRef.value++;
  countRef.value++;
  console.log(countRef.value); // Will always log 2
};
```

Even though React may batch the resulting re-renders for performance, when the component finally does re-render, it will
read the latest, correct value from `countRef.value`. This synchronous behavior simplifies state logic and eliminates an
entire class of bugs related to state updates.

::: warning Anchor Ref vs. React Ref

It is crucial to understand that Anchor's `Ref` is fundamentally different from React's `ref` (created with `useRef`).

- **React's `ref`:** A container for a mutable value that does **not** trigger re-renders when its `.current` property
  is changed. It's mainly for DOM access or persisting values without causing updates.
- **Anchor's `Ref`:** A **reactive** state container. Modifying its `.value` property **will** trigger re-renders in any
  component observing it.

You should treat an Anchor `Ref` like a state variable from React's `useState`. Mutating its `.value` directly within
the render phase is a side-effect that can lead to inconsistent UI and infinite loops, just like calling `setState`
during render. All mutations should occur in event handlers or `useEffect` hooks.

:::

### Recursive Reactivity

It's important to understand that a `Ref` is **recursively reactive**. If a `Ref` holds an object or an array, any
nested property within that object also becomes reactive.

```tsx
const [userRef] = useVariable({ profile: { name: 'John' } });

// This mutation will trigger a re-render in any component observing userRef.value.profile.name
userRef.value.profile.name = 'Jane';
```

::: tip Pros

This provides great convenience, as you don't need to manually wrap nested objects to make them reactive.

:::

::: warning Cons

This also means you must be mindful of mutations. Since the entire object tree within the `.value` is mutable and
reactive, changes can have wide-ranging effects. For complex state where you need more control and immutability,
consider using a dedicated initializer like `useImmutable`.

:::

## Practical Scenario

Let's consider a common example: a todo application that displays statistics, such as the total number of todos and how
many are completed.

### The Problem: Inefficient Derived State

In a traditional React app, you might derive these stats directly in the render method:

```tsx
function TodoStats({ todos }) {
  // These calculations run on EVERY render
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;

  return (
    <div>
      <p>Total: {total}</p>
      <p>Completed: {completed}</p>
    </div>
  );
}
```

While this works for a small list, it becomes a performance bottleneck as the app scales. If you have thousands of
todos, filtering the entire array on every single render is inefficient. It violates the principle that a
well-engineered app should remain performant whether it's displaying one item or thousands.

The obvious optimization is to update the stats only when a todo is added, removed, or toggled. However, doing this
manually in traditional React is surprisingly complex. You would need to manage the stats in a separate state and
carefully synchronize it with the todos list, which is difficult to get right due to the asynchronous nature of
`setState` and the potential for race conditions.

### The Anchor Solution: Synchronous, Simple Updates

With Anchor's `Ref` system, this problem becomes trivial to solve. Because `Ref` updates are synchronous, you can update
the source data and the derived stats together in the same action, with no fear of race conditions.

```tsx
const [todosRef] = useVariable([]);
const [statsRef] = useVariable({ total: 0, completed: 0 });

const addTodo = (text) => {
  // Mutate both refs in one synchronous action
  todosRef.value.push({ text, completed: false });
  statsRef.value.total++;
};

const toggleTodo = (index) => {
  const todo = todosRef.value[index];
  if (todo) {
    todo.completed = !todo.completed;
    statsRef.value.completed += todo.completed ? 1 : -1;
  }
};
```

Here, the expensive computation is completely avoided during the render phase. The stats are always perfectly in sync
because the mutations are atomic and immediate. This approach is not only far more performant but also simpler and more
intuitive to read and maintain.

## Why Use the Ref System?

The Ref System addresses several common challenges in React development:

1. **Creating a Stable Reference for Primitives:** In JavaScript, primitive values (strings, numbers, etc.) are passed
   by value. This means when you pass a primitive to another component, you're passing a _copy_, not a shared reference.
   It's impossible for a child component to change the parent's primitive state directly. A `Ref` solves this by
   wrapping the primitive in an object. You then pass the `Ref` object (which is passed by reference), allowing any
   component with access to the `Ref` to read or modify the same underlying value.

2. **True Component Decoupling:** The conventional React pattern is to pass state down as `[value, setValue]`. This
   creates a tight coupling; the child component is dependent on the parent's implementation and forces the parent to
   re-render whenever the state changes, even if the parent doesn't use the state itself. By passing a single `Ref`
   object instead, you empower the child component. It can read and write to the `Ref` and control its own rendering
   cycle based on its own observations, completely independent of the parent.
   This is the foundation of the **Data-State-View (DSV)** pattern.

3. **Avoiding Prop Drilling:** Instead of passing props through multiple layers of intermediate components, you can pass
   a single `Ref` object directly to the components that need it (or provide it via context), simplifying your component
   tree.

4. **Optimized Rendering:** Because components observe the `Ref`, only the components that actually access the `.value`
   property will re-render when it changes. Parent components that own the state but don't display it remain static,
   preventing unnecessary render cascades.

## Creating Refs

Anchor provides two primary hooks for creating Refs: `useVariable` for mutable value and `useConstant` for a read-only
value.

### `useVariable`

The `useVariable` hook creates a mutable `Ref`. It's the most common way to create reactive state that can be changed
over time.

::: code-group

```tsx [Signature]
function useVariable<T>(init: T): [VariableRef<T>, RefUpdater<T>];
function useVariable<T>(init: RefInitializer<T>, deps: unknown[]): [VariableRef<T>, RefUpdater<T>];
```

```tsx [Example: Direct Mutation]
import { useVariable, observer } from '@anchorlib/react';

const Counter = observer(() => {
  const [countRef] = useVariable(0);

  return (
    <div>
      <p>Count: {countRef.value}</p>
      {/* Direct mutation is simple and intuitive */}
      <button onClick={() => countRef.value++}>Increment</button>
    </div>
  );
});
```

:::

::: info Note

While it returns a tuple containing `[ref, updateFn]`, the most intuitive and common way to modify the state is through
direct mutation of the `.value` property (e.g., `counterRef.value++`). The `update` function is provided mainly for
fallback in case you prefer to use the `update` function.

:::

### `useConstant`

The `useConstant` hook creates a `Ref` with a **read-only `.value` property**. It's ideal for values that are computed
and should only be recalculated when their dependencies change.

It returns a tuple containing only the `ref` object. Attempting to reassign its `.value` will result in a
development-mode warning. Use this hook to signal that a `Ref`'s value is managed by its dependencies and should not be
changed imperatively.

::: code-group

```tsx [Example: Derived Value]
import { useConstant, observer } from '@anchorlib/react';

const UserProfile = observer(({ user }) => {
  // This ref will only re-calculate when the `user` prop changes.
  const [fullNameRef] = useConstant(() => `${user.firstName} ${user.lastName}`, [user]);

  return <h1>Welcome, {fullNameRef.value}!</h1>;
});
```

```tsx [Signature]
function useConstant<T>(init: T): [ConstantRef<T>];
function useConstant<T>(init: RefInitializer<T>, deps: unknown[]): [ConstantRef<T>];
```

:::

::: warning Important

It's important to understand the distinction between this and true immutability. `useConstant` only prevents the
`.value` property from being reassigned:

`myConstantRef.value = newValue; // This will trigger a warning`

However, if the `.value` holds an object, the properties of that object are still mutable, because the object itself is
the same one.

```tsx
const [settingsRef] = useConstant({ theme: 'dark' });

// This is NOT allowed and will warn you.
// settingsRef.value = { theme: 'light' };

// This is allowed, because you are mutating the object, not reassigning the .value
settingsRef.value.theme = 'light';
```

:::

## When to Use the Ref System

- **Passing State to Children:** When a parent component holds state that a child needs to read and/or modify. Pass a
  `Ref` to let the child control its own rendering.
- **Sharing State Across Components:** When multiple, potentially sibling, components need to access and manipulate the
  same piece of state.
- **Implementing the DSV Pattern:** To build highly performant UIs where state-owning components don't re-render when
  the state they own changes.

## When Not to Use the Ref System

- **Simple, Local State:** If a piece of state is only used within a single component and not shared, using `useAnchor`
  is often simpler. The boilerplate of typing `.value` (e.g., `count.value` vs. `count`) is unnecessary for purely local
  state.
- **Complex, Secure State:** For complex state objects where you need to enforce immutability and prevent accidental
  mutations, it's better to use dedicated initializers like `useImmutable`. Since a `Ref`'s value is deeply mutable by
  design, overusing it for complex, shared state can sometimes lead to unexpected behavior if not handled with care.

## Best Practices

1. **Embrace the DSV Pattern:** Structure your components into Data, State, and View layers. Let "State" components
   create and manage Refs, and pass them to "View" components for rendering.
2. **Use Observation/Derivation for Controlled Renders:** A component only re-renders when a `Ref`'s value is accessed
   within an **Observation** or **Derivation** context.

- The `observer()` HOC is the simplest way to make a whole component reactive, but it may cause the entire component
  to re-render if any observed value changes.
- For more controlled, fine-grained rendering, use the `view` HOC or hooks like `useObserved()` and `useDerived()`.
  These tools allow you to create reactive boundaries, ensuring that only the necessary parts of your UI update.

3. **Use `useConstant` for Derived Data:** When a value is derived from other props or state, use `useConstant` with a
   dependency array. This makes your intent clear that the `Ref`'s value is managed by its dependencies and its `.value`
   property should not be reassigned.
4. **Pass the Entire Ref:** When passing a `Ref` to a child, pass the entire `ref` object, not just `ref.value`. This
   gives the child component the full reactive reference.

## What's Next?

The Ref System is a foundational part of Anchor's reactivity model. To see how it integrates with other features,
explore:

- **[Initialization](/react/initialization):** Learn how to initialize a different types of state with Anchor's
  initializers. Learn best practices for using initializers.
- **[Observation](/react/observation):** Learn how to create reactive boundaries within your components for even more
  granular rendering control.
- **[Derivation](/react/derivation):** Discover how to create new reactive values that are computed from other states,
  including Refs.
