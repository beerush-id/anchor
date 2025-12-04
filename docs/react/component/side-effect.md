---
title: "Effect Handler"
description: "Using effect() for side effects in Anchor components."
keywords:
  - effect
  - side effects
  - reactivity
---

# Effect Handler

The `effect()` function allows you to perform side effects that automatically re-run when their dependencies change. It is the primary way to synchronize your state with the outside world (DOM, APIs, timers, etc.).

## How It Works

`effect` is an **Observer**. It runs the provided function immediately, tracking any reactive state accessed during execution. When any of those dependencies change, the effect re-runs.

```tsx
import { setup, mutable, effect } from '@anchorlib/react';

export const Logger = setup(() => {
  const state = mutable({ count: 0 });

  // 1. Runs immediately
  // 2. Tracks 'state.count'
  // 3. Re-runs whenever 'state.count' changes
  effect(() => {
    console.log('Count changed to:', state.count);
  });

  return () => <button onClick={() => state.count++}>Increment</button>;
});
```

## Key Differences from `useEffect`

If you are coming from React, `effect` is similar to `useEffect`, but with major improvements:

1.  **No Dependency Array**: You never need to manually list dependencies. Anchor tracks them automatically.
2.  **No Stale Closures**: Since `effect` is usually defined inside `setup` (which runs once), it always has access to the latest scope.
3.  **Synchronous (by default)**: Effects run synchronously after state changes (unless batched), ensuring consistency.
4.  **Dynamic Dependency Tracking**: Unlike `useEffect`, which tracks dependencies statically (via the array), `effect` tracks dependencies **dynamically based on execution path**.

```tsx
effect(() => {
  if (state.showDetails) {
    console.log(state.details); // Tracks 'details' ONLY if 'showDetails' is true
  }
});
```

-   If `showDetails` is `false`, `state.details` is NOT tracked. Changing `details` will NOT trigger the effect.
-   If `showDetails` becomes `true`, the effect re-runs, reads `details`, and starts tracking it.

**Why this matters:**
-   **Performance**: Your effect only re-runs when *relevant* data changes. If a branch is not taken, its dependencies don't cause updates.
-   **Correctness**: You don't need to worry about "stale" dependencies or manually managing dependency arrays. The system always knows exactly what the effect needs *right now*.

## Cleanup

Effects can return a cleanup function. This function runs:
1.  Before the effect re-runs (due to a dependency change).
2.  When the component unmounts.

This is essential for cleaning up timers, subscriptions, or event listeners.

```tsx
const state = mutable({ delay: 1000 });

effect(() => {
  // This effect depends on 'state.delay'
  const id = setInterval(() => {
    console.log('Tick');
  }, state.delay);

  // Cleanup runs when:
  // 1. 'state.delay' changes (before the new interval starts)
  // 2. Component unmounts
  return () => {
    clearInterval(id);
    console.log('Timer cleared');
  };
});
```

## Best Practices

### 1. Keep Effects Focused
Don't put unrelated logic in a single effect. Create multiple effects for different concerns.

```tsx
// ❌ Bad: Mixed concerns
effect(() => {
  console.log(user.name);
  document.title = settings.title;
});

// ✅ Good: Separate effects
effect(() => console.log(user.name));
effect(() => document.title = settings.title);
```

### 2. Avoid Circular Dependencies
While Anchor prevents simple infinite loops (like `state.count++` inside an effect) by logging an error, you should still avoid **Circular Dependencies** between multiple effects.

```tsx
// ❌ Circular Dependency Risk
effect(() => {
  if (theme.mode === 'light') settings.color = 'blue';
});

effect(() => {
  if (settings.color === 'blue') theme.mode = 'light';
});
```

This creates a cycle: Effect A updates `settings` -> triggers Effect B -> updates `theme` -> triggers Effect A. Anchor will eventually catch this stack overflow, but it's bad logic.
