---
title: "Side Effect"
description: "Manage side effects with effect() and control dependencies with untrack()."
keywords:
  - effect
  - side effects
  - reactivity
  - untrack
---

# Side Effects

Side effects are operations that reach outside the reactive system, such as modifying the DOM, making API calls, or setting timers. You can define these operations to run automatically whenever their dependencies change.

## Effect

You can execute code immediately and automatically re-run it whenever the state it accesses changes. This creates a reactive link between your state and the outside world.

::: code-group

```tsx [React]
import { setup, render, mutable, effect } from '@anchorlib/react';

export const Logger = setup(() => {
  const state = mutable({ count: 0 });

  // 1. Runs immediately
  // 2. Automatically tracks 'state.count'
  // 3. Re-runs whenever 'state.count' changes
  effect(() => {
    console.log('Count changed to:', state.count);
  });

  return render(() => <button onClick={() => state.count++}>Increment</button>);
});
```

```tsx [SolidJS]
import { mutable, effect } from '@anchorlib/solid';

export const Logger = () => {
  const state = mutable({ count: 0 });

  // 1. Runs immediately
  // 2. Automatically tracks 'state.count'
  // 3. Re-runs whenever 'state.count' changes
  effect(() => {
    console.log('Count changed to:', state.count);
  });

  return <button onClick={() => state.count++}>Increment</button>;
};
```

:::

> [!WARNING] ⚠️ Automatic Tracking
> Anchor tracks **every** reactive property accessed synchronously within the effect. This includes properties accessed inside helper functions, loops, or serialization methods like `JSON.stringify()`. **If you read it, you subscribe to it.**

### Managing Resources

Effects can return a cleanup function. This function runs:
1.  Before the effect re-runs (due to a dependency change).
2.  When the component unmounts.

This is essential for cleaning up timers, subscriptions, or event listeners.

::: code-group

```tsx [React]
import { mutable, effect } from '@anchorlib/react';

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

```tsx [SolidJS]
import { mutable, effect } from '@anchorlib/solid';

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

:::

## Reading Without Subscribing

Sometimes you need to read a reactive value inside an effect *without* subscribing to it. This allows you to use the current value of a state without triggering a re-run when that state updates.

You can use `untrack()` to ignore specific dependencies.

`untrack` runs the provided function and returns its result, but ignores any reactive property accesses that happen inside it.

::: code-group

```tsx [React]
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

```tsx [SolidJS]
import { effect, untrack } from '@anchorlib/solid';

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

:::

In this example:
- The effect re-runs when `doc.content` changes.
- The effect **does not** re-run when `settings.saveUrl` or `auth.token` changes, even though we read them.

### Snapshots

Alternatively, you can create a safe copy of the state using `snapshot()`. This creates a deep clone of the current state that is **not reactive**, making it safe for serialization or logging.

::: code-group

```tsx [React]
import { snapshot, effect } from '@anchorlib/react';

effect(() => {
  // 1. Explicitly track 'state.name' to trigger this effect
  if (state.name) {
    // 2. snapshot(state) returns a deep copy WITHOUT tracking all nested properties
    // Perfect for safe serialization
    const copy = snapshot(state);
    const json = JSON.stringify(copy); // Safe! Doesn't subscribe to everything.
  }
});
```

```tsx [SolidJS]
import { snapshot, effect } from '@anchorlib/solid';

effect(() => {
  // 1. Explicitly track 'state.name' to trigger this effect
  if (state.name) {
    // 2. snapshot(state) returns a deep copy WITHOUT tracking all nested properties
    // Perfect for safe serialization
    const copy = snapshot(state);
    const json = JSON.stringify(copy); // Safe! Doesn't subscribe to everything.
  }
});
```

:::

> [!TIP] Performance
> `snapshot()` performs a **deep clone** by default, which ensures complete safety but adds overhead. If you need a faster clone and are sure you won't accidentally mutate nested properties, you can use `snapshot(state, false)` to perform a **shallow copy**.
>
> **Both are safe for serialization** because the returned object is a plain JavaScript object, detached from the reactivity system.

### Stringify

For serialization without dependency tracking, Anchor provides `stringify()`. Unlike `JSON.stringify(state)`, which would track every property accessed during serialization, `stringify()` works directly with the underlying object without creating a deep clone.

::: code-group

```tsx [React]
import { stringify, effect } from '@anchorlib/react';

effect(() => {
  // ❌ Tracks every property in 'user' -> Re-runs on ANY change
  const json = JSON.stringify(user);
  
  // ✅ No tracking -> Safe serialization (works with underlying object)
  const json = stringify(user);
  
  // You can also pass replacer and space arguments
  const formatted = stringify(user, null, 2);
});
```

```tsx [SolidJS]
import { stringify, effect } from '@anchorlib/solid';

effect(() => {
  // ❌ Tracks every property in 'user' -> Re-runs on ANY change
  const json = JSON.stringify(user);
  
  // ✅ No tracking -> Safe serialization (works with underlying object)
  const json = stringify(user);
  
  // You can also pass replacer and space arguments
  const formatted = stringify(user, null, 2);
});
```

