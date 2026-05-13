---
title: "State Management"
description: "Universal, fine-grained reactivity system for modern web applications."
keywords:
  - state management
  - reactivity
  - anchor core
  - proxies
---

# State Management

This system provides a universal, fine-grained reactivity system that works both inside and outside of React and SolidJS. It allows you to manage state using **standard JavaScript objects** while gaining powerful reactivity features.

## The Problem

In standard JavaScript, objects are passive containers.
- **Mutation is silent**: `obj.count++` updates the value, but the rest of your application doesn't know it happened.
- **Getters are limited**: `get count()` can compute values, but it can't automatically re-evaluate when its underlying data changes.

To build reactive UIs, libraries often force you into restrictive patterns:
- **Immutability**: "Don't change the object, create a new one." (React `useState`, Redux). This introduces "Copy-on-Write" overhead and disconnects state from logic.
- **Special Setters**: `this.setState({ ... })` or `store.update(...)`. This adds boilerplate and makes code harder to read.

## The Solution

We solve this by **Transparently Upgrading** your data to be reactive. The system wraps your native JavaScript objects in a transparent Proxy.

- **Just JavaScript**: You read and write properties normally (`state.count++`).
- **Stable References**: The underlying object remains the same. No cloning, no garbage collection churn.
- **Automatic Reactivity**: The proxy intercepts operations to track dependencies and trigger updates automatically.

## Philosophy

### 1. Universal Reactivity
State in this architecture is not tied to the view component tree. You define your business logic and state containers (stores) using plain TypeScript functions. These "Headless States" can be tested in isolation and consumed by any UI layer (React, Solid, or Vanilla JS).

### 2. Unified Access Model
Because the system manages data access via proxies, it enables both **true mutability** and **true immutability** on the same data source.

- **Mutable Access**: Allows direct modification.
- **Immutable Access**: Provides a read-only view of the same data.
- **Zero Overhead**: Since the underlying data isn't cloned, there is no performance penalty for managing large or complex state objects.

### 3. Separation of State and View
By decoupling state logic from View rendering, we encourage a clean architecture:
- **State Logic**: Defined in "Headless" factories or inside component closures (`setup` in React). Handles data, validation, and methods.
- **View**: Defined in the Presentation Layer using JSX. Handles rendering and event binding.

## How It Works

### Creating Reactive Data
You can make any standard JavaScript object, array, or primitive reactive. This "upgrades" the data to automatically notify the UI when it changes.

#### Primitives
For simple values (string, number, boolean), the system uses a **Reference** object with a `.value` property.

::: code-group

```ts [React]
import { mutable } from '@anchorlib/react';

const count = mutable(0);
console.log(count.value); // 0
count.value++; // Triggers updates
```

```ts [SolidJS]
import { mutable } from '@anchorlib/solid';

const count = mutable(0);
console.log(count.value); // 0
count.value++; // Triggers updates
```

:::

#### Objects
For objects and arrays, the system uses a reactive **Proxy**. You can access and modify properties directly.

::: code-group

```ts [React]
import { mutable } from '@anchorlib/react';

const user = mutable({ name: 'John', age: 30 });
user.age++; // Triggers updates for 'age' observers
```

```ts [SolidJS]
import { mutable } from '@anchorlib/solid';

const user = mutable({ name: 'John', age: 30 });
user.age++; // Triggers updates for 'age' observers
```

:::

### Headless State Pattern
Complex state logic is often defined in a factory function that returns a mutable object. This is the "Headless" pattern.

::: code-group

```ts [React]
// states/counter.ts
import { mutable } from '@anchorlib/react';

export function createCounter() {
  return mutable({
    count: 0,
    increment() {
      this.count++;
    }
  });
}
```

```ts [SolidJS]
// states/counter.ts
import { mutable } from '@anchorlib/solid';

export function createCounter() {
  return mutable({
    count: 0,
    increment() {
      this.count++;
    }
  });
}
```

:::

## Learn More

- [Mutable State](/state-management/mutable) - Deep dive into creating and modifying reactive state.
- [Immutable State](/state-management/immutable) - Working with read-only state references.
- [Derived State](/state-management/derived) - Creating computed values that update automatically.
- [Form Handling](/state-management/form-handling) - Validating data with Zod schemas.
- [Side Effects](/state-management/side-effect) - Running code automatically on data changes.
- [Async Handling](/state-management/async-handling) - Loading data and managing asynchronous states.
- [Advanced Patterns](/state-management/advanced) - Architectural guidelines for scoping state.
