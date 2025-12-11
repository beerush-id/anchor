---
title: "Overview: The Fundamental Shift"
description: "Why Anchor? Addressing the fundamental flaws of React's rendering model."
keywords:
  - anchor react
  - overview
  - philosophy
---

# Overview

As a React developer, you're constantly building dynamic user interfaces. While React excels at declarative UI, managing
state effectively and ensuring your application remains fast and responsive as it grows can often become a significant
challenge.

Anchor is not just another state management library. It is a fundamental architectural shift designed to solve the core problem of modern React development: **The Rendering Model**.

## The Problems

React's "re-render everything" model was revolutionary, but as applications scale, it creates a cascade of issues that affect everyone from users to business owners.

### 1. User Experience (UX)
- **Lag & Jank**: Wasted re-renders and heavy VDOM diffing cause noticeable UI delays, especially in complex dashboards or lists.
- **Delayed Updates**: State changes that trigger massive component tree updates make the UI feel unresponsive.

### 2. Developer Experience (DX)
- **Hard to Scale**: As codebases grow, maintaining performance becomes a constant battle against React's rendering cycle.
- **Boilerplate & Dependency Hell**: Developers spend hours managing `useEffect` dependency arrays, `useMemo`, and `useCallback` just to prevent bugs.
- **Stale Closures**: The mental overhead of ensuring functions capture the latest state leads to subtle, hard-to-debug errors.
- **Onboarding Difficulty**: New developers struggle to understand the complex web of hooks and implicit re-render triggers.

### 3. Business Impact
- **Development**: Slow and expensive. Teams spend valuable time optimizing performance and debugging hooks instead of building features.
- **Maintenance**: Slower and more expensive. The "re-render cascade" and dependency hell make legacy code fragile, increasing technical debt.
- **AI Costs**:
    - **Development**: High token consumption due to verbose boilerplate.
    - **Maintenance**: Significantly higher costs as AI needs more context to understand implicit dependencies.
    - **Success Rate**: Lower accuracy as AI struggles with React's rendering rules and stale closures.

## The Solution

Anchor solves these problems through **Separation of Concerns**, dividing your component into two distinct layers:

### Component: The Logic Layer
Runs **once** when the component is created. Your state, logic, and effects live here. Because it never re-executes, your closures are never stale, and your logic is stable by default.

### View: The Presentation Layer
A fine-grained reactive renderer that binds your stable state to the UI. When state changes, **only the specific parts that depend on that state update**—nothing else.

```tsx
import { setup, mutable, snippet, render } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup(() => {
  // Runs once. Logic is stable, no dependency arrays needed.
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  // ━━━ VIEW (Presentation Layer) ━━━
  // Reactive Snippet - only re-runs when state.count changes
  const Count = snippet(() => <h1>{state.count}</h1>, 'Count');

  // Static Layout - runs once, never re-renders
  return (
    <>
      <Count />
      <button onClick={increment}>Increment</button>
    </>
  );
}, 'Counter');
```

::: tip Scalability Note
At first glance, this might look like more boilerplate for a simple counter. However, in real-world applications, this architecture saves you from the "re-render cascade". Your layout, event handlers, and static content remain stable, while only the dynamic parts (like `<Count />`) update.
:::

## Key Features

Anchor combines the best of modern reactivity with React's ecosystem.

### Fine-Grained Reactivity
Dependencies are tracked automatically at the property level. If you update `state.user.name`, only the View displaying the name updates. The rest of your component (and its parents/children) remains untouched.

### Universal Components
Write your Component once. It works seamlessly as **Static HTML** in **React Server Components** (RSC) and as a **Reactive Component** on the Client. No code duplication, no mental context switching.

### Efficient Rendering
You have full control over the rendering strategy:
*   **Template**: Create standalone, reusable Views that update independently
*   **Snippet**: Create scoped Views inside Components that access local state
*   **Component View**: The primary reactive View returned immediately via `render()`
*   **Static Layout**: Return non-reactive JSX for parts that never change
*   **Direct DOM Binding**: Bypass React entirely for high-frequency updates (animations, drag-and-drop) by binding directly to DOM attributes

### True Immutability (Optional)
While `mutable` is sufficient for most local component state, Anchor offers **True Immutability** for shared application state (like User or Settings). It ensures safety when sharing state across components without worrying about accidental mutations.
*   **Controlled Writes**: Define exactly where and how state can be modified
*   **Runtime Safety**: Runtime protection against unauthorized changes

### Data Integrity (Optional)
Built-in integration with **Zod** schema validation and TypeScript ensures your shared state is always valid.
*   **Schema Validation**: Runtime checks prevent invalid data from entering your state
*   **Type Safety**: Compile-time checks catch errors before you run your code

## Next Step

Ready to start building? Head to the [**Getting Started**](/react/getting-started) guide.

Curious how Anchor compares to Redux, Zustand, Jotai, or MobX? See the [**Comparison**](/react/comparison).
