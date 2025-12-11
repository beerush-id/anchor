---
title: "Mutable State"
description: "Learn how to use standard JavaScript objects as reactive state."
keywords:
  - mutable
  - reactivity
  - state management
---

# Mutable State

State in Anchor behaves like standard JavaScript objects. You read properties to get data, and you assign specific values to update them. This relies on the concept of **Direct Mutation**.

To enable this reactive behavior on a plain object, you wrap it to create a reactive proxy.

## Defining State

You can define a reactive state object by wrapping any plain JavaScript object or array. This wrapper intercepts operations to trigger UI updates automatically.

```ts
import { mutable } from '@anchorlib/react';

// Define the state shape
const user = mutable({
  name: 'John',
  age: 30
});
```

### Primitives

For primitive values (string, number, boolean) which are passed by value in JavaScript, the state is wrapped in a reference object with a `.value` property.

```ts
const count = mutable(0);
console.log(count.value); // 0
```

## Updating State

Because the state is mutable, you update it using standard JavaScript assignment operators. There is no need for special setter functions.

```ts
// Standard assignment triggers reactivity
user.name = 'Jane';
user.age++;

// Array methods work as expected
const todos = mutable([]);
todos.push('New Item');
```

## Computed Logic

You can include derived data logic directly within your state object using standard **JavaScript Getters**. These properties automatically track the data they depend on and re-evaluate when that data changes.

```ts
const cart = mutable({
  price: 10,
  quantity: 2,
  
  // This property is automatically reactive
  get total() {
    return this.price * this.quantity;
  }
});

console.log(cart.total); // 20
cart.price = 20;
console.log(cart.total); // 40
```

## Encapsulation

You can group related state and the methods that modify it into a single object. This encapsulates your business logic, making it easier to test and reuse.

```ts
const counter = mutable({
  count: 0,
  
  // Methods modify the state directly via 'this'
  increment() {
    this.count++;
  },
  decrement() {
    this.count--;
  }
});

counter.increment();
```

## Configuration

You can configure the behavior of the reactive wrapper by passing an options object.

```ts
const state = mutable({ ... }, options);
```

### Schema Validation

You can enforce data integrity by providing a validation schema (like Zod). Use this to ensure that your mutable state always adheres to a specific shape or type rules.

```ts
import { z } from 'zod';

const user = mutable({ name: 'John' }, {
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
Group related data and behavior. Instead of scattering separate variables (`name`, `age`), use a single `user` object. This keeps your application logic organized and portable.

### Separation of Concerns
For complex logic, define your state objects in dedicated files ("Stores") rather than inside UI components. This allows you to test your state logic independently of the view layer.
