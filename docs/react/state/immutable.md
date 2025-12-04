---
title: "Immutable State"
description: "Understanding Anchor's read-only proxies and write contracts."
keywords:
  - immutable
  - read-only
  - write contract
  - shared state
---

# Immutable State

`immutable()` creates a **Read-Only Gateway** to your state. It allows you to expose state to consumers while preventing them from modifying it directly.

## Creating Immutable State

You can create immutable state just like mutable state, but using the `immutable` function.

```ts
import { immutable } from '@anchorlib/react';

const state = immutable({
  count: 0,
  user: { name: 'John' }
});

// Reading is fine
console.log(state.count);

// Mutation is FORBIDDEN
state.count++; // Logs error and ignores the update
```

> [!NOTE]
> Like `mutable`, `immutable` creates a **Stable Reference**. The object identity doesn't change, but the properties are read-only.

## Write Contracts (`writable`)

To modify an immutable state, you must create a **Write Contract** using `writable()`. This API allows you to create a mutable handle to the same underlying state.

### Unrestricted Write Access
If you don't provide a list of keys, `writable` returns a full mutable proxy.

```ts
import { immutable, writable } from '@anchorlib/react';

const state = immutable({ count: 0 });
const writer = writable(state);

// Now you can mutate via the writer
writer.count++;

console.log(state.count); // 1
```

### Restricted Write Access
You can restrict which properties can be mutated by passing an array of allowed keys.

```ts
const settings = immutable({
  theme: 'dark',
  notifications: true
});

// Create a writer that ONLY allows changing 'theme'
const themeWriter = writable(settings, ['theme']);

themeWriter.theme = 'light'; // ✅ Allowed
themeWriter.notifications = false; // ❌ Logs error, ignored
```

## Use Case: Shared State

The combination of `immutable` and `writable` is perfect for creating **Shared Stores**. You can expose the read-only state to the rest of your app while keeping the write logic private.

```ts
// stores/theme.ts
import { immutable, writable } from '@anchorlib/react';

// 1. Create the immutable state (Public)
export const themeState = immutable({
  mode: 'light',
  accent: 'blue'
});

// 2. Create a private writer
const writer = writable(themeState);

// 3. Expose methods to modify state
export const toggleTheme = () => {
  writer.mode = writer.mode === 'light' ? 'dark' : 'light';
};

export const setAccent = (color: string) => {
  writer.accent = color;
};
```

**In your components:**

```tsx
import { themeState, toggleTheme } from './stores/theme';

export const ThemeToggler = setup(() => {
  return render(() => (
    <button onClick={toggleTheme}>
      Current mode: {themeState.mode}
    </button>
  ));
}, 'ThemeToggler');
```

This pattern ensures **Unidirectional Data Flow**:
1.  Components read from `themeState`.
2.  Components call actions (`toggleTheme`).
3.  Actions mutate the state via `writer`.
4.  State updates propagate to components.

## Advanced Options

`immutable` supports the same advanced options as `mutable`.

```ts
const list = immutable([1, 2, 3], {
  recursive: 'flat' // Only track array structure changes
});
```

## Best Practices

### Prefer Restricted Access
For shared state, **always prefer `immutable` over `mutable`**. Exposing mutable state globally invites "spaghetti code" where any component can change the state in unpredictable ways.

- **Public**: `immutable` (Read-Only)
- **Private**: `writable` (Restricted Write)

This enforces a clear contract: "You can look, but you can't touch—unless you use the provided actions."

### Use Restricted Writers
When creating a writer, **always provide the list of allowed keys** if possible. This creates a "Least Privilege" writer that can be safely passed to sub-components or helpers without giving them full write access to the entire state tree.

```ts
// ✅ Prefer: Only allows changing 'theme'
const themeWriter = writable(settings, ['theme']);

// ❌ Avoid: Gives full write access to everything
const fullWriter = writable(settings);
```
