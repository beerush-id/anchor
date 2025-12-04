---
title: "Overview: The Fundamental Shift"
description: "Why Anchor? Addressing the fundamental flaws of React's rendering model."
keywords:
  - anchor react
  - overview
  - philosophy
---

# Overview

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

Anchor solves these problems by separating your component into two distinct phases, moving away from "UI = f(state)" to a more stable and efficient model.

### 1. Setup (Stable)
Runs **once** when the component is created. Your logic, state initialization, and side effects live here. Because it never re-runs, your closures are never stale, and your logic is stable by default.

### 2. Template (Reactive)
A fine-grained reactive renderer that binds your stable state to the DOM. It isolates view updates so that when state changes, **only the specific parts of the DOM that need to update are touched**.

```tsx
import { setup, mutable, template } from '@anchorlib/react';

export const Counter = setup(() => {
  // Setup: Runs Once
  // Logic is stable, no dependency arrays needed.
  const state = mutable({ count: 0 });

  const increment = () => state.count++;

  // Template: Reactive
  // Only this part re-runs when state.count changes.
  const Count = template(() => <h1>{state.count}</h1>);

  // Main Render: Static
  // This part runs once. The button and handler are never re-created.
  return (
    <>
      <Count />
      <button onClick={increment}>Increment</button>
    </>
  );
});
```

::: tip Scalability Note
At first glance, this might look like more boilerplate for a simple counter. However, in real-world applications, this architecture saves you from the "re-render cascade". Your layout, event handlers, and static content remain stable, while only the dynamic parts (like `<Count />`) update.
:::

## Key Features

Anchor combines the best of modern reactivity with React's ecosystem.

### Universal Components
Write your component once. It works seamlessly as **Static HTML** in React Server Components (RSC) and as a **Reactive Component** on the Client. No code duplication, no mental context switching.

### Fine-Grained Reactivity
Dependencies are tracked automatically at the property level. If you update `state.user.name`, only the text node displaying the name updates. The rest of your component (and its parents/children) remains untouched.

### True Immutability (Optional)
While `mutable` is sufficient for most local component state, Anchor offers **True Immutability** for shared application state (like User or Settings). It ensures safety when sharing state across components without worrying about accidental mutations.
*   **Controlled Writes**: Use contracts to define exactly where and how state can be modified.
*   **Proxy Safety**: Runtime protection against unauthorized changes.

### Data Integrity (Optional)
Often used with immutable state, built-in integration with **Zod** schema validation and TypeScript ensures your shared state is always valid.
*   **Schema Validation**: Runtime checks prevent invalid data from entering your state.
*   **Type Safety**: Compile-time checks catch errors before you run your code.

### Efficient Rendering
You have full control over the rendering strategy:
*   **`template`**: Control *when* and *what* to render within the React tree.
*   **`nodeRef`**: Bypass React's renderer entirely for high-frequency updates (like animations or drag-and-drop) by binding directly to DOM attributes.
