# **Installing Anchor - State Management Library Setup**

Learn how to install and set up Anchor, the revolutionary state management library for modern web applications.

## **Prerequisites**

Before installing Anchor, ensure you have:

- **Node.js** version 14 or higher
- A modern web browser for development
- A package manager like npm, yarn, or pnpm

## **Installation Options**

Anchor provides multiple packages depending on your framework:

### **Core Package (Vanilla JavaScript/TypeScript)**

Install the core package for framework-agnostic state management:

```bash
npm install @anchor/core
```

Or with yarn:

```bash
yarn add @anchor/core
```

Or with pnpm:

```bash
pnpm add @anchor/core
```

### **React Integration**

For React applications, install the React-specific package:

```bash
npm install @anchor/react
```

Or with yarn:

```bash
yarn add @anchor/react
```

Or with pnpm:

```bash
pnpm add @anchor/react
```

### **Vue Integration**

For Vue applications, install the Vue-specific package:

```bash
npm install @anchor/vue
```

Or with yarn:

```bash
yarn add @anchor/vue
```

Or with pnpm:

```bash
pnpm add @anchor/vue
```

### **Svelte Integration**

For Svelte applications, install the Svelte-specific package:

```bash
npm install @anchor/svelte
```

Or with yarn:

```bash
yarn add @anchor/svelte
```

Or with pnpm:

```bash
pnpm add @anchor/svelte
```

## **Basic Setup**

After installation, you can start using Anchor in your project:

### **Vanilla JavaScript/TypeScript**

```typescript
import { anchor } from '@anchor/core';

const state = anchor({
  count: 0,
  name: 'My App',
});

console.log(state.count); // 0
state.count++;
```

### **React**

```jsx
import { useObserved } from '@anchor/react';

function Counter() {
  const count = useObserved(() => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

### **Vue**

```vue
<script setup>
import { useObserved } from '@anchor/vue';

const count = useObserved(() => state.count);
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

### **Svelte**

```svelte
<script>
  import { useObserved } from '@anchor/svelte';

  const count = useObserved(() => state.count);
</script>

<div>
  <p>Count: {$count}</p>
  <button on:click={() => state.count++}>Increment</button>
</div>
```

## **TypeScript Support**

Anchor is written in TypeScript and provides first-class TypeScript support with comprehensive type definitions included in every package.

## **Troubleshooting**

If you encounter issues during installation:

1. **Clear Cache**: Try clearing your package manager cache:

   ```bash
   npm cache clean --force
   # or
   yarn cache clean
   # or
   pnpm store prune
   ```

2. **Check Node Version**: Ensure you're using Node.js 14 or higher:

   ```bash
   node --version
   ```

3. **Check for Conflicting Packages**: Make sure you don't have conflicting state management libraries installed.

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
