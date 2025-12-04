# State Management

Anchor provides a universal, fine-grained reactivity system that works both inside and outside of React. It allows you to manage state using **standard JavaScript objects** while gaining powerful reactivity features.

## The Problem

In standard JavaScript, objects are passive containers.
- **Mutation is silent**: `obj.count++` updates the value, but the rest of your application doesn't know it happened.
- **Getters are limited**: `get count()` can compute values, but it can't automatically re-evaluate when its underlying data changes.

To build reactive UIs, libraries often force you into restrictive patterns:
- **Immutability**: "Don't change the object, create a new one." (React `useState`, Redux). This introduces "Copy-on-Write" overhead and disconnects state from logic.
- **Special Setters**: `this.setState({ ... })` or `store.update(...)`. This adds boilerplate and makes code harder to read.

## The Anchor Solution

Anchor solves this by acting as a **Gateway** to your data. It wraps your native JavaScript objects in a transparent Proxy.

- **Just JavaScript**: You read and write properties normally (`state.count++`).
- **Stable References**: The underlying object remains the same. No cloning, no garbage collection churn.
- **Automatic Reactivity**: The gateway intercepts operations to track dependencies and trigger updates automatically.

## Philosophy

### 1. Universal Reactivity
State in Anchor is not tied to the React component tree. You define your business logic and state containers (stores) using plain TypeScript functions. These "Headless States" can be tested in isolation and consumed by any UI layer (React, Vue, or Vanilla JS).

### 2. The Gateway Pattern
Because Anchor state is just a gateway, it enables both **true mutability** and **true immutability** on the same data.

- **Mutable Gateway**: Allows direct modification (`mutable()`).
- **Immutable Gateway**: Provides a read-only view of the same data (`immutable()`).
- **Zero Overhead**: Since the underlying data isn't cloned, there is no performance penalty for managing large or complex state objects.

### 3. Separation of State and View
By decoupling state logic from component rendering, Anchor encourages a clean architecture:
- **State Logic**: Defined in "Headless" factories (e.g., `createTab`). Handles data, validation, and methods.
- **View Components**: Defined in `setup` functions. Handles rendering and event binding.

## How It Works

### The `mutable` Primitive
The core of Anchor's state is the `mutable` function. It creates the reactive gateway.

#### Primitives
For simple values (string, number, boolean), `mutable` returns a `MutableRef` object with a `.value` property.

```ts
const count = mutable(0);
console.log(count.value); // 0
count.value++; // Triggers updates
```

#### Objects
For objects and arrays, `mutable` returns a reactive **Proxy**. You can access and modify properties directly.

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

- [Mutable State](/react/state/mutable) - Deep dive into creating and modifying reactive state.
- [Immutable State](/react/state/immutable) - Working with read-only state references.
- [Derived State](/react/state/derived) - Creating computed values that update automatically.
