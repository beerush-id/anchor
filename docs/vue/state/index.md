# State Management

This system provides a universal, fine-grained reactivity system that works both inside and outside of Vue. It allows you to manage state using **standard JavaScript objects** while gaining powerful reactivity features.

## The Problem

In standard JavaScript, objects are passive containers.
- **Mutation is silent**: `obj.count++` updates the value, but the rest of your application doesn't know it happened.
- **Getters are limited**: `get count()` can compute values, but it can't automatically re-evaluate when its underlying data changes.

To build reactive UIs, libraries often force you into restrictive patterns:
- **Immutability**: "Don't change the object, create a new one." (React `useState`, Redux). This introduces overhead and disconnects state from logic.
- **Special Helpers**: Vue's `ref` and `reactive` are powerful but can be disconnected from business logic if not managed carefully.

## The Solution

We solve this by **Transparently Upgrading** your data to be reactive using `anchorRef`. The system wraps your native JavaScript objects in a transparent Proxy inside a Vue Ref.

- **Just JavaScript**: You read and write properties normally (`state.value.count++`).
- **Stable References**: The underlying object remains the same.
- **Automatic Reactivity**: The proxy intercepts operations to track dependencies and trigger updates automatically.

## Philosophy

### 1. Universal Reactivity
State in this architecture is not tied to the Vue component tree. You define your business logic and state containers (stores) using plain TypeScript functions. These "Headless States" can be tested in isolation and consumed by any UI layer.

### 2. Unified Access Model
Because the system manages data access via proxies, it enables both **true mutability** and **true immutability** on the same data source.

- **Mutable Access**: Allows direct modification.
- **Immutable Access**: Provides a read-only view of the same data.

### 3. Separation of State and View
By decoupling state logic from View rendering, we encourage a clean architecture:
- **State Logic**: Defined in the Logic Layer or in "Headless" factories. Handles data, validation, and methods.
- **View**: Defined in the Presentation Layer using Vue Components. Handles rendering and event binding.

## How It Works

### Creating Reactive Data
You can make any standard JavaScript object, array, or primitive reactive using `anchorRef`. This "upgrades" the data to automatically notify the UI when it changes.

#### Primitives
For simple values (string, number, boolean), `anchorRef` behaves like a Vue `ref`.

```ts
const count = anchorRef(0);
console.log(count.value); // 0
count.value++; // Triggers updates
```

#### Objects
For objects and arrays, `anchorRef` wraps the object in a reactive Proxy inside the Ref.

```ts
const user = anchorRef({ name: 'John', age: 30 });
user.value.age++; // Triggers updates for 'age' observers
```

### Headless State Pattern
Complex state logic is often defined in a factory function that returns an anchor ref. This is the "Headless" pattern.

```ts
// states/counter.ts
export function createCounter() {
  return anchorRef({
    count: 0,
    increment() {
      this.count++;
    }
  });
}
```

## Learn More

- [Mutable State](/vue/state/mutable) - Deep dive into creating and modifying reactive state.
- [Immutable State](/vue/state/immutable) - Working with read-only state references.
- [Derived State](/vue/state/derived) - Creating computed values that update automatically.
