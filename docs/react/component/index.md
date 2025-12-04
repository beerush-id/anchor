# Component Architecture

Anchor introduces a **Setup/Template** pattern for building React components. This architecture separates your component's **logic** (state, effects, handlers) from its **view** (JSX).

## The Pattern

An Anchor component consists of two distinct parts:

1.  **Setup Phase**: Runs **once** when the component mounts. This is where you define state, create effects, and declare event handlers.
2.  **Reactive Phase**: Runs **reactively** whenever state changes. This is where you return your JSX.

```tsx
import { setup, render, mutable } from '@anchorlib/react';

export const Counter = setup((props) => {
  // --- SETUP PHASE (Runs Once) ---
  const state = mutable({ count: 0 });

  const increment = () => {
    state.count++;
  };

  // --- REACTIVE PHASE (Runs Reactively) ---
  return render(() => (
    <button onClick={increment}>
      Count: {state.count}
    </button>
  ));
}, 'Counter');
```

## Why this pattern?

### 1. No Stale Closures
In standard React, every render recreates your functions, leading to "stale closure" issues if you're not careful with dependency arrays. In Anchor, your setup code runs once, so your functions (like `increment` above) are stable and always have access to the latest state references.

### 2. Fine-Grained Reactivity
The `render` function is wrapped in a reactive observer. It tracks exactly which state properties are accessed during render. When `state.count` changes, only the `render` part re-runs. The `setup` part does not re-run.

### 3. Cleaner Code
You don't need `useCallback`, `useMemo`, or dependency arrays for most things.
- **State**: Created once, stays stable.
- **Functions**: Defined once, stay stable.
- **Effects**: Defined once, track dependencies automatically.

## Core Concepts

- [Setup Function](/react/component/setup) - The entry point for your component logic.
- [Template Function](/react/component/template) - Creating reusable reactive views.
- [Reactive Props](/react/component/props) - How props work as reactive proxies.
- [Lifecycle Handlers](/react/component/mount-handler) - `onMount`, `onCleanup`, and `effect`.
- [Binding & Refs](/react/component/binding) - interacting with DOM elements.
