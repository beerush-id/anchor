---
title: 'Getting Started with Anchor for Svelte'
description: 'A step-by-step guide to getting started with Anchor for Svelte. Learn to install, create reactive state, and build high-performance components.'
keywords:
  - anchor for svelte tutorial
  - svelte state management getting started
  - anchor svelte guide
  - mutable
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

The most common way to create reactive state in Anchor is using the `mutable` function. This creates a reactive reference that integrates seamlessly with Svelte's reactivity system.

### Your First Reactive Component

To get started, create a component that uses the `mutable` function to create a reactive reference:

```sveltehtml

<script>
  import { mutable } from '@anchorlib/svelte';

  const counter = mutable({ count: 0 });
</script>

<div>
  <h1>Counter: {counter.count}</h1>
  <button onclick={() => counter.count++}>Increment</button>
  <button onclick={() => counter.count--}>Decrement</button>
  <button onclick={() => (counter.count = 0)}>Reset</button>
</div>
```

::: tip Key Points:

- **`mutable`**: Creates a reactive reference that integrates with Svelte's reactivity system
- **Direct Mutation**: You can directly modify state properties (e.g., `counter.count++`)
- **Automatic Updates**: Components automatically re-render when the state they access changes

:::

### Computed Property

```sveltehtml

<script>
  import { mutable } from '@anchorlib/svelte';

  const state = mutable({
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
  <button onclick={() => state.count++}>Increment</button>
  <button onclick={() => state.count--}>Decrement</button>
  <button onclick={() => (state.count = 0)}>Reset</button>
  <button onclick={changeName}>Change Name</button>
</div>
```

### Derived State

```sveltehtml

<script>
  import { mutable, derived } from '@anchorlib/svelte';

  const count = mutable(1);
  const count2 = mutable(5);
  const counter = mutable({ count: 3 });

  // Derived state to combine multiple sources
  const total = derived(() => count.value + count2.value + counter.count);
</script>

<div>
  <h1>Counter 1: {count.value}</h1>
  <h1>Counter 2: {count2.value}</h1>
  <h1>Counter 3: {counter.count}</h1>
  <h1>Total: {total.value}</h1>
  <button onclick={() => count.value++}>Increment 1</button>
  <button onclick={() => count2.value++}>Increment 2</button>
  <button onclick={() => counter.count++}>Increment 3</button>
</div>
```

## Global State

For state that needs to be shared across multiple components, you can create the state outside your components:

```ts /store.ts
import { mutable } from '@anchorlib/svelte';

// Global state declared outside your component
export const counter = mutable({ count: 0 });
```

```sveltehtml /App.svelte

<script>
  import { counter } from './store.ts';
</script>

<div>
  <h1>Counter: {counter.count}</h1>
  <button onclick={() => counter.count++}>Increment</button>
  <button onclick={() => counter.count--}>Decrement</button>
  <button onclick={() => (counter.count = 0)}>Reset</button>
</div>
```

## Schema Support

Anchor supports defining schemas for your state, providing runtime validation and better type safety:

````ts
import { mutable } from '@anchorlib/svelte';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const user = mutable({ name: 'John', age: 30 }, { schema: UserSchema });

// This will work
user.name = 'Jane';

// This will throw a validation error at runtime
// user.age = 'not a number'; // Error!```
````

## API Reference

- [API Reference](/apis/svelte/initialization) - Complete documentation of all functions and types

## Next Steps

Now that you've learned the basics of Anchor for Svelte, you can explore:

- [Mutable State](/svelte/state/mutable) - Deep dive into creating and modifying reactive state
- [Immutable State](/svelte/state/immutable) - How Anchor provides true immutability
- [Derived State](/svelte/state/derived) - Creating computed values that update automatically
