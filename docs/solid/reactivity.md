---
title: 'Reactivity in Anchor for Solid'
description: "Learn how Anchor integrates with Solid's reactivity system to provide fine-grained updates and optimal performance."
keywords:
  - anchor for solid
  - solid reactivity
  - fine-grained reactivity
  - solid performance
  - anchor reactivity model
---

# Reactivity in Anchor for Solid

Anchor seamlessly integrates with Solid's reactivity system, enhancing it with additional capabilities while maintaining
the fine-grained reactivity that makes Solid so performant.

## How Solid Reactivity Works

Solid's reactivity is based on signals and effects. When you access a signal within a tracking scope (like a component's
render function), Solid automatically tracks that dependency. When the signal updates, only the tracking scopes that
accessed it will re-execute.

## Anchor's Integration

Anchor builds on Solid's reactivity model by setting up automatic tracking when you create reactive references.

### Example

```tsx
import { anchorRef } from '@anchorlib/solid';

const state = anchorRef({
  user: { name: 'John', age: 30 },
  todos: [{ id: 1, text: 'Learn Anchor', completed: false }],
});

const UserName = () => {
  // Only this component will re-render when user.name changes
  return <div>Name: {state.user.name}</div>;
};

const UserAge = () => {
  // Only this component will re-render when user.age changes
  return <div>Age: {state.user.age}</div>;
};

const TodoList = () => {
  // This component will re-render when the todos array changes
  return (
    <ul>
      {state.todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
};
```

## Performance Benefits

Anchor's integration with Solid provides several performance benefits:

1. **Minimal Re-renders**: Only components that access changed properties re-render
2. **Automatic Cleanup**: Observers are automatically cleaned up when components are destroyed
3. **Lazy Initialization**: Nested states are only made reactive when accessed

## Best Practices

### 1. Use Direct Property Access

Access properties directly rather than destructuring to maintain reactivity:

```tsx
// ✅ Good - maintains reactivity
const User = () => {
  return <div>{state.user.name}</div>;
};

// ✅ Good - maintains reactivity
const UserObject = () => {
  const { user } = state;
  return <div>{user.name}</div>;
};

// ❌ Avoid - loses reactivity tracking
const User = () => {
  const { name } = state.user; // Destructuring primitive value will lose reactivity
  return <div>{name}</div>; // Won't update when state.user.name changes
};
```

### 2. Leverage Global State

Use global state for shared data to avoid prop drilling:

```tsx
// Create global state outside components
const globalState = anchorRef({
  user: { name: 'John' },
  theme: 'dark',
});

// Use directly in any component
const Header = () => {
  return <header>Welcome, {globalState.user.name}!</header>;
};
```

### 3. Use Appropriate Ref Types

Choose the right ref type for your use case:

- `anchorRef` - General purpose reactive objects
- `flatRef` - Arrays where you want reactivity on the array itself
- `orderedRef` - Arrays that should maintain sorted order
- `variableRef` - Simple reactive values with getter/setter
- `constantRef` - Read-only reactive values
