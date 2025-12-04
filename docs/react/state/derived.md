---
title: "Derived State"
description: "Learn how to use derived() to create computed state that automatically updates."
keywords:
  - derived state
  - computed
  - derived()
---

# Derived State

Derived state is state that is computed from other reactive state. It automatically updates whenever its dependencies change.

## `derived()`

Use the `derived()` function to create a read-only reactive value based on a computation function. This is useful for creating new state based on existing state without modifying the original objects.

```tsx
import { mutable, derived } from '@anchorlib/react';

const state = mutable({
  firstName: 'Jane',
  lastName: 'Doe'
});

// Automatically updates when firstName or lastName changes
const fullName = derived(() => `${state.firstName} ${state.lastName}`);

// Usage
console.log(fullName.value); // "Jane Doe"
```

## External vs. In-Place Derivation

Anchor supports two ways to create derived state: **External** (using `derived()`) and **In-Place** (using Getters).

### 1. In-Place Derivation (Getters)
Use standard JavaScript getters when the derived value **conceptually belongs to the object**. This keeps the data and its computed properties together (Encapsulation).

```ts
const cart = mutable({
  price: 10,
  quantity: 2,
  // ✅ "Total" is an intrinsic property of the cart
  get total() {
    return this.price * this.quantity;
  }
});
```

**Best for:**
- Domain logic (e.g., `User.fullName`, `Cart.total`).
- Properties that should always travel with the object.

### 2. External Derivation (`derived()`)
Use `derived()` when you need to **combine multiple independent states** or create **view-specific transformations**.

```ts
const todos = mutable([...]);
const filter = mutable('active');

// ✅ "Filtered Todos" is a view concern, not a property of the todo list itself
const visibleTodos = derived(() => {
  if (filter.value === 'active') return todos.filter(t => !t.completed);
  return todos;
});
```

**Best for:**
- Combining state from different sources (e.g., `User` + `Settings`).
- UI-specific logic (e.g., `isSubmitEnabled`, `filteredList`).
- When you can't or don't want to modify the original state object.

## Characteristics

- **Automatic Dependency Tracking**: You don't need to declare dependencies. Anchor detects which signals are accessed inside the function.
- **Lazy Evaluation**: Derived values are typically evaluated lazily (when accessed) or when their dependencies change, ensuring efficiency.
- **Read-Only**: The returned object is a `DerivedRef` which exposes a `.value` property. You cannot set it directly.