:::

`stringify(state, replacer?, space?)` accepts the same parameters as `JSON.stringify()`:
- **state**: The reactive state to stringify
- **replacer**: Optional replacer function to filter or transform values
- **space**: Optional spacing for formatting (number or string)

> [!TIP]
> `stringify()` is more efficient than `snapshot()` + `JSON.stringify()` because it doesn't perform a deep clone. It accesses the underlying object directly, bypassing the reactive proxy to avoid dependency tracking.

## Global Observability

When you need to listen to *any* change in a state object (for example, to trigger a log or a unified save), using `effect` can be tedious because you have to manually access every property to track it.

For this, Anchor provides the `subscribe` function.

`subscribe(state, handler, recursive? = true)`

- **state**: The reactive object.
- **handler**: A function called with the new state and the event details.
- **recursive**: Whether to listen to nested changes (default: `true`).

::: code-group

```tsx [React]
import { mutable, subscribe } from '@anchorlib/react';

const user = mutable({ name: 'John', settings: { theme: 'dark' } });

// Triggers on ANY change to 'user' or its children
subscribe(user, (val, event) => {
  console.log('Something changed!', event);
  console.log('New State:', val);
});

user.settings.theme = 'light'; // Triggers the subscriber
```

```tsx [SolidJS]
import { mutable, subscribe } from '@anchorlib/solid';

const user = mutable({ name: 'John', settings: { theme: 'dark' } });

// Triggers on ANY change to 'user' or its children
subscribe(user, (val, event) => {
  console.log('Something changed!', event);
  console.log('New State:', val);
});

user.settings.theme = 'light'; // Triggers the subscriber
```

:::

#### `subscribe` vs `effect`

| Feature | `effect(() => ...)` | `subscribe(state, ...)` |
| :--- | :--- | :--- |
| **Tracking** | **Automatic & Granular**. Tracks only what you read. | **Global**. Tracks the entire object tree. |
| **Execution** | Runs **immediately**, then on updates. | Runs **immediately**, then on updates. |
| **Best For** | UI updates, precise side effects. | Logging, debugging, etc. |

## Client-Side Effects

For effects that should only run in browser environments and should be skipped on the server, Anchor provides `effect.client`. This is particularly useful for effects that depend on browser-specific APIs or DOM manipulation.

`effect.client(fn, displayName?)`

- **fn**: The effect function to execute. It receives a StateChange event object containing information about what triggered the effect (init, set, delete, etc.) and which keys changed.
- **displayName**: Optional effect name for debugging purposes.

::: code-group

```tsx [React]
import { effect } from '@anchorlib/react';

// This effect will only run in browsers, not on the server
effect.client(() => {
  // Browser-specific code like:
  document.title = 'My App';
  window.addEventListener('scroll', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handler);
  };
});
```

```tsx [SolidJS]
import { effect } from '@anchorlib/solid';

// This effect will only run in browsers, not on the server
effect.client(() => {
  // Browser-specific code like:
  document.title = 'My App';
  window.addEventListener('scroll', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handler);
  };
});
```

:::

The function returns a cleanup function that can be called to manually dispose of the effect and unsubscribe from all tracked dependencies. This is automatically called when the current scope is cleaned up.

> [!NOTE]
> `effect.client` is identical to `effect` in behavior, except that it checks if the code is running in a browser environment before executing. If not in a browser, it returns an empty function that does nothing.

## Async Effects

When dealing with asynchronous operations inside effects, standard `async` functions can break the dependency tracking boundary. Because `await` pauses the execution context, any reactive state accessed *after* the `await` will fail to register as a dependency.

Anchor provides an experimental `effect.async` combined with `awaited()` to restore the tracking boundary across asynchronous gaps.

::: code-group

```tsx [React]
import { effect, awaited } from '@anchorlib/react';

// ❌ Standard async effect breaks tracking boundary
effect(async () => {
  const theme = state.theme; // Tracked properly

  await getCss(); // Execution pauses, tracking context is lost

  // This will NOT trigger a re-run if 'settings.compiler' changes later
  const canCompile = settings.compiler; // Breaks, out of boundary
});

// ✅ effect.async with awaited() restores tracking
effect.async(async () => {
  const theme = state.theme; // Tracked properly

  // Wrap the promise with awaited() to preserve tracking context
  await awaited(getCss());

  // This WILL trigger a re-run if 'settings.compiler' changes later
  const canCompile = settings.compiler; // Boundary restored
});
```

```tsx [SolidJS]
import { effect, awaited } from '@anchorlib/solid';

// ❌ Standard async effect breaks tracking boundary
effect(async () => {
  const theme = state.theme; // Tracked properly

  await getCss(); // Execution pauses, tracking context is lost

  // This will NOT trigger a re-run if 'settings.compiler' changes later
  const canCompile = settings.compiler; // Breaks, out of boundary
});

// ✅ effect.async with awaited() restores tracking
effect.async(async () => {
  const theme = state.theme; // Tracked properly

  // Wrap the promise with awaited() to preserve tracking context
  await awaited(getCss());

  // This WILL trigger a re-run if 'settings.compiler' changes later
  const canCompile = settings.compiler; // Boundary restored
});
```

