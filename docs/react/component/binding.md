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

There are two fundamental ways to pass data to components:

### Pass-by-Value
When you pass a value directly, the child component receives a **copy** of the value. If the state changes, the parent must re-render to pass the new value.

```tsx
<Input value={state.value} />
```

This requires the parent view to re-render every time `state.value` changes to provide the new value to the `Input` component.

### Pass-by-Reference
When you use Anchor's binding, the child component receives a **reference** to the state. The component can read changes directly without requiring the parent to re-render.

```tsx
<Input value={$use(state, 'value')} />
```

This is pass-by-reference. The `Input` component reads a reference, so it can self-update when the value changes. The parent can stay static and doesn't need to re-render.

> [!TIP] Tips
> If the key is `'value'`, it can be omitted: `$use(state)` is equivalent to `$use(state, 'value')`.

> [!WARNING] Important!
> Binding only works with **Components** (created with `setup()`), **Templates** (created with `template()`), and **Snippets** (created with `snippet()`).

## One-Way Binding

Use `$use()` to create a **one-way data binding**. Updates in the state will be propagated to the prop, but changes to the prop won't affect the original state.

```tsx
import { setup, mutable, $use } from '@anchorlib/react';
import { Display } from './Display';

export const App = setup(() => {
  const state = mutable({ count: 0 });

  return (
    <div>
      <button onClick={() => state.count++}>Increment</button>
      <Display value={$use(state, 'count')} />
    </div>
  );
});
```

The child component receives the value and can update itself when it changes:

```tsx
import { template } from '@anchorlib/react';

export const Display = template<{ value: number }>(({ value }) => (
  <div>Current count: {value}</div>
));
```

## Two-Way Binding

In Anchor, components should enhance native element behavior. Native HTML elements like `<input>` are smart—they behave autonomously, showing and updating values as users interact with them, regardless of whether you handle their events.

When you design a component that displays and updates a value, it should work independently. The component manages its own behavior, and parent binding is just a side-effect that allows the parent to react to the component's behavior.

To create two-way data binding, use `$bind()`. It keeps state and prop in sync—updates on either side are propagated to each other.

```tsx
type CounterProps = {
  value: number;
  onChange?: (value: number) => void;
};

export const Counter = setup<CounterProps>((props) => {
  const increment = () => {
    props.value++;
    props.onChange?.(props.value);
  };

  return render(() => (
    <button onClick={increment}>
      Count: {props.value}
    </button>
  ));
});
```

This component works autonomously with all binding patterns:

```tsx
// ✅ One-way pass-by-value
render(() => <Counter value={state.count} />)

// ✅ One-way pass-by-reference
<Counter value={$use(state, 'count')} />

// ✅ Two-way binding
<Counter value={$bind(state, 'count')} />

// ✅ Two-way binding + imperative handling
<Counter value={$bind(state, 'count')} onChange={handleChange} />
```


## Why Binding Matters?

**Native HTML Input** requires imperative handling with boilerplate code that's error-prone:

```js
const input = document.querySelector('input');
input.value = user.name;
input.addEventListener('input', (e) => user.name = e.target.value);
```

**React's Controlled Input** doesn't fix the native's problem—it makes it worse with more boilerplate and is even more error-prone:

```tsx
<input value={state.correctProp} onChange={(e) => setWrongProp(e.target.value)} />
```

This won't tell you there's an error. User can't type in the input because the value never changes. You have to debug it carefully. If the `onChange` is wrapped in a separate function, you need to scroll to check what it does inside.

**Anchor's `$bind()`** provides clear intent:

```tsx
<Input value={$bind(user, 'name')} onChange={validateName} />
```

- `$bind(user, 'name')` immediately tells you it reads and writes to `user.name`
- If you pass the wrong prop, you'll see it immediately because it shows the wrong value before you even make a change
- Binding + imperative handling gives clear intent, separating two-way binding from side-effects


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

Anchor provides two functions for creating binding references:

### `$use()` - One-Way Binding
Creates a **one-way binding** where updates in the state are propagated to the prop.

```tsx
const state = mutable({ text: '' });
const count = mutable(0);

// 1. One-way bind to object property
<Display value={$use(state, 'text')} />

// 2. One-way bind to mutable ref directly
<Display value={$use(count)} />
```

### `$bind()` - Two-Way Binding
Creates a **two-way binding** where state and prop are kept in sync.

```tsx
const state = mutable({ text: '' });
const count = mutable(0);

// 1. Two-way bind to object property
<TextInput value={$bind(state, 'text')} />

// 2. Two-way bind to mutable ref directly
<Counter value={$bind(count)} />
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
    -   If `props.value` was passed via `$bind()`, the parent state updates!
    -   If `props.value` was a plain string, it just updates the local prop proxy (no-op for parent).

## Best Practices

### Avoid Binding to Immutable State
Never use `$bind()` with an `immutable` state object. While Anchor will detect this and warn you, it's a bad practice.

```tsx
const state = immutable({ count: 0 });

// ❌ WRONG: Cannot bind to immutable state
<Counter value={$bind(state, 'count')} />
```

If you need to share state that can be updated by children, use `mutable` or provide a specific `writable` contract.

### Prefer One-Way for Complex Logic
Two-way binding (`$bind()`) is excellent for form inputs and simple settings. However, for complex business logic, explicit event handlers (One-Way Data Flow) are often easier to debug and reason about.

```tsx
// ✅ Good for simple inputs
<TextInput value={$bind(state, 'name')} />

// ✅ Better for complex logic
<ComplexWidget 
  value={$use(state, 'data')}
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
