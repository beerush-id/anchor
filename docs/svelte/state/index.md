# State Management

This system provides a universal, fine-grained reactivity system that works both inside and outside of Svelte. It allows you to manage state using **standard JavaScript objects** while gaining powerful reactivity features.

## The Problem

In standard JavaScript, objects are passive containers.
- **Mutation is silent**: `obj.count++` updates the value, but the rest of your application doesn't know it happened.
- **Getters are limited**: `get count()` can compute values, but it can't automatically re-evaluate when its underlying data changes.

To build reactive UIs, libraries often force you into restrictive patterns:
- **Immutability**: "Don't change the object, create a new one." (React `useState`, Redux, and Svelte Stores with `update`). This introduces "Copy-on-Write" overhead (or boilerplates) and disconnects state from logic.
- **Special Setters**: `store.update(curr => ...)` or `store.set(...)`. This adds boilerplate and makes code harder to read.

## The Solution

We solve this by **Transparently Upgrading** your data to be reactive. The system wraps your native JavaScript objects in a transparent Proxy.

- **Just JavaScript**: You read and write properties normally (`state.count++`).
- **Stable References**: The underlying object remains the same. No cloning, no garbage collection churn.
- **Automatic Reactivity**: The proxy intercepts operations to track dependencies and trigger updates automatically.

## Philosophy

### 1. Universal Reactivity
State in this architecture is not tied to the Svelte component tree. You define your business logic and state containers (stores) using plain TypeScript functions. These "Headless States" can be tested in isolation and consumed by any UI layer (React, Vue, or Vanilla JS).

### 2. Unified Access Model
Because the system manages data access via proxies, it enables both **true mutability** and **true immutability** on the same data source.

- **Mutable Access**: Allows direct modification.
- **Immutable Access**: Provides a read-only view of the same data.
- **Zero Overhead**: Since the underlying data isn't cloned, there is no performance penalty for managing large or complex state objects.

### 3. Separation of State and View
By decoupling state logic from View rendering, we encourage a clean architecture:
- **State Logic**: Defined in the Logic Layer or in "Headless" factories. Handles data, validation, and methods.
- **View**: Defined in the Presentation Layer using Svelte Components. Handles rendering and event binding.

## How It Works

### Creating Reactive Data
You can make any standard JavaScript object, array, or primitive reactive. This "upgrades" the data to automatically notify the UI when it changes.

#### Primitives
For simple values (string, number, boolean), the system uses a **Reference** object with a `.value` property.

```ts
const count = mutable(0);
console.log(count.value); // 0
count.value++; // Triggers updates
```

#### Objects
For objects and arrays, the system uses a reactive **Proxy**. You can access and modify properties directly.

```ts
const user = mutable({ name: 'John', age: 30 });
user.age++; // Triggers updates for 'age' observers
```

### Headless State Pattern
Complex state logic is often defined in a factory function that returns a mutable object. This is the "Headless" pattern.

```ts
// states/counter.ts
export function createCounter() {
  return mutable({
    count: 0,
    increment() {
      this.count++;
    }
  });
}
```

## Learn More

- [Mutable State](/svelte/state/mutable) - Deep dive into creating and modifying reactive state.
- [Immutable State](/svelte/state/immutable) - Working with read-only state references.
- [Derived State](/svelte/state/derived) - Creating computed values that update automatically.
