---
title: "Component Setup"
description: "Understanding the setup function: The stable initialization phase of an Anchor component."
keywords:
  - setup function
  - component initialization
  - stable logic
---

# Component Setup

The `setup` function is the entry point for Anchor components. It serves as the **constructor** for your component, running exactly once when the component mounts.

## Creating Component

You create an Anchor component by passing a function to `setup()`.

This closure-based approach means your state and logic persist for the component's lifetime, avoiding the re-execution pitfalls of standard React functional components.

```tsx
import { setup, render, mutable } from '@anchorlib/react';

export const Counter = setup((props) => {
  // 1. SETUP PHASE (Runs Once)
  // Define state, effects, and handlers here.
  const state = mutable({ count: 0 });
  
  const increment = () => state.count++;

  // 2. REACTIVE PHASE (Runs on Updates)
  // Return the render function.
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
}, 'Counter');
```

## Reactive Props

The `props` object passed to `setup` is a **Reactive Proxy**. It works differently than React props:

### 1. Reacting to Changes
Since `setup` runs once, `props` are not refreshed on every render. Instead, you listen to changes by accessing properties within a **reactive boundary** (like `effect`, `template`, or `render`).

- **In Setup (Top-level)**: Accessing `props.name` gives you the *initial* value.
- **In Effect/Render**: Accessing `props.name` subscribes to updates.

```tsx
export const Greeter = setup((props) => {
  // ⛔️ WRONG: This only runs once. Updates to 'name' are ignored.
  const nameUpper = props.name.toUpperCase();

  // ✅ CORRECT: 'derived' creates a reactive boundary.
  // Updates to 'name' will re-calculate 'message'.
  const message = derived(() => `Hello, ${props.name}!`);

  return () => <h1>{message.value}</h1>;
});
```

> [!WARNING] Preserving Reactivity
> Destructuring `props` in the setup body will capture the **initial value**, breaking reactivity for those variables. To ensure updates are tracked, access properties directly from `props` (e.g., `props.name`).
>
> ```ts
> // ❌ Initial value only (not reactive)
> const { name } = props;
>
> // ✅ Reactive (updates tracked)
> effect(() => console.log(props.name));
> ```

### 2. Two-Way Binding
In Anchor, props can be writable. If you assign a new value to a prop, Anchor attempts to **propagate the change up** to the parent.

```tsx
// Inside a customized Input component
const handleInput = (e) => {
  // If the parent passed a mutable state or bound value, 
  // this assignment updates the PARENT'S state!
  props.value = e.target.value; 
};
```

This automatic propagation is powered by the **Binding** system. For more details on how to control this behavior, see the [Binding & Refs](./binding.md) documentation.

## Return Value

The `setup` function must return a **ReactNode** (JSX), just like a standard React component.

### Using `render()`
The most common pattern is to return `render(() => JSX)`. This creates an anonymous reactive boundary around your JSX.

```tsx
return render(() => <div>{state.value}</div>);
```

### Using `template()`
For more complex views, you can define one or more templates separately and return them.

```tsx
const View = template(() => <div>{state.value}</div>);
return <View />;
```

### Returning JSX Directly (Static Layout)
You can return JSX directly from `setup`. This is useful for defining the **static layout** of your component, while embedding reactive parts (templates) inside it.

```tsx
return (
  <div className="layout">
    <Header />
    <Sidebar />
    <Content /> {/* Reactive part */}
  </div>
);
```

## Best Practices

### Complex Components: Static Layout + Multiple Templates
For complex components, avoid putting everything into a single huge `render()` function. Instead, break your UI into smaller `template`s and use the `setup` return value to define the static structure.

```tsx
export const Dashboard = setup(() => {
  const state = mutable({ ... });

  // 1. Define reactive parts as templates
  const Header = template(() => <h1>{state.title}</h1>);
  const Sidebar = template(() => <nav>{/* ... */}</nav>);
  const Content = template(() => <main>{state.data}</main>);

  // 2. Return the static layout structure
  return (
    <div className="dashboard-layout">
      <Header />
      <div className="main-area">
        <Sidebar />
        <Content />
      </div>
    </div>
  );
}, 'Dashboard');
```

This pattern has several benefits:
- **Performance**: Only the specific parts that change (Header, Content) re-render. The layout `div`s never re-render.
- **Organization**: Keeps the render logic modular and easy to read.
- **Separation**: Clearly separates static structure from reactive content.

## Benefits

1.  **No Stale Closures**: Since `setup` runs once, all functions defined inside it share the same scope. You don't need `useCallback` to keep function references stable.
2.  **Performance**: Expensive initialization logic (like creating large data structures or setting up subscriptions) happens once, not on every render.
3.  **Clean Separation**: It enforces a clear distinction between "what the component does" (Setup) and "what the component looks like" (Reactive Phase).
