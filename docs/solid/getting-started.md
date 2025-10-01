---
title: 'Getting Started with Anchor for Solid'
description: 'A step-by-step guide to getting started with Anchor for Solid. Learn to install, create reactive state, and build high-performance components.'
keywords:
  - anchor for solid tutorial
  - solid state management getting started
  - anchor solid guide
  - anchorRef
  - solid reactive state
  - getting started solid state
---

# Getting Started with Anchor for Solid

This guide will help you get up and running with Anchor in your Solid project. You'll learn how to install Anchor, create reactive state, and integrate it with your Solid components.

## Installation

To begin, install the `@anchorlib/solid` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchorlib/solid
```

```bash [Yarn]
yarn add @anchorlib/solid
```

```bash [pnpm]
pnpm add @anchorlib/solid
```

```bash [Bun]
bun add @anchorlib/solid
```

:::

## Basic Usage

The most common way to create reactive state in Anchor is using the [anchorRef](/solid/api/anchorRef) function. This creates a reactive reference that integrates seamlessly with Solid's reactivity system.

### Your First Reactive Component

To get started, create a component that uses the `anchorRef` function to create a reactive reference:

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

const Counter = () => {
  const counter = anchorRef({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
};

export default Counter;
```

::: details Try it Yourself

::: anchor-solid-sandbox

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

