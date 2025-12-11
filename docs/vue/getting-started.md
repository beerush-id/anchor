---
title: 'Getting Started with Anchor for Vue'
description: 'A step-by-step guide to getting started with Anchor for Vue. Learn to install, create reactive state, and build dynamic components.'
keywords:
  - anchor for vue tutorial
  - vue state management getting started
  - anchor vue guide
  - anchorRef
  - vue reactive state
  - getting started vue state
---

# Getting Started with Anchor for Vue

This guide will quickly get you up and running with Anchor in your Vue project. You'll learn how to install Anchor, create your first reactive state, and connect it to your Vue components to build dynamic and performant UIs.

## Installation

To begin, install the `@anchorlib/vue` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchorlib/vue
```

```bash [Yarn]
yarn add @anchorlib/vue
```

```bash [pnpm]
pnpm add @anchorlib/vue
```

```bash [Bun]
bun add @anchorlib/vue
```

:::

## Basic Usage

The primary way to create state in Anchor for Vue is using `anchorRef`. This creates a standard Vue Ref that wraps a reactive Anchor object.

### Your First Reactive Component

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

// Create your reactive state
// anchorRef returns a Ref, so you access it via .value in script
const count = anchorRef(0);

const increment = () => count.value++;
const decrement = () => count.value--;
const reset = () => (count.value = 0);
</script>

<template>
  <div>
    <!-- Automatic unwrapping in template makes it clean -->
    <h1>Counter: {{ count }}</h1>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="reset">Reset</button>
  </div>
</template>
```

## Working with Objects

`anchorRef` is recursive by default, making deep state management easy.

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

const user = anchorRef({
  name: 'John Doe',
  profile: {
    age: 30,
    theme: 'dark'
  }
});

const toggleTheme = () => {
  user.value.profile.theme = user.value.profile.theme === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <div>
    <h2>User Profile</h2>
    <input v-model="user.name" placeholder="Name" />
    <p>Age: {{ user.profile.age }}</p>
    <p>Theme: {{ user.profile.theme }}</p>
    <button @click="toggleTheme">Toggle Theme</button>
  </div>
</template>
```

### Derived State

You can use `derivedRef` to create computed values that automatically update.

```vue
<script setup>
import { anchorRef, derivedRef } from '@anchorlib/vue';

const count = anchorRef(1);
const count2 = anchorRef(5);

// derivedRef creates a Read-Only Ref
const total = derivedRef(() => count.value + count2.value);
</script>

<template>
  <div>
    <p>Count 1: {{ count }}</p>
    <p>Count 2: {{ count2 }}</p>
    <p>Total: {{ total }}</p>
    <button @click="count.value++">Inc 1</button>
    <button @click="count2.value++">Inc 2</button>
  </div>
</template>
```

## Schema Support

Anchor supports defining schemas for your state using `anchorRef`, providing runtime validation.

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Pass the schema as the second argument
const user = anchorRef({ name: 'John', age: 30 }, { schema: UserSchema });

// This will work
user.value.name = 'Jane';

// This will throw a validation error at runtime if you try this:
// user.value.age = 'not a number';
</script>
```

## Next Steps

Now that you've seen the basics of Anchor with Vue, you can explore:

- [Mutable State](/vue/state/mutable) - Deep dive into `anchorRef` and mutable state logic.
- [Immutable State](/vue/state/immutable) - Discover safe state sharing with `immutableRef`.
- [Derived State](/vue/state/derived) - Learn more about `derivedRef` and computed values.
- [API References](/apis/vue/initialization) - Dive into the complete API documentation.