:::

> [!WARNING] Experimental
> When using `effect.async`, **every** `await` inside the effect must be wrapped with the `awaited(promise)` function to ensure the tracking context survives the asynchronous pause.

## Comparison with React Hooks

If you are coming from React, `effect` is similar to `useEffect`, but with major improvements:

1.  **No Dependency Array**: You never need to manually list dependencies. Anchor tracks them automatically.
2.  **No Stale Closures**: Since `effect` is usually defined inside `setup` (which runs once), it always has access to the latest scope.
3.  **Synchronous (by default)**: Effects run synchronously after changes (unless batched), ensuring consistency.
4.  **Dynamic Dependency Tracking**: Unlike `useEffect`, which tracks dependencies statically (via the array), `effect` tracks dependencies **dynamically based on execution path**.

::: code-group

```tsx [React]
import { effect } from '@anchorlib/react';

effect(() => {
  if (state.showDetails) {
    console.log(state.details); // Tracks 'details' ONLY if 'showDetails' is true
  }
});
```

```tsx [SolidJS]
import { effect } from '@anchorlib/solid';

effect(() => {
  if (state.showDetails) {
    console.log(state.details); // Tracks 'details' ONLY if 'showDetails' is true
  }
});
```

:::

-   If `showDetails` is `false`, `state.details` is NOT tracked. Changing `details` will NOT trigger the effect.
-   If `showDetails` becomes `true`, the effect re-runs, reads `details`, and starts tracking it.

**Why this matters:**
-   **Performance**: Your effect only re-runs when *relevant* data changes. If a branch is not taken, its dependencies don't cause updates.
-   **Correctness**: You don't need to worry about "stale" dependencies or manually managing dependency arrays. The system always knows exactly what the effect needs *right now*.

## Best Practices

### 1. Keep Effects Focused
Don't put unrelated logic in a single effect. Create multiple effects for different concerns.

::: code-group

```tsx [React]
import { effect } from '@anchorlib/react';

// ❌ Bad: Mixed concerns
effect(() => {
  console.log(user.name);
  document.title = settings.title;
});

// ✅ Good: Separate effects
effect(() => console.log(user.name));
effect(() => document.title = settings.title);
```

```tsx [SolidJS]
import { effect } from '@anchorlib/solid';

// ❌ Bad: Mixed concerns
effect(() => {
  console.log(user.name);
  document.title = settings.title;
});

// ✅ Good: Separate effects
effect(() => console.log(user.name));
effect(() => document.title = settings.title);
```

:::

### 2. Avoid Circular Dependencies
While Anchor prevents simple infinite loops (like `state.count++` inside an effect) by logging an error, you should still avoid **Circular Dependencies** between multiple effects.

::: code-group

```tsx [React]
import { effect } from '@anchorlib/react';

// ❌ Circular Dependency Risk
effect(() => {
  if (theme.mode === 'light') settings.color = 'blue';
});

effect(() => {
  if (settings.color === 'blue') theme.mode = 'light';
});
```

```tsx [SolidJS]
import { effect } from '@anchorlib/solid';

// ❌ Circular Dependency Risk
effect(() => {
  if (theme.mode === 'light') settings.color = 'blue';
});

effect(() => {
  if (settings.color === 'blue') theme.mode = 'light';
});
```

:::

This creates a cycle: Effect A updates `settings` -> triggers Effect B -> updates `theme` -> triggers Effect A. Anchor will eventually catch this stack overflow, but it's bad logic.

### 3. Control Dependencies

Anchor tracks **everything** you access. Be careful with operations that read too much data, like `JSON.stringify(state)` or iterating over object keys, as they will subscribe to every property.

Use `untrack()` or `snapshot()` to safely read data without over-subscribing. (See **Untracking Dependencies** above).

::: code-group

```tsx [React]
import { effect, snapshot } from '@anchorlib/react';

// ❌ Reads every property -> Updates on ANY change
effect(() => console.log(JSON.stringify(user))); 

// ✅ Snapshot reads safely -> Updates ONLY when explicit dependencies change
effect(() => {
  // We track 'user.name' to trigger the update
  if (user.name) {
    const copy = snapshot(user);
    console.log(JSON.stringify(copy)); 
  }
});
```

```tsx [SolidJS]
import { effect, snapshot } from '@anchorlib/solid';

// ❌ Reads every property -> Updates on ANY change
effect(() => console.log(JSON.stringify(user))); 

// ✅ Snapshot reads safely -> Updates ONLY when explicit dependencies change
effect(() => {
  // We track 'user.name' to trigger the update
  if (user.name) {
    const copy = snapshot(user);
    console.log(JSON.stringify(copy)); 
  }
});
```

:::
