# **Installing Anchor**

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
npm install @anchor/core
```

```bash [Yarn]
yarn add @anchor/core
```

```bash [PNPM]
pnpm add @anchor/core
```

```bash [Bun]
bun add @anchor/core
```

:::

### **React Integration**

For React applications, install the React-specific package:

::: code-group

```bash [NPM]
npm install @anchor/react
```

```bash [Yarn]
yarn add @anchor/react
```

```bash [PNPM]
pnpm add @anchor/react
```

```bash [Bun]
bun add @anchor/react
```

:::

### **Vue Integration**

For Vue applications, install the Vue-specific package:

::: code-group

```bash [NPM]
npm install @anchor/vue
```

```bash [Yarn]
yarn add @anchor/vue
```

```bash [PNPM]
pnpm add @anchor/vue
```

```bash [Bun]
bun add @anchor/vue
```

:::

### **Svelte Integration**

For Svelte applications, install the Svelte-specific package:

::: code-group

```bash [NPM]
npm install @anchor/svelte
```

```bash [Yarn]
yarn add @anchor/svelte
```

```bash [PNPM]
pnpm add @anchor/svelte
```

```bash [Bun]
bun add @anchor/svelte
```

:::

## **Basic Setup**

After installation, you can start using Anchor in your project:

::: code-group

```js [index.js]
import { anchor } from '@anchor/core';

export const state = anchor({
  count: 0,
  name: 'My App',
});

console.log(state.count); // 0
state.count++;
```

```jsx [Counter.jsx]
import { useObserved } from '@anchor/react';
import { state } from '../index.js';

const Counter = () => {
  const count = useObserved(() => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
};
```

```vue [Counter.vue]
<script setup>
import { observedRef } from '@anchor/vue';
import { state } from '../index.js';

const count = observedRef(() => state.count);
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

```svelte [Counter.svelte]
<script>
  import { observedRef } from '@anchor/svelte';
  import { state } from '../index.js';

  const count = observedRef(() => state.count);
</script>

<div>
  <p>Count: {$count}</p>
  <button onclick={() => state.count++}>Increment</button>
</div>
```

:::

## **TypeScript Support**

Anchor is written in TypeScript and provides first-class TypeScript support with comprehensive type definitions included in every package.

## **Next Steps**

After installing Anchor, check out these guides to get started:

- [Usage Guide](/usage) - Learn how to use Anchor's core features
- [Reactivity](/reactivity) - Understand Anchor's fine-grained reactivity system
- [Immutability](/immutability) - Learn about Anchor's true immutability approach
- Framework-specific guides:
  - [React Guide](/react/getting-started)
  - [Vue Guide](/vue/getting-started)
  - [Svelte Guide](/svelte/getting-started)

## **Need Help?**

If you're having trouble with installation:

1. Check the [FAQ](/faq) for common issues
2. Open an issue on [GitHub](https://github.com/beerush-id/anchor/issues)
3. Join our community Discord for real-time support
