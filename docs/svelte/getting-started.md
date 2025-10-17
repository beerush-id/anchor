---
title: 'Getting Started with Anchor for Svelte'
description: 'A step-by-step guide to getting started with Anchor for Svelte. Learn to install, create reactive state, and build high-performance components.'
keywords:
  - anchor for svelte tutorial
  - svelte state management getting started
  - anchor svelte guide
  - anchorRef
  - svelte reactive state
  - getting started svelte state
---

# Getting Started with Anchor for Svelte

This guide will help you get up and running with Anchor in your Svelte project. You'll learn how to install Anchor,
create reactive state, and integrate it with your Svelte components.

## Installation

To begin, install the `@anchorlib/svelte` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchorlib/svelte
```

```bash [Yarn]
yarn add @anchorlib/svelte
```

```bash [pnpm]
pnpm add @anchorlib/svelte
```

```bash [Bun]
bun add @anchorlib/svelte
```

:::

## Basic Usage

The most common way to create reactive state in Anchor is using the [anchorRef](/apis/svelte/initialization#anchorref)
function. This creates a reactive reference that integrates seamlessly with Svelte's reactivity system.

::: tip Reactive Binding

If you are working with external states (not declared with Svelte's integration APIs like `anchorRef`), you can enable
reactive binding by importing `@anchorlib/svelte/reactive` in your root component:

::: code-group

```sveltehtml [+layout.svelte]
<script>
  import '@anchorlib/svelte/reactive';
</script>
```

**Note:** This step is optional, but recommended in case you are going to fully utilize [Anchor's core APIs](/apis/core/initialization).

:::

### Your First Reactive Component

To get started, create a component that uses the `anchorRef` function to create a reactive reference:

```sveltehtml

<script>
  import { anchorRef } from '@anchorlib/svelte';

  const counter = anchorRef({ count: 0 });
</script>

<div>
  <h1>Counter: {counter.count}</h1>
  <button on:click={() => counter.count++}>Increment</button>
  <button on:click={() => counter.count--}>Decrement</button>
  <button on:click={() => (counter.count = 0)}>Reset</button>
</div>
```

::: tip Key Points:

- **`anchorRef`**: Creates a reactive reference that integrates with Svelte's reactivity system
- **Direct Mutation**: You can directly modify state properties (e.g., `counter.count++`)
- **Automatic Updates**: Components automatically re-render when the state they access changes

:::

### Computed Property

```sveltehtml

<script>
  import { anchorRef } from '@anchorlib/svelte';

  const state = anchorRef({
    count: 0,
    firstName: 'John',
    lastName: 'Doe',
    // Computed property using getter just works
    get fullName() {
      return `${ this.firstName } ${ this.lastName }`;
    },
    get doubleCount() {
      return this.count * 2;
    },
  });

  const changeName = () => {
    state.firstName = 'Jane';
    state.lastName = 'Smith';
  };
</script>

<div>
  <h1>Counter: {state.count}</h1>
  <h1>Double Count: {state.doubleCount}</h1>
  <h1>Full Name: {state.fullName}</h1>
  <button on:click={() => state.count++}>Increment</button>
  <button on:click={() => state.count--}>Decrement</button>
  <button on:click={() => (state.count = 0)}>Reset</button>
  <button on:click={changeName}>Change Name</button>
</div>
```

### Derived State

```sveltehtml

<script>
  import { anchorRef, variableRef } from '@anchorlib/svelte';

  const count = variableRef(1);
  const count2 = variableRef(5);
  const counter = anchorRef({ count: 3 });

  // Derived state that automatically updates when any of its dependencies change
  const total = $derived(count.value + count2.value + counter.count);
</script>

<div>
  <h1>Counter 1: {count.value}</h1>
  <h1>Counter 2: {count2.value}</h1>
  <h1>Counter 3: {counter.count}</h1>
  <h1>Total: {total}</h1>
  <button on:click={() => count.value++}>Increment 1</button>
  <button on:click={() => count2.value++}>Increment 2</button>
  <button on:click={() => counter.count++}>Increment 3</button>
</div>
```

## Global State

For state that needs to be shared across multiple components, you can create the state outside your components:

```ts /store.ts
import { anchorRef } from '@anchorlib/svelte';

// Global state declared outside your component
export const counter = anchorRef({ count: 0 });
```

```sveltehtml /App.svelte

<script>
  import { counter } from './store.ts';
</script>

<div>
  <h1>Counter: {counter.count}</h1>
  <button on:click={() => counter.count++}>Increment</button>
  <button on:click={() => counter.count--}>Decrement</button>
  <button on:click={() => (counter.count = 0)}>Reset</button>
</div>
```

## Working with Arrays

Anchor provides specialized functions for working with arrays:

### flatRef

For arrays where you want reactivity on the array itself but not on individual elements:

```ts
import { flatRef } from '@anchorlib/svelte';

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

```ts
import { orderedRef } from '@anchorlib/svelte';

const sortedNumbers = orderedRef([3, 1, 4, 1, 5], (a, b) => a - b);
// Result: [1, 1, 3, 4, 5]
```

## Schema Support

Anchor supports defining schemas for your state, providing runtime validation and better type safety:

````ts
import { modelRef } from '@anchorlib/svelte';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const user = modelRef(UserSchema, { name: 'John', age: 30 });

// This will work
user.name = 'Jane';

// This will throw a validation error at runtime
// user.age = 'not a number'; // Error!```
````

## Ref System

Anchor provides a Ref system that gives you more control over reactivity:

### variableRef

Creates a reactive reference with both getter and setter:

```ts
import { variableRef } from '@anchorlib/svelte';

const countRef = variableRef(0);

// Access value
console.log(countRef.value); // 0

// Update value
countRef.value = 42;
```

### constantRef

Creates a read-only reactive reference:

```ts
import { constantRef } from '@anchorlib/svelte';

const readOnlyRef = constantRef(42);

// Access value
console.log(readOnlyRef.value); // 42

// This would cause a TypeScript error:
// readOnlyRef.value = 100; // Error!
```

## API Reference

- [API Reference](/apis/svelte/initialization) - Complete documentation of all functions and types

## Next Steps

Now that you've learned the basics of Anchor for Svelte, you can explore:

- [Reactivity](/svelte/reactivity) - How Anchor's reactivity system works with Svelte
- [Immutability](/svelte/immutability) - How Anchor provides true immutability
- [State Management](/svelte/state-management) - Advanced patterns for managing complex state
