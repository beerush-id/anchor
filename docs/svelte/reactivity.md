---
title: 'Reactivity in Anchor for Svelte'
description: "Learn how Anchor integrates with Svelte's reactivity system to provide fine-grained updates and optimal performance."
keywords:
  - anchor for svelte
  - svelte reactivity
  - fine-grained reactivity
  - svelte performance
  - anchor reactivity model
---

# Reactivity in Anchor for Svelte

Anchor seamlessly integrates with Svelte's reactivity system, enhancing it with additional capabilities while maintaining
the fine-grained reactivity that makes Svelte so performant.

## How Svelte Reactivity Works

Svelte's reactivity is powered by **runes**, which are special symbols that provide instructions to the Svelte compiler. The most fundamental rune is `$state`, used to create reactive variables. When the value of a `$state` variable changes, Svelte knows precisely which parts of the DOM need to be updated, without the overhead of a virtual DOM.

This system allows for fine-grained, surgical updates that are both highly efficient and easy to reason about. Other runes, like `$derived`, let you create reactive values that are computed from other reactive states.

## Anchor's Integration

Anchor builds on Svelte's reactivity model by leveraging the `createSubscriber` API from `svelte/reactivity`. This allows Anchor to create subscribers that are deeply integrated with Svelte's reactivity system, ensuring that components update efficiently when the underlying state changes.

### Example

```sveltehtml
<script>
  import { anchorRef } from '@anchorlib/svelte';

  const state = anchorRef({
    user: { name: 'John', age: 30 },
    todos: [{ id: 1, text: 'Learn Anchor', completed: false }],
  });
</script>

<div>
    <!-- Only this component will re-render when user.name changes -->
    <p>Name: {state.user.name}</p>

    <!-- Only this component will re-render when user.age changes -->
    <p>Age: {state.user.age}</p>

    <!-- This component will re-render when the todos array changes -->
    <ul>
        {#each state.todos as todo}
            <li key={todo.id}>{todo.text}</li>
        {/each}
    </ul>
</div>
```

## Performance Benefits

Anchor's integration with Svelte provides several performance benefits:

1. **Minimal Re-renders**: Only components that access changed properties re-render
2. **Automatic Cleanup**: Observers are automatically cleaned up when components are destroyed
3. **Lazy Initialization**: Nested states are only made reactive when accessed

## Best Practices

### 1. Use Direct Property Access

Access properties directly rather than destructuring primitive value to maintain reactivity:

```sveltehtml
<script>
    import { anchorRef } from '@anchorlib/svelte';

    const state = anchorRef({
        user: { name: 'John', age: 30 },
    });

    // ✅ Good - maintains reactivity
    const { user } = state;

    // ❌ Avoid - loses reactivity tracking
    const { name } = state.user; // Destructuring primitive value will lose reactivity
</script>

<!-- Won't update when state.user.name changes -->
<p>{name}</p>
```

### 2. Leverage Global State

Use global state for shared data to avoid prop drilling:

```ts /store.ts
// Create global state outside components
export const globalState = anchorRef({
  user: { name: 'John' },
  theme: 'dark',
});
```

```sveltehtml /App.svelte
<script>
    import { globalState } from './store.ts';
</script>

<!-- Use directly in any component -->
<header>Welcome, {globalState.user.name}!</header>
```

### 3. Use Appropriate Ref Types

Choose the right ref type for your use case:

- `anchorRef` - General purpose reactive objects
- `flatRef` - Arrays where you want reactivity on the array itself
- `orderedRef` - Arrays that should maintain sorted order
- `variableRef` - Simple reactive values with getter/setter
- `constantRef` - Read-only reactive values
