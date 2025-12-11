---
title: "Derived State"
description: "Understanding the concept of computed state and single source of truth in Svelte."
keywords:
  - derived state
  - computed
  - single source of truth
  - svelte
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
import { mutable, derived } from '@anchorlib/svelte';

const todos = mutable([{ text: 'Buy milk', done: false }]);
const filter = mutable('SHOW_ALL');

// This value is computed from two independent sources: 'todos' and 'filter'
const visibleTodos = derived(() => {
  if (filter.value === 'SHOW_COMPLETED') return todos.filter(t => t.done);
  return todos;
});
```

### Characteristics

- **Automatic Dependency Tracking**: The system automatically detects which state properties are accessed during computation. You do not need dependency arrays.
- **Read-Only**: Derived values flow one way (Data -> View). You cannot manually assign a value to a derived property.
- **Lazy Evaluation**: Computations are optimized to only re-run when necessary.

## Choosing an Approach

| Pattern | Implementation | Best For |
| :--- | :--- | :--- |
| **Intrinsic** | JavaScript Getter | Domain logic (`User.fullName`) and encapsulation. |
| **Composite** | `derived()` function | Combining separate states (`Search` + `List`) or View Models. |
