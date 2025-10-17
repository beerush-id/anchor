---
title: 'Anchor Installation Guide: How to Install for React, Vue, Svelte & JS'
description: 'Learn how to install the Anchor state management library for your JavaScript, React, Vue, or Svelte project. Get started quickly with simple installation commands.'
keywords:
  - anchor installation
  - install anchor
  - anchor setup
  - javascript state management installation
  - react state management installation
  - vue state management installation
  - svelte state management installation
  - '@anchorlib/core'
---

# How to Install Anchor

Learn how to install and set up Anchor, the revolutionary state management library for modern web applications.

## **Prerequisites**

Before installing Anchor, ensure you have:

- A modern web browser for development
- A package manager like npm, yarn, or pnpm

## **Installation Options**

Anchor provides multiple packages depending on your framework:

### **Core Package (Vanilla JavaScript/TypeScript)**

Install the core package for framework-agnostic state management:

::: code-group

```bash [NPM]
npm install @anchorlib/core
```

```bash [Yarn]
yarn add @anchorlib/core
```

```bash [PNPM]
pnpm add @anchorlib/core
```

```bash [Bun]
bun add @anchorlib/core
```

:::

### **React Integration**

For React applications, install the React-specific package:

::: code-group

```bash [NPM]
npm install @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/react
```

```bash [PNPM]
pnpm add @anchorlib/react
```

```bash [Bun]
bun add @anchorlib/react
```

:::

### **SolidJS Integration**

For SolidJS applications, install the SolidJS-specific package:

::: code-group

```bash [NPM]
npm install @anchorlib/solid
```

```bash [Yarn]
yarn add @anchorlib/solid
```

```bash [PNPM]
pnpm add @anchorlib/solid
```

```bash [Bun]
bun add @anchorlib/solid
```

:::

### **Svelte Integration**

For Svelte applications, install the Svelte-specific package:

::: code-group

```bash [NPM]
npm install @anchorlib/svelte
```

```bash [Yarn]
yarn add @anchorlib/svelte
```

```bash [PNPM]
pnpm add @anchorlib/svelte
```

```bash [Bun]
bun add @anchorlib/svelte
```

:::

### **Vue Integration**

For Vue applications, install the Vue-specific package:

::: code-group

```bash [NPM]
npm install @anchorlib/vue
```

```bash [Yarn]
yarn add @anchorlib/vue
```

```bash [PNPM]
pnpm add @anchorlib/vue
```

```bash [Bun]
bun add @anchorlib/vue
```

:::

## **Basic Setup**

After installation, you can start using Anchor in your project:

::: code-group

```js [state.js]
import { anchor } from '@anchorlib/core';

// Create a shared, reactive state object.
export const state = anchor({
  count: 0,
  name: 'My App',
});
```

```jsx [ReactCounter.jsx]
import { useObserved } from '@anchorlib/react';
import { state } from '../state.js';

const Counter = observer(() => {
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
});
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
