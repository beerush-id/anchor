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

```tsx
import { setup, mutable, effect } from '@anchorlib/react';

export const Logger = setup(() => {
  const state = mutable({ count: 0 });

  // 1. Runs immediately
  // 2. Automatically tracks 'state.count'
  // 3. Re-runs whenever 'state.count' changes
  effect(() => {
    console.log('Count changed to:', state.count);
  });

  return () => <button onClick={() => state.count++}>Increment</button>;
});
```

> [!WARNING] ⚠️ Automatic Tracking
> Anchor tracks **every** reactive property accessed synchronously within the effect. This includes properties accessed inside helper functions, loops, or serialization methods like `JSON.stringify()`. **If you read it, you subscribe to it.**

### Managing Resources

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

## Reading Without Subscribing

Sometimes you need to read a reactive value inside an effect *without* subscribing to it. This allows you to use the current value of a state without triggering a re-run when that state updates.

You can use `untrack()` to ignore specific dependencies.

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

### Stringify

For serialization without dependency tracking, Anchor provides `stringify()`. Unlike `JSON.stringify(state)`, which would track every property accessed during serialization, `stringify()` works directly with the underlying object without creating a deep clone.

```tsx
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



## Comparison with React Hooks

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

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, mutable, effect, untrack, snippet } from '@anchorlib/react';

export const DynamicTrackingDemo = setup(() => {
  const state = mutable({ 
    showDetails: false,
    name: 'Alice',
    details: 'Software Engineer',
    effectRunCount: 0,
    lastTracked: [] as string[]
  });

  // Effect with dynamic dependency tracking
  effect(() => {
    const tracked: string[] = [];
    
    // Always tracks showDetails
    tracked.push('showDetails');
    
    if (state.showDetails) {
      // Only tracks 'details' when showDetails is true
      console.log('Details:', state.details);
      tracked.push('details');
    }
    
    // Update tracking info WITHOUT triggering the effect again
    untrack(() => {
      state.effectRunCount++;
      state.lastTracked = tracked;
    });
  });

  // Snippet for effect stats (updates when effect runs)
  const EffectStats = snippet(() => (
    <div style={{ marginBottom: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Effect Run Count:</strong> {state.effectRunCount}<br />
      <strong>Currently Tracking:</strong> {state.lastTracked.join(', ')}
    </div>
  ), 'EffectStats');

  // Snippet for checkbox (updates when showDetails changes)
  const DetailsToggle = snippet(() => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input 
          type="checkbox"
          checked={state.showDetails}
          onChange={() => state.showDetails = !state.showDetails}
        />
        <strong>Show Details</strong>
      </label>
      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 24px' }}>
        Toggle this to change what the effect tracks
      </p>
    </div>
  ), 'DetailsToggle');

  // Snippet for input fields
  const InputFields = snippet(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Name:
        </label>
        <input 
          value={state.name}
          onInput={(e) => state.name = e.currentTarget.value}
          style={{ width: '100%', padding: '8px' }}
        />
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
          ⚠️ Changing this will NOT trigger the effect
        </p>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Details:
        </label>
        <input 
          value={state.details}
          onInput={(e) => state.details = e.currentTarget.value}
          style={{ width: '100%', padding: '8px' }}
        />
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
          {state.showDetails 
            ? '✅ Tracked! Changing this will trigger the effect' 
            : '⚠️ Not tracked. Enable "Show Details" first'}
        </p>
      </div>
    </div>
  ), 'InputFields');

  // Static layout
  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Dynamic Dependency Tracking</h3>
      <EffectStats />
      <DetailsToggle />
      <InputFields />
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#fff3cd', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>How it works:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>The effect always tracks <code>showDetails</code></li>
          <li>When <code>showDetails</code> is true, it also tracks <code>details</code></li>
          <li>When <code>showDetails</code> is false, <code>details</code> is not tracked</li>
          <li><code>name</code> is never tracked by the effect</li>
          <li><code>untrack()</code> prevents the effect from tracking its own mutations</li>
        </ul>
      </div>
    </div>
  );
}, 'DynamicTrackingDemo');

export default DynamicTrackingDemo;
```

:::

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

