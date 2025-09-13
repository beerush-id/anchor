# State Management in Anchor for Svelte

State management in Anchor for Svelte is designed to work seamlessly with Svelte's reactivity model while providing enhanced capabilities that address common challenges in complex applications.

## Core Concepts

### State Declaration

In Anchor, you can declare state anywhere in your application and share it across components. This is a significant improvement over Svelte's typical approach where stores need to be explicitly imported or passed as props.

```js
import { anchor } from '@anchorlib/core';

// Global state that can be imported anywhere
export const userState = anchor({
  profile: { name: 'John', age: 30 },
  preferences: { theme: 'dark' },
});
```

### Local State

For component-specific state, you can create local state within your Svelte components:

```sveltehtml
<script>
  import { anchorRef } from '@anchorlib/svelte';

  // Local state that's scoped to this component
  const counter = anchorRef(0);

  const increment = () => {
    counter.value++;
  };
</script>

<button onclick={increment}>
  Count: {$counter}
</button>
```

## State Types

### Global State

Global states are declared outside component bodies and persist throughout the application lifecycle. These are ideal for:

- Application-wide data (user profile, settings, etc.)
- Data shared across multiple components
- Complex business logic that needs to be accessed from different parts of the application

```js
import { anchor } from '@anchorlib/core';

export const appState = anchor({
  currentUser: null,
  theme: 'light',
  notifications: [],
});
```

### Local State

Local states are declared inside component bodies and are primarily used for UI behavior logic such as toggle states, tab states, form inputs, etc.

```sveltehtml
<script>
  import { anchorRef } from '@anchorlib/svelte';

  // Component-scoped state
  const tabState = anchorRef({
    activeTab: 0,
    tabs: ['Home', 'Profile', 'Settings']
  });
</script>
```

## Working with Nested Objects

One of the key advantages of Anchor over Svelte's built-in stores is its recursive reactivity. With Svelte stores, you need to manually handle nested object changes, but Anchor automatically tracks changes at any depth:

```sveltehtml
<script>
  import { anchorRef } from '@anchorlib/svelte';

  const complexState = anchorRef({
    user: {
      profile: {
        personal: {
          name: 'John',
          age: 30
        },
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }
    }
  });

  // This works seamlessly with full reactivity at all levels
  const updateUserName = (newName) => {
    complexState.value.user.profile.personal.name = newName;
  };
</script>
```

## Immutability and Controlled Mutations

While Anchor allows direct mutations for convenience, it also provides powerful immutability features:

```sveltehtml
<script>
  import { immutableRef, writableRef } from '@anchorlib/svelte';

  // Create an immutable state
  const immutableState = immutableRef({
    count: 0,
    message: 'Hello'
  });

  // Create a writable version with specific contracts
  const writer = writableRef(immutableState.value, ['count']);

  const updateCount = () => {
    writer.value.count++; // This is allowed
    // writer.value.message = 'New message'; // This would be restricted
  };
</script>
```

## State Observation

Anchor provides several ways to observe state changes, which is more flexible than Svelte's built-in reactivity:

```sveltehtml
<script>
  import { anchorRef, observedRef, derivedRef } from '@anchorlib/svelte';

  const items = anchorRef([
    { id: 1, name: 'Item 1', completed: false },
    { id: 2, name: 'Item 2', completed: true }
  ]);

  // Observe specific computations
  const completedCount = observedRef(() => {
    return items.value.filter(item => item.completed).length;
  });

  // Derived state with transformation
  const itemSummary = derivedRef(items, (currentItems) => {
    return `You have ${currentItems.length} items, ${currentItems.filter(i => i.completed).length} completed`;
  });
</script>

<p>{$itemSummary}</p>
<p>Completed items: {$completedCount}</p>
```

## Best Practices

### 1. Choose the Right State Type

Use global state for data that needs to be shared across components, and local state for component-specific UI logic.

### 2. Leverage Fine-Grained Reactivity

Create specific observers for different parts of your state to minimize unnecessary re-renders:

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';

  const state = anchorRef({
    user: { name: 'John' },
    ui: { loading: false }
  });

  // Separate observers for different parts
  const userName = observedRef(() => state.value.user.name);
  const loading = observedRef(() => state.value.ui.loading);
</script>
```

### 3. Use Immutable State for Shared Data

For global state that's shared across many components, consider using immutable state with explicit writers:

```sveltehtml
<script context="module">
  import { immutableRef } from '@anchorlib/svelte';

  export const globalState = immutableRef({
    config: { theme: 'dark' },
    data: []
  });
</script>
```

By following these patterns, you can harness the full power of Anchor's state management system while maintaining the simplicity and performance that makes Svelte so appealing.
