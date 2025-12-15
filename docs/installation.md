---
title: 'AIR Stack Installation Guide: Anchor State Management'
description: 'Learn how to install Anchor, the state management component of the AIR Stack. Get started quickly with React, Vue, Svelte, Solid, or vanilla JavaScript.'
keywords:
  - AIR Stack installation
  - Anchor installation
  - install anchor
  - state management installation
  - React state management
  - Vue state management
  - Svelte state management
  - '@anchorlib/core'
---

# Installing Anchor

Learn how to install **Anchor**, the state management component of the **AIR Stack** (Anchor + IRPC + Reactive UI).

> **Note:** This guide covers Anchor installation. For IRPC (API framework), see [IRPC Getting Started](/irpc/getting-started).

## **Prerequisites**

Before installing Anchor, ensure you have:

- A modern web browser for development
- A package manager like bun, npm, yarn, or pnpm

## **Installation Options**

Anchor provides multiple packages depending on your framework:

### **Core Package (Vanilla JavaScript/TypeScript)**

Install the core package for framework-agnostic state management:

::: code-group

```bash [Bun]
bun add @anchorlib/core
```

```bash [NPM]
npm install @anchorlib/core
```

```bash [Yarn]
yarn add @anchorlib/core
```

```bash [PNPM]
pnpm add @anchorlib/core
```

:::

### **React Integration**

For React applications, install the React-specific package:

::: code-group

```bash [Bun]
bun add @anchorlib/react
```

```bash [NPM]
npm install @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/react
```

```bash [PNPM]
pnpm add @anchorlib/react
```

:::

### **SolidJS Integration**

For SolidJS applications, install the SolidJS-specific package:

::: code-group

```bash [Bun]
bun add @anchorlib/solid
```

```bash [NPM]
npm install @anchorlib/solid
```

```bash [Yarn]
yarn add @anchorlib/solid
```

```bash [PNPM]
pnpm add @anchorlib/solid
```

:::

### **Svelte Integration**

For Svelte applications, install the Svelte-specific package:

::: code-group

```bash [Bun]
bun add @anchorlib/svelte
```

```bash [NPM]
npm install @anchorlib/svelte
```

```bash [Yarn]
yarn add @anchorlib/svelte
```

```bash [PNPM]
pnpm add @anchorlib/svelte
```

:::

### **Vue Integration**

For Vue applications, install the Vue-specific package:

::: code-group

```bash [Bun]
bun add @anchorlib/vue
```

```bash [NPM]
npm install @anchorlib/vue
```

```bash [Yarn]
yarn add @anchorlib/vue
```

```bash [PNPM]
pnpm add @anchorlib/vue
```

:::

## **Basic Setup**

After installation, you can start using Anchor in your project:

::: code-group

```js [state.js]
import { mutable } from '@anchorlib/core';

// Create a shared, reactive state object.
export const state = mutable({
  count: 0,
  name: 'My App',
});
```

```tsx [ReactCounter.tsx]
import { template } from '@anchorlib/react';
import { state } from '../state.js';

export const Counter = template(() => (
  <div>
    <p>Count: {state.count}</p>
    <button onClick={() => state.count++}>Increment</button>
  </div>
));
```

```jsx [SolidCounter.jsx]
import { state } from '../state.js';

const Counter = () => {
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
};
```

```sveltehtml [Counter.svelte]
<script>
  import { state } from '../state.js';
</script>

<div>
  <p>Count: {state.count}</p>
  <button onclick={() => state.count++}>Increment</button>
</div>
```

```vue [Counter.vue]
<script setup>
import { observedRef } from '@anchorlib/vue';
import { state } from '../state.js';

// Observe the count value.
const count = observedRef(() => state.count);
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

:::

## **TypeScript Support**

Anchor is written in TypeScript and provides first-class TypeScript support with comprehensive type definitions included in every package.

## **Next Steps**

After installing Anchor, check out these guides to get started:

- [Configuration Guide](/configuration) - Learn how to configure Anchor
- [Reactivity](/reactivity) - Understand Anchor's fine-grained reactivity system
- [Immutability](/immutability) - Learn about Anchor's true immutability approach
- [Data Integrity](/data-integrity) - Learn about Anchor's Data Integrity
- Framework-specific guides:
  - [React Guide](/react/getting-started)
  - [Solid Guide](/react/getting-started)
  - [Svelte Guide](/svelte/getting-started)
  - [Vue Guide](/vue/getting-started)

## **Need Help?**

If you're having trouble with installation:

1. Check the [FAQ](/faq) for common issues
2. Open an issue on [GitHub](https://github.com/beerush-id/anchor/issues)
3. Join our community Discord for real-time support
