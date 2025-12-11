---
title: "Mutable State"
description: "Learn how to use standard JavaScript objects as reactive state in Vue."
keywords:
  - mutable
  - reactivity
  - state management
  - vue
  - anchorRef
---

# Mutable State

State in Anchor behaves like standard JavaScript objects. You read properties to get data, and you assign specific values to update them. This relies on the concept of **Direct Mutation**.

To enable this reactive behavior on a plain object and integrate it with Vue's reactivity system, you use `anchorRef`.

## Defining State

You can define a reactive state object by wrapping any plain JavaScript object or array using `anchorRef`. This creates a Vue Ref that contains your reactive state.

```ts
import { anchorRef } from '@anchorlib/vue';

// Define the state shape
const user = anchorRef({
  name: 'John',
  age: 30
});
```

### Primitives

For primitive values (string, number, boolean), `anchorRef` behaves like a standard Vue `ref`, storing the value in `.value`.

```ts
const count = anchorRef(0);
console.log(count.value); // 0
```

## Updating State

Because the state is mutable, you update it using standard JavaScript assignment operators.

```ts
// Standard assignment triggers reactivity
user.value.name = 'Jane';
user.value.age++;

// Array methods work as expected
const todos = anchorRef([]);
todos.value.push('New Item');
```

## Computed Logic

You can include derived data logic directly within your state object using standard **JavaScript Getters**. These properties automatically track the data they depend on and re-evaluate when that data changes.

```ts
const cart = anchorRef({
  price: 10,
  quantity: 2,
  
  // This property is automatically reactive
  get total() {
    return this.price * this.quantity;
  }
});

console.log(cart.value.total); // 20
cart.value.price = 20;
console.log(cart.value.total); // 40
```

## Encapsulation

You can group related state and the methods that modify it into a single object. This encapsulates your business logic, making it easier to test and reuse.

```ts
const counter = anchorRef({
  count: 0,
  
  // Methods modify the state directly via 'this'
  increment() {
    this.count++;
  },
  decrement() {
    this.count--;
  }
});

counter.value.increment();
```

## Configuration

You can configure the behavior of the reactive wrapper by passing an options object.

```ts
const state = anchorRef({ ... }, options);
```

### Schema Validation

You can enforce data integrity by providing a validation schema (like Zod). Use this to ensure that your mutable state always adheres to a specific shape or type rules.

```ts
import { z } from 'zod';

const user = anchorRef({ name: 'John' }, {
  schema: z.object({ name: z.string() })
});
```

### Reactivity Depth

By default, the state is **Deeply Reactive** (recursive). Accessing nested objects automatically wraps them. You can opt-out of this for performance with large datasets using the `recursive` option.

- `true` (Default): Deeply reactive.
- `false`: Shallow reactivity.
- `'flat'`: Array structure tracking only (good for large lists where items don't change).

## Best Practices

### Use Object-Oriented State
Group related data and behavior. Instead of scattering separate refs (`name`, `age`), use a single `user` object with `anchorRef`. This keeps your application logic organized and portable.

### Separation of Concerns
For complex logic, define your state objects in dedicated files ("Stores") rather than inside UI components.