const Counter = () => {
  const counter = anchorRef({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
};

export default Counter;
```

:::

::: tip Key Points:

- **`anchorRef`**: Creates a reactive reference that integrates with Solid's reactivity system
- **Direct Mutation**: You can directly modify state properties (e.g., `counter.count++`)
- **Automatic Updates**: Components automatically re-render when the state they access changes
- **No Providers Needed**: Unlike some state management solutions, Anchor doesn't require context providers

:::

### Computed Property

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

const Counter = () => {
  const state = anchorRef({
    count: 0,
    firstName: 'John',
    lastName: 'Doe',
    // Computed property using getter just works
    get fullName() {
      return `${state.firstName} ${state.lastName}`;
    },
    get doubleCount() {
      return state.count * 2;
    },
  });

  const changeName = () => {
    state.firstName = 'Jane';
    state.lastName = 'Smith';
  };

  return (
    <div>
      <h1>Counter: {state.count}</h1>
      <h1>Double Count: {state.doubleCount}</h1>
      <h1>Full Name: {state.fullName}</h1>
      <button onClick={() => state.count++}>Increment</button>
      <button onClick={() => state.count--}>Decrement</button>
      <button onClick={() => (state.count = 0)}>Reset</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};

export default Counter;
```

::: details Try it Yourself

::: anchor-solid-sandbox

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

const Counter = () => {
  const state = anchorRef({
    count: 0,
    firstName: 'John',
    lastName: 'Doe',
    get fullName() {
      return `${state.firstName} ${state.lastName}`;
    },
    get doubleCount() {
      return state.count * 2;
    },
  });

  const changeName = () => {
    state.firstName = 'Jane';
    state.lastName = 'Doe';
  };

  return (
    <div>
      <h1>Counter: {state.count}</h1>
      <h1>Double Count: {state.doubleCount}</h1>
      <h1>Full Name: {state.fullName}</h1>
      <button onClick={() => state.count++}>Increment</button>
      <button onClick={() => state.count--}>Decrement</button>
      <button onClick={() => (state.count = 0)}>Reset</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};

export default Counter;
```

:::

### Derived State

```tsx /App.tsx [active]
import { anchorRef, observedRef, variableRef } from '@anchorlib/solid';

const Counter = () => {
  const count = variableRef(1);
  const count2 = variableRef(5);
  const counter = anchorRef({ count: 3 });

  // Derived state that automatically updates when any of its dependencies change
  const total = observedRef(() => count.value + count2.value + counter.count);

  return (
    <div>
      <h1>Counter 1: {count.value}</h1>
      <h1>Counter 2: {count2.value}</h1>
      <h1>Counter 3: {counter.count}</h1>
      <h1>Total: {total.value}</h1>
      <button onClick={() => count.value++}>Increment 1</button>
      <button onClick={() => count2.value++}>Increment 2</button>
      <button onClick={() => counter.count++}>Increment 3</button>
    </div>
  );
};

export default Counter;
```

::: details Try it Yourself

::: anchor-solid-sandbox

```tsx /App.tsx [active]
import { anchorRef, observedRef, variableRef } from '@anchorlib/solid';

const Counter = () => {
  const count = variableRef(1);
  const count2 = variableRef(5);
  const counter = anchorRef({ count: 3 });

  // Derived state that automatically updates when any of its dependencies change
  const total = observedRef(() => count.value + count2.value + counter.count);

  return (
    <div>
      <h1>Counter 1: {count.value}</h1>
      <h1>Counter 2: {count2.value}</h1>
      <h1>Counter 3: {counter.count}</h1>
      <h1>Total: {total.value}</h1>
      <button onClick={() => count.value++}>Increment 1</button>
      <button onClick={() => count2.value++}>Increment 2</button>
      <button onClick={() => counter.count++}>Increment 3</button>
    </div>
  );
};

export default Counter;
```

:::

## Global State

For state that needs to be shared across multiple components, you can create the state outside your components:

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

// Global state declared outside your component
const counter = anchorRef({ count: 0 });

const Counter = () => {
  // Work with the state as normally you would
  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
};

export default Counter;
```

::: details Try it Yourself

::: anchor-solid-sandbox

```tsx /App.tsx [active]
import { anchorRef } from '@anchorlib/solid';

// Global state declared outside your component
const counter = anchorRef({ count: 0 });

const Counter = () => {
  // Work with the state as normally you would
  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
};

export default Counter;
```

:::

## Working with Arrays

Anchor provides specialized functions for working with arrays:

### flatRef

For arrays where you want reactivity on the array itself but not on individual elements:

```tsx
import { flatRef } from '@anchorlib/solid';

const todos = flatRef([
  { id: 1, text: 'Learn Anchor', completed: false },
  { id: 2, text: 'Build an app', completed: false },
]);

// Adding an item triggers reactivity
const addTodo = (text) => {
  todos.push({ id: Date.now(), text, completed: false });
};
```

### orderedRef

For arrays that should maintain a specific order:

```tsx
import { orderedRef } from '@anchorlib/solid';

const sortedNumbers = orderedRef([3, 1, 4, 1, 5], (a, b) => a - b);
// Result: [1, 1, 3, 4, 5]
```

## Schema Support

Anchor supports defining schemas for your state, providing runtime validation and better type safety:

```tsx
import { modelRef } from '@anchorlib/solid';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const user = modelRef(UserSchema, { name: 'John', age: 30 });

// This will work
user.name = 'Jane';

// This will throw a validation error at runtime
// user.age = 'not a number'; // Error!
```

## Ref System

Anchor provides a Ref system that gives you more control over reactivity:

### variableRef

Creates a reactive reference with both getter and setter:

```tsx
import { variableRef } from '@anchorlib/solid';

const countRef = variableRef(0);

// Access value
console.log(countRef.value); // 0

// Update value
countRef.value = 42;
```

### constantRef

Creates a read-only reactive reference:

```tsx
import { constantRef } from '@anchorlib/solid';

const readOnlyRef = constantRef(42);

// Access value
console.log(readOnlyRef.value); // 42

// This would cause a TypeScript error:
// readOnlyRef.value = 100; // Error!
```

## API Reference

- [API Reference](/apis/solid/) - Complete documentation of all functions and types

## Next Steps

Now that you've learned the basics of Anchor for Solid, you can explore:

- [Reactivity](/solid/reactivity) - How Anchor's reactivity system works with Solid
- [Immutability](/solid/immutability) - How Anchor provides true immutability
- [State Management](/solid/state-management) - Advanced patterns for managing complex state
