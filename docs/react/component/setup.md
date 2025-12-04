---
title: "The Setup Function"
description: "Understanding the setup function: The stable initialization phase of an Anchor component."
keywords:
  - setup function
  - component initialization
  - stable logic
---

# The Setup Function

The `setup` function is the entry point for Anchor components. It serves as the **constructor** for your component, running exactly once when the component mounts.

## How It Works

Unlike standard React functional components which re-run the entire function body on every render, `setup` creates a **closure** that persists for the lifetime of the component.

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

## Arguments

### `props`
The `props` object passed to `setup` is a **Reactive Proxy**.

- **In Setup**: Accessing `props` gives you the *initial* value.
- **In Render/Effects**: Accessing `props` tracks dependencies. If the parent updates the prop, your effect/render will re-run.

> [!WARNING]
> **Do NOT destructure props in the setup body** if you want them to be reactive. Destructuring breaks the proxy connection.
>
> ```ts
> // ❌ Bad: 'name' will be stuck at the initial value
> const { name } = props;
>
> // ✅ Good: Access 'props.name' where needed
> effect(() => console.log(props.name));
> ```

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
