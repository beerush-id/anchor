---
title: 'Getting Started with Anchor for Solid'
description: 'A step-by-step guide to getting started with Anchor for Solid. Learn to install, create reactive state, and build high-performance components.'
keywords:
  - anchor for solid tutorial
  - solid state management getting started
  - anchor solid guide
  - mutable
  - solid reactive state
  - getting started solid state
---

# Getting Started with Anchor for Solid

This guide will help you get up and running with Anchor in your Solid project. You'll learn how to install Anchor,
create reactive state, and integrate it with your Solid components.

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

The most common way to create reactive state in Anchor is using the `mutable` function. This creates a reactive reference that integrates seamlessly with Solid's reactivity system.



### Your First Reactive Component

To get started, create a component that uses the `mutable` function to create a reactive reference:

```tsx /App.tsx [active]
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  const counter = mutable({ count: 0 });

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
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  const counter = mutable({ count: 0 });

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

- **`mutable`**: Creates a reactive reference that integrates with Solid's reactivity system
- **Direct Mutation**: You can directly modify state properties (e.g., `counter.count++`)
- **Automatic Updates**: Components automatically re-render when the state they access changes

:::

### Computed Property

```tsx /App.tsx [active]
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  const state = mutable({
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
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  const state = mutable({
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
import { mutable, derived } from '@anchorlib/solid';

const Counter = () => {
  const count = mutable(1);
  const count2 = mutable(5);
  const counter = mutable({ count: 3 });

  // Derived state that automatically updates when any of its dependencies change
  const total = derived(() => count.value + count2.value + counter.count);

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
import { mutable, derived } from '@anchorlib/solid';

const Counter = () => {
  const count = mutable(1);
  const count2 = mutable(5);
  const counter = mutable({ count: 3 });

  // Derived state that automatically updates when any of its dependencies change
  const total = derived(() => count.value + count2.value + counter.count);

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
import { mutable } from '@anchorlib/solid';

// Global state declared outside your component
const counter = mutable({ count: 0 });

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
import { mutable } from '@anchorlib/solid';

// Global state declared outside your component
const counter = mutable({ count: 0 });

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

## Schema Support

Anchor supports defining schemas for your state, providing runtime validation and better type safety:

```tsx
import { mutable } from '@anchorlib/solid';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const user = mutable({ name: 'John', age: 30 }, { schema: UserSchema });

// This will work
user.name = 'Jane';

// This will throw a validation error at runtime
// user.age = 'not a number'; // Error!
```

## API Reference

- [API Reference](/apis/solid/) - Complete documentation of all functions and types

## Next Steps

Now that you've learned the basics of Anchor for Solid, you can explore:

- [Mutable State](/solid/state/mutable) - Deep dive into creating and modifying reactive state
- [Immutable State](/solid/state/immutable) - How Anchor provides true immutability
- [Derived State](/solid/state/derived) - Creating computed values that update automatically
