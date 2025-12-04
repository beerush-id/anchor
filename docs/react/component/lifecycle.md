---
title: "Lifecycle Handlers"
description: "Managing component lifecycle with onMount() and onCleanup()."
keywords:
  - onMount
  - onCleanup
  - lifecycle
  - setup
---

# Lifecycle Handlers

Anchor provides two primary lifecycle hooks: `onMount` and `onCleanup`. These allow you to run code at specific points in a component's life.

## `onMount()`

The `onMount` handler runs **once** when the component is successfully mounted to the DOM.

### Usage
Since `setup` also runs once during initialization, you might wonder when to use `onMount`.

-   **`setup` body**: Runs *during* component creation (before DOM attachment). Use this for state initialization, defining effects, and event handlers.
-   **`onMount`**: Runs *after* the component is in the DOM. Use this for:
    -   Direct DOM manipulation (focusing inputs, measuring elements).
    -   Integrating with 3rd-party libraries that need DOM nodes.
    -   Starting animations.

```tsx
import { setup, onMount, nodeRef } from '@anchorlib/react';

export const AutoFocusInput = setup(() => {
  const inputRef = nodeRef<HTMLInputElement>();

  onMount(() => {
    // Safe to access DOM here
    inputRef.current?.focus();
    console.log('Input focused!');
  });

  return render(() => <input ref={inputRef} />);
});
```

### Returning Cleanup
For convenience, `onMount` can return a cleanup function, similar to `useEffect` in React. This is often cleaner than using a separate `onCleanup` call.

```tsx
onMount(() => {
  const id = setInterval(() => console.log('Tick'), 1000);

  // Cleanup on unmount
  return () => clearInterval(id);
});
```

## `onCleanup()`

The `onCleanup` handler runs when the component is **unmounted** (removed from the DOM).

### Usage
Use `onCleanup` to clean up any side effects created in `setup` or `onMount` that aren't automatically handled by `effect`.

-   Removing global event listeners (e.g., `window.addEventListener`).
-   Clearing timers (if not using `effect`).
-   Destroying 3rd-party instances (e.g., Chart.js, Maps).

```tsx
import { setup, onMount, onCleanup } from '@anchorlib/react';

export const WindowTracker = setup(() => {
  const handleResize = () => console.log('Resized');

  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    console.log('Cleaned up listener');
  });

  return render(() => <div>Resize the window</div>);
});
```

## Lifecycle Flow

1.  **Setup Phase**: The `setup` function executes. State is created.
2.  **Render**: The component renders its initial HTML.
3.  **Mount**: The HTML is inserted into the DOM.
4.  **`onMount`**: Handlers fire.
5.  **Updates**: `effect`s and templates re-run as state changes.
6.  **Unmount**: Component is removed from DOM.
7.  **`onCleanup`**: Handlers fire.

## Best Practices

### 1. Prefer `effect` for Data Fetching
If your data fetching depends on state (e.g., fetching user details when `userId` changes), use `effect` instead of `onMount`. `onMount` only runs once, so it won't react to prop changes.

```tsx
// ✅ Good: Re-fetches when props.id changes
effect(() => {
  fetchUser(props.id);
});
```

### 2. Use `onMount` for DOM Access
Only use `onMount` when you specifically need to interact with the DOM element (e.g., focusing, scrolling, measuring). For logic that doesn't need the DOM, put it directly in the `setup` body.

### 3. Always Clean Up
If you add an event listener or start a timer, **always** return a cleanup function or use `onCleanup`. Failing to do so causes memory leaks and unexpected behavior when components unmount and remount.
