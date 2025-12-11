---
title: "Binding & Refs"
description: "Working with DOM elements and reactive bindings in Anchor."
keywords:
  - nodeRef
  - binding
  - refs
  - reactive attributes
  - state binding
---

# Binding & Refs

In Anchor, "Binding" refers to two things:
1.  **State Binding**: Synchronizing state between components (Parent <-> Child).
2.  **DOM Binding**: Synchronizing state with DOM elements (Attributes, Events).

## State Binding

State binding allows you to synchronize your component's internal state with **any external reactive source** (props, global state, or other signals).

### 1. One-Way Synchronization
To sync internal state with **External State** (props, global state, or other signals), use an `effect`. This ensures your component reacts to changes from the outside world while maintaining its own local logic.

```tsx
export const Tab = setup((props: { value?: string }) => {
  const state = mutable({ active: '' });

  // Sync: When props.value changes, update internal state
  effect(() => {
    if (props.value !== undefined) {
      state.active = props.value;
    }
  });

  return render(() => <div>{state.active}</div>);
});
```

### 2. Two-Way Binding
Anchor supports true two-way binding between components. If a parent passes a **Binding Reference**, the child can update the parent's state by simply assigning to the prop.

#### Parent Component
Use the `bind()` helper to pass a reference to a mutable property.

```tsx
import { setup, mutable, bind, render } from '@anchorlib/react';
import { Counter } from './Counter';

export const App = setup(() => {
  const state = mutable({ count: 0 });

  return render(() => (
    // Pass a binding to 'state.count'
    <Counter value={bind(state, 'count')} />
  ));
});
```

#### Child Component
The child component doesn't need to know it received a binding. It just assigns to the prop.

```tsx
export const Counter = setup((props: { value: number }) => {
  const increment = () => {
    // If 'value' is a binding, this updates the PARENT's state!
    props.value++; 
  };

  return render(() => (
    <button onClick={increment}>
      Count: {props.value}
    </button>
  ));
});
```

## DOM Binding

DOM Binding is used to bind state to DOM elements. It handles both accessing the element and efficiently updating its attributes.

### Accessing DOM Elements
Use `nodeRef` to get a handle on a DOM node. You can access the node directly inside the factory function when it becomes available.

```tsx
const inputRef = nodeRef<HTMLInputElement>((node) => {
  // This runs when the node is mounted
  if (node) node.focus();
});

return render(() => <input ref={inputRef} />);
```

### Reactive Attributes
Pass a factory function to `nodeRef` to create **Reactive Attributes**. These update the DOM directly when state changes, bypassing the React render cycle for high performance.

```tsx
// Ideally used for containers to avoid re-rendering children
const panelRef = nodeRef(() => ({
  className: state.activeTab === 'home' ? 'active' : 'hidden',
  'aria-hidden': state.activeTab !== 'home'
}));

return render(() => (
  // Changing class/attributes here won't re-render <HeavyContent />
  <div ref={panelRef} {...panelRef.attributes}>
    <HeavyContent />
  </div>
));
```

### Event Handlers in `nodeRef`
You can include event handlers in the `nodeRef` factory, but they are **only used for initial hydration** by React. They are **ignored** during reactive updates.

```tsx
const btnRef = nodeRef(() => ({
  className: state.active ? 'active' : '',
  onClick: () => console.log('Clicked') // Passed to React via {...btnRef.attributes}
}));

// The onClick is static. Changing it later in the factory won't update the listener.
```

> [!TIP]
> Event handlers in `nodeRef` are safe for **React Server Components (RSC)** because they are automatically stripped out during server rendering.

## Creating Binding References

You can create a **Binding Reference** that can be passed to components for two-way binding.

It supports two types of state:
1.  **Mutable Object**: `bind(object, key)`
2.  **Mutable Ref**: `bind(ref)`

```tsx
const state = mutable({ text: '' });
const count = mutable(0);

// 1. Bind to object property
<TextInput value={bind(state, 'text')} />

// 2. Bind to mutable ref directly
<Counter value={bind(count)} />
```

## Bindable Interfaces

You can create a bindable state that stays synchronized with a source object (like `props`). This is useful for creating components that can be both controlled and uncontrolled, or simply to normalize props into a mutable interface.

```tsx
import { setup, bindable, render } from '@anchorlib/react';

export const TextInput = setup((props: { value?: string }) => {
  // 1. Create a local ref 'text'
  // 2. Initialize it with '' (fallback if props.value is undefined)
  // 3. Sync it with props.value
  const text = bindable('', props, 'value');

  return render(() => (
    <input
      value={text.value}
      onInput={(e) => text.value = e.currentTarget.value}
    />
  ));
});
```

In this example:
-   If `props.value` changes (parent updates), `text.value` updates automatically.
-   If user types, `text.value` updates, which propagates to `props.value`.
    -   If `props.value` was passed via `bind()`, the parent state updates!
    -   If `props.value` was a plain string, it just updates the local prop proxy (no-op for parent).

## Best Practices

### Avoid Binding to Immutable State
Never use `bind()` with an `immutable` state object. While Anchor will detect this and warn you, it's a bad practice.

```tsx
const state = immutable({ count: 0 });

// ❌ WRONG: Cannot bind to immutable state
<Counter value={bind(state, 'count')} />
```

If you need to share state that can be updated by children, use `mutable` or provide a specific `writable` contract.

### Prefer One-Way for Complex Logic
Two-way binding (`bind`) is excellent for form inputs and simple settings. However, for complex business logic, explicit event handlers (One-Way Data Flow) are often easier to debug and reason about.

```tsx
// ✅ Good for simple inputs
<TextInput value={bind(state, 'name')} />

// ✅ Better for complex logic
<ComplexWidget 
  value={state.data} 
  onChange={(newData) => {
    validate(newData);
    state.data = newData;
  }} 
/>
```

### Use `nodeRef` for High Frequency Updates
Because `nodeRef` attributes update the DOM directly (bypassing React's render cycle), they are ideal for high-frequency updates like animations, scroll positions, or drag-and-drop interactions.

```tsx
// Updates style directly without re-rendering the component
const boxRef = nodeRef(() => ({
  style: { transform: `translateX(${state.x}px)` }
}));
```

### When to Use `nodeRef`
Don't use `nodeRef` for everything. React's virtual DOM is fast enough for most cases.

-   **✅ Use `nodeRef` for Containers**: If you have a component wrapping a large tree (like a `TabContent` or `Layout`), use `nodeRef` to toggle classes or styles. This avoids re-rendering the entire children tree just to change a class name.
-   **✅ Use `nodeRef` for Performance**: For high-frequency updates (animations, drag-and-drop).
-   **❌ Avoid for Leaf Components**: Using `nodeRef` for a simple `Button` or `Input` is usually overengineering. Standard JSX binding is simpler and fine for these cases.
