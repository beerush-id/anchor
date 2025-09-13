# Reactivity in Anchor for Svelte

Anchor's reactivity system provides fine-grained control over what triggers component updates, going beyond Svelte's built-in reactivity to deliver even better performance and more predictable behavior.

## How Svelte's Reactivity Works

Svelte's reactivity is based on compile-time analysis that automatically subscribes components to the stores they reference. However, this approach has limitations:

- Stores are observed as wholes, not individual properties
- Nested objects require manual handling for reactivity
- Complex derived state can lead to unnecessary re-computations

## Anchor's Approach to Reactivity

Anchor introduces a fundamentally different approach that eliminates these issues by providing granular control over reactivity:

### Fine-Grained Observation

With Anchor, you can observe specific parts of your state rather than entire objects:

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';

  const userState = anchorRef({
    profile: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    preferences: {
      theme: 'dark',
      notifications: true
    }
  });

  // Only re-runs when profile.name changes
  const displayName = observedRef(() => userState.value.profile.name);

  // Only re-runs when preferences.theme changes
  const currentTheme = observedRef(() => userState.value.preferences.theme);

  // Only re-runs when the number of notifications changes
  const notificationCount = observedRef(() => {
    // Some expensive computation
    return getNotificationCount();
  });
</script>

<h1>Welcome, {$displayName}!</h1>
<div class="theme-{$currentTheme}">
  <p>You have {$notificationCount} notifications</p>
</div>
```

### The DSV (Data-State-View) Pattern

Anchor promotes the DSV pattern that clearly separates responsibilities:

- **Data**: Reactive state objects that hold your application data
- **State**: Components that manage data but rarely re-render
- **View**: Small components that observe specific state changes and re-render efficiently

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';

  // Data - reactive state that holds your application data
  const counterState = anchorRef({ count: 0 });

  // View - only re-renders when the observed data changes
  const counterDisplay = observedRef(() => counterState.value.count);

  // Mutation - directly mutates the reactive state
  const increment = () => {
    counterState.value.count++;
  };
</script>

<h1>Count: {$counterDisplay}</h1>
<button onclick={increment}>Increment</button>
```

## Performance Characteristics

Anchor's reactivity model provides several performance benefits over traditional approaches:

### Precision

Only observing components re-render, eliminating unnecessary updates:

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';

  const appState = anchorRef({
    ui: { loading: false },
    data: { users: [], posts: [] }
  });

  // This only re-renders when ui.loading changes
  const isLoading = observedRef(() => appState.value.ui.loading);

  // This only re-renders when data.users changes
  const userCount = observedRef(() => appState.value.data.users.length);
</script>

{#if $isLoading}
  <p>Loading...</p>
{/if}

<p>Users: {$userCount}</p>
```

### Automatic Optimization

No need for manual memoization in most cases:

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';

  const products = anchorRef([
    { id: 1, name: 'Product 1', price: 100 },
    { id: 2, name: 'Product 2', price: 200 }
  ]);

  // Automatically optimized - only re-runs when products array changes
  const totalPrice = observedRef(() => {
    return products.value.reduce((sum, product) => sum + product.price, 0);
  });
</script>

<p>Total Price: ${$totalPrice}</p>
```

### Memory Efficiency

Automatic cleanup of observers prevents memory leaks:

```sveltehtml
<script>
  import { anchorRef, observedRef } from '@anchorlib/svelte';
  import { onDestroy } from 'svelte';

  const state = anchorRef({ value: 0 });

  // Observer automatically cleaned up when component is destroyed
  const observedValue = observedRef(() => state.value * 2);
</script>
```

By leveraging Anchor's fine-grained reactivity system, you can build Svelte applications that are not only more performant but also more maintainable and easier to reason about.
