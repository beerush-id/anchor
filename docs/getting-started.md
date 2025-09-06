# **Getting Started with Anchor**

Learn how to use Anchor, the revolutionary state management library that provides fine-grained reactivity and true immutability for modern web applications.

## **What You'll Learn**

In this guide, you'll learn:

1. How to create reactive state with Anchor
2. How to observe state changes
3. How to work with immutable state
4. How to create write contracts for state mutations
5. Basic patterns for building reactive applications

## **Prerequisites**

Before starting this guide, make sure you have:

- Basic knowledge of JavaScript or TypeScript
- Node.js installed (version 14 or higher)
- A package manager like npm, yarn, or pnpm
- Anchor [installed](/installation) in your project

## **Creating Your First State**

Let's start by creating a simple reactive state:

```typescript
import { anchor } from '@anchor/core';

// Create a reactive state object
const userState = anchor({
  name: 'John Doe',
  age: 30,
  isLoggedIn: false,
});

// Access state properties
console.log(userState.name); // 'John Doe'
console.log(userState.age); // 30
```

## **Observing State Changes**

One of Anchor's core features is fine-grained reactivity. You can observe state changes using the `derive` function:

```typescript
import { anchor, derive } from '@anchor/core';

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
import { anchor } from '@anchor/core';

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
import { anchor } from '@anchor/core';

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

## **Framework Integration Examples**

### **React Example**

```jsx
import { useAnchor } from '@anchor/react';
import { observed } from '@anchor/react/components';

const Counter = observed(() => {
  const state = useAnchor({
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
