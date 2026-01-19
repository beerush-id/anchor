---
title: "Component"
description: "The Logic Layer: Creating stable, single-run constructors for your React components."
keywords:
  - component
  - logic layer
  - constructor
  - stable logic
---

# Component

The **Component** is the Logic Layer of your Anchor application. It acts as a constructor that runs exactly once when the component is created, defining the state, logic, and effects that power your UI.

## Creating a Component

You create a Component using `setup()`, which accepts a function that defines your component's logic:

```tsx
import { setup, render, mutable } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup((props) => {
  // State and logic
  const state = mutable({ count: 0 });
  
  const increment = () => state.count++;

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
}, 'Counter');
```

::: details Try it Yourself

::: anchor-react-sandbox

```tsx
import '@anchorlib/react/client';
import { setup, render, mutable } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup(() => {
  // State
  const state = mutable({ count: 0 });
  
  const increment = () => state.count++;

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => (
    <button onClick={increment} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}>
      Count: {state.count}
    </button>
  ), 'CounterView');
}, 'Counter');

export default Counter;
```

:::

The Component function runs **once** when the component is created and never re-executes. This creates a stable environment where:

- **State** persists for the component's lifetime
- **Functions** maintain consistent references
- **Effects** are defined once and track dependencies automatically

This single-run nature eliminates stale closures—your functions always reference the current state without needing dependency arrays or `useCallback`.

## Reactive Props

Props are implemented as reactive proxies that update in place. This means the Component doesn't re-execute when props change—instead, reactive boundaries (like [Views](/react/component/view) and [Effects](/react/component/side-effect)) automatically track and respond to prop updates.

### Reading Props

Where you access props determines the behavior:

- **In Component body** (top-level): Reads the current value at the time of execution
- **In reactive boundaries** (View, `effect`, `derived`): Tracks the property and re-runs when it changes

```tsx
// ━━━ COMPONENT (Logic Layer) ━━━
export const Greeter = setup((props) => {
  // This reads props.name once during Component creation
  console.log('Greeting: ', props.name); // Won't update

  // This creates a reactive computation that updates with props.name
  const message = derived(() => `Hello, ${props.name}!`);

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => <h1>{message.value}</h1>);
});
```

> [!WARNING] Destructuring Props
> Destructuring props in the Component body extracts the current value, disconnecting it from future updates:
>
> ```ts
> // This captures the initial value only
> const { name } = props;
>
> // Access props directly to maintain reactivity
> effect(() => console.log(props.name));
> ```

### Writing to Props

Props can be writable. Assigning to a prop propagates the change to the parent:

```tsx
// Inside a custom Input component
const handleInput = (e) => {
  // If the parent passed a mutable state or bound value, 
  // this assignment updates the PARENT'S state!
  props.value = e.target.value; 
};
```

This automatic propagation is powered by the **Binding** system. See [Binding & Refs](./binding.md) for details.

## Rendering

Every Component must return JSX to render the interface. You have three approaches to render the interface, each serving different purposes:

### Using Component View

A Component View is the primary reactive View returned immediately via `render()`. It's tied directly to the Component's output.

Create a Component View by wrapping your JSX with `render()`:

```tsx
return render(() => <div>{state.value}</div>);
```

The View tracks which state properties it reads and re-renders only when those properties change.

### Using Snippet

A Snippet is a scoped View defined inside the Component that can access local state through closure. Snippets can be reused within the Component and update independently.

Define Snippets using `snippet()`:

```tsx
const Header = snippet(() => <h1>{state.title}</h1>, 'Header');
const Content = snippet(() => <main>{state.data}</main>, 'Content');

return (
  <div>
    <Header />
    <Content />
  </div>
);
```

When `state.title` changes, only `Header` re-renders. When `state.data` changes, only `Content` re-renders.

### Using Static Layout

A Static Layout is JSX that's created once and never re-renders. Use this for structural elements that don't change, embedding Templates for the parts that need to update.

Return JSX directly without wrapping it in `render()`:

```tsx
const Header = snippet(() => <h1>{state.title}</h1>, 'Header');
const Content = snippet(() => <main>{state.data}</main>, 'Content');

return (
  <div className="layout">
    <Header /> {/* Updates when state.title changes */}
    <div className="sidebar">Static Sidebar</div>
    <Content /> {/* Updates when state.data changes */}
  </div>
);
```

The `div` elements are created once. Only `Header` and `Content` update when their respective state changes.

## Component Composition

For complex components, break your UI into multiple Templates and return a static JSX to define the static structure.

```tsx
export const Dashboard = setup(() => {
  const state = mutable({ ... });

  // Define reactive parts as Snippets
  const Header = snippet(() => <h1>{state.title}</h1>, 'Header');
  const Sidebar = snippet(() => <nav>{/* ... */}</nav>, 'Sidebar');
  const Content = snippet(() => <main>{state.data}</main>, 'Content');

  // Return the static layout structure
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

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, mutable, snippet } from '@anchorlib/react';

export const Dashboard = setup(() => {
  const state = mutable({ 
    title: 'My Dashboard',
    activeTab: 'home',
    data: ['Item 1', 'Item 2', 'Item 3'],
    
    // Methods
    setTab(tab: string) {
      this.activeTab = tab;
    },
    addItem() {
      this.data.push(`Item ${this.data.length + 1}`);
    }
  });

  // Snippets for granular updates
  const Header = snippet(() => (
    <h1 style={{ margin: 0 }}>{state.title}</h1>
  ), 'Header');
  
  const Sidebar = snippet(() => (
    <nav style={{ padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
      <button onClick={() => state.setTab('home')} style={{ display: 'block', marginBottom: '8px' }}>Home</button>
      <button onClick={() => state.setTab('settings')} style={{ display: 'block' }}>Settings</button>
      <p style={{ marginTop: '12px', fontSize: '12px' }}>Active: {state.activeTab}</p>
    </nav>
  ), 'Sidebar');
  
  const Content = snippet(() => (
    <ul>
      {state.data.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  ), 'Content');

  // Static layout - never re-renders
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#4CAF50', color: '#fff' }}>
        <Header />
      </div>
      <div style={{ display: 'flex', minHeight: '200px' }}>
        <div style={{ width: '150px', borderRight: '1px solid #ddd' }}>
          <Sidebar />
        </div>
        <div style={{ flex: 1 }}>
        <main style={{ padding: '10px' }}>
          <h2>Content Area</h2>
          <Content />
          <button onClick={() => state.addItem()}>Add Item</button>
        </main>
        </div>
      </div>
    </div>
  );
}, 'Dashboard');

export default Dashboard;
```

:::

**Benefits:**
- **Performance**: Only specific parts (Header, Content) re-render when state changes. The layout `div`s never re-render.
- **Organization**: Keeps rendering logic modular and easy to read.
- **Separation**: Clearly separates static structure from reactive content.
