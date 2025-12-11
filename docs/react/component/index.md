# Component Architecture

Anchor components follow the **Separation of Concerns** principle, clearly dividing your application into two distinct layers:

1. **Component (Logic Layer)** - Runs **once**, defines state and behavior
2. **View (Presentation Layer)** - Runs **reactively**, displays UI based on state

This separation creates stable, predictable components where logic never re-executes and only the UI updates when state changes.

```tsx
import { setup, render, mutable } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup((props) => {
  // State and logic - runs once
  const state = mutable({ count: 0 });

  const increment = () => {
    state.count++;
  };

  // ━━━ VIEW (Presentation Layer) ━━━
  // Runs reactively when state.count changes
  return render(() => (
    <button onClick={increment}>
      Count: {state.count}
    </button>
  ));
}, 'Counter');
```

## Component: The Logic Layer

The [**Component**](/react/component/setup) is your constructor—a container for state, logic, and effects. It runs exactly once when the component is created, providing a stable foundation for your UI.

A Component defines:
- **State** - Reactive data that persists for the component's lifetime
- **Logic** - Functions and computations that operate on state
- **Effects** - Side effects that respond to state changes

Because the Component runs only once, your functions are stable and always reference the current state—no stale closures, no dependency arrays.

## View: The Presentation Layer

The [**View**](/react/component/view) displays your data to users. It's reactive—automatically tracking which state properties it reads and re-rendering only when those specific properties change.

A Component can have:
- **Component View** - The primary reactive View returned immediately, tied to the Component's output.
- **Templates** - Standalone, reusable Views that rely on props.
- **Snippets** - Scoped Views defined inside the Component with access to its state.

## Why Separation of Concerns?

In standard React, logic and view are tightly coupled—the component function re-executes on every render, recreating functions, recalculating values, and requiring complex patterns like `useCallback`, `useMemo`, and dependency arrays to maintain stability. This coupling creates several problems:

- **Stale closures** - Functions capture outdated state, causing subtle bugs
- **Performance overhead** - Expensive logic re-runs unnecessarily on every render
- **Hard to read** - Logic and view mixed together makes code difficult to understand and maintain
- **Complexity** - Dependency arrays and memoization add cognitive load and maintenance burden

These problems force developers to spend more time debugging, optimizing, and maintaining code instead of building features—directly impacting productivity.

Anchor's Separation of Concerns solves these problems:

### Stability
Component logic runs once and stays stable. Functions, event handlers, and effects are never recreated—your functions always reference the current state without stale closures or dependency arrays.

### Performance
Only the View re-runs when state changes. The Component (containing your expensive initialization, computations, and business logic) never re-executes.

### Readability
Logic and view are clearly separated. You can read the Component to understand what the component does, and read the View to understand what it looks like—no more mental parsing of mixed concerns.

### Simplicity
No `useCallback`, no `useMemo`, no dependency arrays. Write straightforward code and let the architecture handle optimization automatically.

**The result**: developers spend less time debugging, optimizing, and maintaining—and more time building features.

## Core Concepts

- [Component](/react/component/setup) - Creating the Logic Layer
- [View & Template](/react/component/view) - Creating the Presentation Layer
- [Lifecycle](/react/component/lifecycle) - Component lifecycle and effects
- [Binding & Refs](/react/component/binding) - Interacting with DOM elements
