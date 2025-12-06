---
title: "Side Effect"
description: "Manage side effects with effect() and control dependencies with untrack()."
keywords:
  - effect
  - side effects
  - reactivity
  - untrack
---

# Side Effect

Side effects are operations that reach outside the reactive system, such as modifying the DOM, making API calls, or setting timers. Anchor provides tools to manage these effects and control exactly when they run.

## Tracking Dependencies

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

> [!WARNING] ⚠️ Automatic Tracking
> Anchor tracks **every** reactive property accessed synchronously within the effect. This includes properties accessed inside helper functions, loops, or serialization methods like `JSON.stringify()`. **If you read it, you subscribe to it.**

### Cleanup

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

## Untracking Dependencies

Sometimes you need to read a reactive value inside an effect *without* subscribing to it. For this, Anchor provides the `untrack()` function.

`untrack` runs the provided function and returns its result, but ignores any reactive property accesses that happen inside it.

```tsx
import { effect, untrack } from '@anchorlib/react';

effect(() => {
  // 1. Trigger: Run whenever the document content changes
  const content = doc.content;

  // 2. Untrack value: Get the current API endpoint
  // Changing the API URL in settings shouldn't force an immediate save
  const endpoint = untrack(() => settings.saveUrl);

  // 3. Untrack execution: Perform the fetch
  // We don't want to track 'auth.token' here either
  untrack(() => {
    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ content }),
      headers: { 'Authorization': auth.token }
    });
  });
});
```

In this example:
- The effect re-runs when `doc.content` changes.
- The effect **does not** re-run when `settings.saveUrl` or `auth.token` changes, even though we read them.



### Snapshots

Alternatively, you can create a safe copy of the state using `snapshot()`. This creates a deep clone of the current state that is **not reactive**, making it safe for serialization or logging.

```tsx
import { snapshot, effect } from '@anchorlib/react';

effect(() => {
  // snapshot(state) returns a deep copy (clone)
  // Perfect for serialization or sending to an API
  const copy = snapshot(state);
  
  const json = JSON.stringify(copy); // Safe! No tracking.
});
```

> [!TIP] Performance
> `snapshot()` performs a **deep clone** by default, which ensures complete safety but adds overhead. If you need a faster clone and are sure you won't accidentally mutate nested properties, you can use `snapshot(state, false)` to perform a **shallow copy**.
>
> **Both are safe for serialization** because the returned object is a plain JavaScript object, detached from the reactivity system.

## Global Subscription

When you need to listen to *any* change in a state object (for example, to trigger a log or a unified save), using `effect` can be tedious because you have to manually access every property to track it.

For this, Anchor provides the `subscribe` function.

`subscribe(state, handler, recursive? = true)`

- **state**: The reactive object.
- **handler**: A function called with the new state and the event details.
- **recursive**: Whether to listen to nested changes (default: `true`).

```tsx
import { subscribe } from '@anchorlib/react';

const user = mutable({ name: 'John', settings: { theme: 'dark' } });

// Triggers on ANY change to 'user' or its children
subscribe(user, (val, event) => {
  console.log('Something changed!', event);
  console.log('New State:', val);
});

user.settings.theme = 'light'; // Triggers the subscriber
```

#### `subscribe` vs `effect`

| Feature | `effect(() => ...)` | `subscribe(state, ...)` |
| :--- | :--- | :--- |
| **Tracking** | **Automatic & Granular**. Tracks only what you read. | **Global**. Tracks the entire object tree. |
| **Execution** | Runs **immediately**, then on updates. | Runs **only on updates**. |
| **Best For** | UI updates, precise side effects. | Logging, debugging, etc. |



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

### 3. Control Dependencies

Anchor tracks **everything** you access. Be careful with operations that read too much data, like `JSON.stringify(state)` or iterating over object keys, as they will subscribe to every property.

Use `untrack()` or `snapshot()` to safely read data without over-subscribing. (See **Untracking Dependencies** above).

```tsx
// ❌ Reads every property -> Updates on ANY change
effect(() => console.log(JSON.stringify(user))); 

// ✅ Snapshot reads once (safe copy) -> Updates ONLY when needed (if tracking upstream)
effect(() => {
  const copy = snapshot(user);
  console.log(JSON.stringify(copy)); 
});
```

