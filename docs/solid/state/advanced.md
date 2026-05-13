---
title: "Advanced State Management"
description: "Mastering Global, Headless, and Local state patterns in Anchor."
---

# Advanced State Management

While `mutable` and `derived` are powerful on their own, scaling an application requires choosing the right *scope* for your state. In this guide, we'll explore three common patterns: **Global State**, **Headless State**, and **Local State**, along with their best practices and potential pitfalls.

## Global State

Global state is state that is accessible from anywhere in your application, usually defined at the module scope (top-level variable in a file).

```ts
// store.ts
import { mutable } from '@anchorlib/core';

// This is a global state
export const appState = mutable({
  theme: 'dark',
  sidebarOpen: false
});
```

### Pros
- **Simplicity**: Just import and use. No Context providers or prop drilling required.
- **Convenience**: Great for truly static configuration or singleton resources in Client-Side Rendering (CSR).

### Cons
- **SSR Risk (Critical)**: In a Server-Side Rendering (SSR) environment, module-level variables are shared across **all requests**. If one user changes `appState.theme`, *every* concurrent user on that server instance sees the change. This creates data leaks and race conditions.
- **Testing**: Harder to reset between tests since the state persists in the module.

### Best Practice
- **Use for**: App-wide constants, configuration that never changes at runtime, or strictly CSR-only applications.
- **Avoid for**: User sessions, request-specific data, or anything that changes based on the user.
- **Alternative**: For SSR-safe global state, use Anchor's Context API by injecting `setContext(KEY, state)` at your root layout and retrieving it with `getContext(KEY)` where needed.

## Headless State

Headless state involves separating *business logic* from the *UI*. In Anchor, this is simply "Data + Behavior". You don't need special hooks; just use standard JavaScript patterns like **Classes** or **Objects with Methods**.

### Option 1: Factory Function (Plain Object)

The simplest way is a function returning a reactive object with methods.

```ts
// counter.ts
import { mutable } from '@anchorlib/core';

export function createCounter() {
  return mutable({
    count: 0,
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    }
  });
}
```

### Option 2: Class Pattern

For more complex logic, Classes offer better structure and inheritance. You can pass a class instance directly to `mutable()`, and the proxy engine will automatically track mutations, even when methods use `this`.
  
> [!WARNING] Deep Reactivity
> Wrapping the entire class instance with `mutable()` makes all of its properties deeply reactive. If your class contains properties that should remain passive (non-reactive) for performance or logic reasons, do **not** wrap the class instance. Instead, initialize only specific properties with `mutable()` inside the class.

```ts
// tabs.ts
import { mutable } from '@anchorlib/core';

export class TabState {
  public active: string;

  constructor(init?: string) {
    this.active = init ?? 'home';
  }

  public setActive(tab: string) {
    this.active = tab;
  }
}

export function createTab(initial?: string) {
  return mutable(new TabState(initial));
}
```

### Pros
- **Encapsulation**: logic stays with data (e.g., `counter.increment()` or `tab.setActive()`).
- **Flexibility**: Use whatever JS pattern you prefer (Object, Class, Factory).
- **Testability**: Logic is independent of UI.

### Cons
- **Binding**: Need to expose the instance to the view.

### Best Practice
- **Use for**: Complex, reusable UI logic like Tabs, Forms, Accordions, Toasts, or Data Grids.
- **Pattern**: Group state and methods together using **Classes** OR **Factory Functions**. Both are valid; choose based on complexity and team preference.

## Local State

Local state is state that is created and destroyed with a specific component instance. In Solid, this is simply defined inside the component function.

```tsx
import { mutable } from '@anchorlib/solid';

export const Counter = () => {
  // This state is local to this instance of Counter
  // Since Solid components run once, this mutable is created once per instance.
  const state = mutable({ count: 0 });

  return (
    <button onClick={() => state.count++}>
      Count: {state.count}
    </button>
  );
};
```

### Pros
- **Safety**: State is automatically garbage collected when the component unmounts. No risk of data leaking between users or sessions.
- **Isolation**: Each component instance is independent.

### Cons
- **Sharing**: Harder to share with siblings or safe-distant cousins without lifting state up or using Context.

### Best Practice
- **Use for**: UI interaction state (toggles, form inputs), transient data, and individual list items.
- **Combine**: Use Local State for the component's internal needs and receive Headless/Global state via props for shared data.
