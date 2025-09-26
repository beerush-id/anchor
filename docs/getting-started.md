# **Getting Started with Anchor**

Learn how to use **Anchor**, the revolutionary state management library that provides fine-grained reactivity and true
immutability for modern web applications. This guide will walk you through the basics of using **Anchor**.

## **Prerequisites**

Before starting this guide, make sure you have:

- Basic knowledge of JavaScript or TypeScript
- Anchor [installed](/installation) in your project

## **Creating Your First State**

Let's start by creating a simple reactive state:

```typescript
import { anchor } from '@anchorlib/core';

// Create a reactive state object
const state = anchor({
  count: 0,
  title: 'Hello, World!',
});

// Access state properties
console.log(state.count); // 0
console.log(state.title); // "Hello, World!"
```

::: tip Framework Quick Start

::: code-group

```jsx [React]
import { useAnchor } from '@anchorlib/react';
import { observer } from '@anchorlib/react/view';

const Counter = observer(() => {
  const [state] = useAnchor({
    count: 0,
    title: 'My App',
  });

  return (
    <div>
      <h1>{state.title}</h1>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
});
```

```svelte [Svelte]
<script>
  import { anchorRef } from '@anchorlib/svelte';

  const state = anchorRef({ count: 0, title: 'My App' });
</script>

<div>
  <h1>{$state.title}</h1>
  <p>Count: {$state.count}</p>
  <button onclick={() => state.count++}>Increment</button>
</div>
```

```vue [Vue]
<script setup>
import { anchorRef } from '@anchorlib/vue';

const state = anchorRef({ count: 0, title: 'My App' });
</script>

<template>
  <div>
    <h1>{{ state.title }}</h1>
    <p>Count: {{ state.count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

:::

## **Observing State Changes**

One of Anchor's core features is fine-grained reactivity. You can observe state changes using the `derive` function:

```typescript
import { anchor, derive } from '@anchorlib/core';

const counter = anchor({ count: 0 });

// Observe all changes to the counter
derive(counter, (snapshot, event) => {
  console.log('Counter changed:', snapshot, event);
});

// This will trigger the observer
counter.count++;
```

## **Working with Immutable State**

Anchor's true immutability system allows you to work with immutable state while maintaining intuitive syntax:

```typescript
import { anchor } from '@anchorlib/core';

// Create an immutable state
const profile = anchor.immutable({
  name: 'Jane Smith',
  email: 'jane@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

// Reading works normally
console.log(profile.name); // 'Jane Smith'

// Direct mutations are prevented
// profile.name = 'New Name'; // This would be trapped
```

## **Creating Write Contracts**

To modify immutable state, you need to create a write contract:

```typescript
import { anchor } from '@anchorlib/core';

const settings = anchor.immutable({
  volume: 50,
  brightness: 70,
  theme: 'light',
});

// Create a write contract for specific properties
const settingsWriter = anchor.writable(settings, ['volume', 'brightness']);

// These mutations are allowed
settingsWriter.volume = 80;
settingsWriter.brightness = 90;

// This would be trapped
// settingsWriter.theme = 'dark';
```

## **Best Practices**

1. **Create State at the Right Level**: Place state at the component or application level where it's needed
2. **Use Immutable State for Shared Data**: Prevent accidental mutations with immutable state
3. **Create Specific Write Contracts**: Limit mutations to only what's necessary
4. **Observe Only What You Need**: Fine-grained observation prevents unnecessary re-renders
5. **Clean Up Observers**: Remove observers when components unmount to prevent memory leaks

## **Next Steps**

Now that you've learned the basics of Anchor:

- Explore [Reactivity](/reactivity) to understand fine-grained observation
- Learn about [Immutability](/immutability) and write contracts
- Check out [Performance](/performance) optimizations
- Review the [Usage Guide](/usage) for comprehensive API documentation
- Try framework-specific guides:
  - [React Guide](/react/getting-started)
  - [Vue Guide](/vue/getting-started)
  - [Svelte Guide](/svelte/getting-started)

## **Need Help?**

If you're having trouble:

1. Check the [FAQ](/faq) for common issues
2. Look at the [API Reference](/usage) for detailed function documentation
3. Open an issue on [GitHub](https://github.com/beerush-id/anchor/issues)
4. Join our community Discord for real-time support
