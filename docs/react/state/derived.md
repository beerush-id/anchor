---
title: "Derived State"
description: "Understanding the concept of computed state and single source of truth."
keywords:
  - derived state
  - computed
  - single source of truth
---

# Derived State

A core principle of robust state management is the **Single Source of Truth**. You should not store data that can be computed from other data. Storing redundant blocks of state leads to synchronization bugs.

Derived state ensures that your data is always consistent by automatically recalculating values whenever the underlying dependencies change.

## Intrinsic Computation

When a computed value belongs logically to a specific object, use standard **JavaScript Getters**. This keeps the data and its computation encapsulated together.

This is the most common form of derivation in Anchor.

```ts
const cart = mutable({
  price: 10,
  quantity: 2,
  
  // The 'total' is a property of the cart, derived from its other properties.
  get total() {
    return this.price * this.quantity;
  }
});

console.log(cart.total); // 20
```

## Composite Computation

Sometimes, a value depends on multiple *separate* state sources that do not share a common parent object. Or, you may need to transform data for a specific UI view (like a View Model) without modifying the original domain object.

In these cases, you define a **Reactive Computation** that combines these sources.

```ts
import { mutable, derived } from '@anchorlib/react';

const todos = mutable([{ text: 'Buy milk', done: false }]);
const filter = mutable('SHOW_ALL');

// This value is computed from two independent sources: 'todos' and 'filter'
const visibleTodos = derived(() => {
  if (filter.value === 'SHOW_COMPLETED') return todos.filter(t => t.done);
  return todos;
});
```

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, mutable, derived, snippet } from '@anchorlib/react';

export const FilteredTodos = setup(() => {
  const todos = mutable([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true },
    { id: 3, text: 'Write code', done: false },
    { id: 4, text: 'Read book', done: true }
  ]);
  
  const filter = mutable<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const visibleTodos = derived(() => {
    if (filter.value === 'COMPLETED') return todos.filter(t => t.done);
    if (filter.value === 'ACTIVE') return todos.filter(t => !t.done);
    return todos;
  });

  const stats = derived(() => ({
    total: todos.length,
    completed: todos.filter(t => t.done).length,
    active: todos.filter(t => !t.done).length
  }));

  // Snippet for filter buttons (updates when filter or stats change)
  const FilterButtons = snippet(() => (
    <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
      <button 
        onClick={() => filter.value = 'ALL'}
        style={{ 
          flex: 1, padding: '8px', cursor: 'pointer',
          background: filter.value === 'ALL' ? '#4CAF50' : '#f5f5f5',
          color: filter.value === 'ALL' ? 'white' : 'black',
          border: '1px solid #ddd', borderRadius: '4px'
        }}
      >
        All ({stats.value.total})
      </button>
      <button 
        onClick={() => filter.value = 'ACTIVE'}
        style={{ 
          flex: 1, padding: '8px', cursor: 'pointer',
          background: filter.value === 'ACTIVE' ? '#2196F3' : '#f5f5f5',
          color: filter.value === 'ACTIVE' ? 'white' : 'black',
          border: '1px solid #ddd', borderRadius: '4px'
        }}
      >
        Active ({stats.value.active})
      </button>
      <button 
        onClick={() => filter.value = 'COMPLETED'}
        style={{ 
          flex: 1, padding: '8px', cursor: 'pointer',
          background: filter.value === 'COMPLETED' ? '#FF9800' : '#f5f5f5',
          color: filter.value === 'COMPLETED' ? 'white' : 'black',
          border: '1px solid #ddd', borderRadius: '4px'
        }}
      >
        Completed ({stats.value.completed})
      </button>
    </div>
  ), 'FilterButtons');

  // Snippet for todo list (updates only when visibleTodos changes)
  const TodosList = snippet(() => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {visibleTodos.value.map(todo => (
        <li key={todo.id} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox"
            checked={todo.done}
            onChange={() => todo.done = !todo.done}
          />
          <span style={{ flex: 1, textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#999' : '#333' }}>
            {todo.text}
          </span>
        </li>
      ))}
      {visibleTodos.value.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          No {filter.value.toLowerCase()} todos
        </div>
      )}
    </ul>
  ), 'TodosList');

  // Static layout
  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Filtered Todo List</h3>
      <FilterButtons />
      <TodosList />
      <div style={{ marginTop: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '4px', fontSize: '14px' }}>
        <strong>How it works:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li><code>visibleTodos</code> is derived from both <code>todos</code> and <code>filter</code></li>
          <li>When either changes, <code>visibleTodos</code> automatically recalculates</li>
          <li>No manual dependency tracking needed!</li>
        </ul>
      </div>
    </div>
  );
}, 'FilteredTodos');

export default FilteredTodos;
```

:::

### Characteristics

- **Automatic Dependency Tracking**: The system automatically detects which state properties are accessed during computation. You do not need dependency arrays.
- **Read-Only**: Derived values flow one way (Data -> View). You cannot manually assign a value to a derived property.
- **Lazy Evaluation**: Computations are optimized to only re-run when necessary.

## Choosing an Approach

| Pattern | Implementation | Best For |
| :--- | :--- | :--- |
| **Intrinsic** | JavaScript Getter | Domain logic (`User.fullName`) and encapsulation. |
| **Composite** | `derived()` function | Combining separate states (`Search` + `List`) or View Models. |
