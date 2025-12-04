---
title: "Mutable State"
description: "Learn how to use mutable() to create reactive state in Anchor."
keywords:
  - mutable
  - reactivity
  - state management
---

# Mutable State

`mutable()` is the primary way to create reactive state in Anchor. It wraps a standard JavaScript object in a proxy, enabling deep reactivity, computed properties, and direct mutation.

## Creating State

You can create mutable state with any JavaScript object, array, or primitive.

```ts
import { mutable } from '@anchorlib/react';

// Object
const user = mutable({ name: 'John', age: 30 });

// Array
const todos = mutable([{ id: 1, text: 'Buy milk' }]);

// Primitive (returns a ref)
const count = mutable(0);
```

## Features

### Direct Mutation
Unlike React's `useState`, you don't need setter functions. Just modify the object directly.

```ts
user.name = 'Jane';
todos.push({ id: 2, text: 'Walk dog' });
count.value++;
```

### Computed Properties (Getters)
You can use standard JavaScript getters to create derived state. These getters are automatically tracked and re-evaluated when their dependencies change.

```ts
import { mutable, effect } from '@anchorlib/react';

const cart = mutable({
  price: 10,
  quantity: 2,
  // Automatically updates when price or quantity changes
  get total() {
    return this.price * this.quantity;
  }
});

effect(() => {
  console.log(cart.total); // Logs 20, then 30
});

cart.quantity = 3;
```

### Encapsulated Logic (Methods)
You can define methods directly on your state object to encapsulate business logic. This keeps your state self-contained and testable.

```ts
const counter = mutable({
  count: 0,
  increment() {
    this.count++;
  },
  decrement() {
    this.count--;
  }
});

// Usage
counter.increment();
```

### Deep Reactivity
`mutable` is deep by default. Nested objects and arrays are automatically wrapped in proxies when accessed.

```ts
const state = mutable({
  settings: {
    theme: {
      mode: 'light'
    }
  }
});

// This triggers updates for anything listening to 'mode'
state.settings.theme.mode = 'dark';
```

## Advanced Options

You can pass an options object as the second argument to `mutable()` to configure its behavior.

```ts
const state = mutable(initialValue, options);
```

### Schema Validation
You can provide a Zod schema to validate the state during initialization and updates.

> [!NOTE]
> Anchor favors graceful error handling. If a validation error occurs, it **logs the error** to the console and **ignores the update**. It does not throw an exception that crashes your app.

```ts
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0)
});

const user = mutable({ name: 'John', age: 30 }, { schema: UserSchema });

// This logs an error and ignores the update
user.age = -5;
console.log(user.age); // 30
```

#### Handling Validation Errors
You can use the `exception()` API to listen for validation errors programmatically.

```ts
import { exception } from '@anchorlib/react';

exception(user, (event) => {
  console.error('Validation failed:', event.error);
});
```

> [!WARNING]
> **UX Consideration**: Binding inputs directly to schema-validated state can cause issues. For example, if you validate `z.string().email()`, the user won't be able to type the first character because "a" is not a valid email.
>
> **Best Practice**: Use a separate "draft" state for form inputs and validate only on submit or blur, or use a schema that allows partial input during editing.

### Recursive Strategy
Control how deep the reactivity goes.
- `true` (default): Deeply reactive. All nested objects/arrays are proxied.
- `false`: Shallow reactivity. Only top-level properties are tracked.
- `'flat'`: Special mode for arrays. Only mutations to the array itself (push, pop, etc.) trigger updates. Item property changes are ignored. Useful for large lists where you only care about structure changes.

```ts
// Flat array - only tracks list changes, not item changes
const list = mutable([{ id: 1 }], { recursive: 'flat' });
```

### Ordered Arrays
For arrays that need to stay sorted, you can enable `ordered` mode and provide a `compare` function.

- `ordered`: Set to `true` to enable auto-sorting.
- `compare`: A comparison function (like `Array.prototype.sort` expects).

> [!tip] Implementation Detail
> Anchor uses **Binary Search** to find the correct insertion index. This ensures that `push()` operations remain efficient ($O(\log n)$) even for large arrays.

When enabled, `push` and other mutations will automatically insert items at the correct position to maintain order.

```ts
const scores = mutable([10, 5, 8], {
  ordered: true,
  compare: (a, b) => a - b
});

console.log(scores); // [5, 8, 10]

scores.push(7);
console.log(scores); // [5, 7, 8, 10] - Automatically sorted
```

## When to Use

Use `mutable` when you have **Predictable State**.

- **Safe to Mutate**: You know exactly who consumes the state and when it updates.
- **Predictable**: Since you control the mutations, your application logic remains easy to follow.
- **Local or Specific**: Ideal for component-local state or specific feature stores where ownership is clear.

> [!WARNING] Shared State
> For state that is shared across many components (like global settings or theme configuration), prefer using [**Immutable State**](/react/state/immutable). This prevents accidental mutations from unknown sources and ensures a single source of truth.

## Best Practices

### Group Related State
Instead of creating many separate mutable primitives, group related state into a single object.

```ts
// ❌ Avoid
const name = mutable('John');
const age = mutable(30);
const isAdmin = mutable(false);

// ✅ Prefer
const user = mutable({
  name: 'John',
  age: 30,
  isAdmin: false
});
```

### Use Methods for Actions
Define actions as methods on the state object rather than standalone functions. This makes the state portable and self-documenting.

```ts
// ✅ Prefer
const todoList = mutable({
  items: [],
  add(text) {
    this.items.push({ id: Date.now(), text });
  }
});
```

### Keep Complex Logic "Headless"
For complex application logic or shared state, define your state factories outside of components (e.g., in a `states/` folder). This allows you to test your logic in isolation without rendering any UI.

```ts
// states/cart.ts
export function createCart() {
  return mutable({
    items: [],
    get total() { ... },
    addItem(item) { ... }
  });
}
```

> [!tip] Local State
> For simple, component-specific state (like a single input value or a toggle), it's perfectly fine to create `mutable` state directly inside your component. You don't need a separate factory for everything.
