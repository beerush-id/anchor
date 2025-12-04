---
title: "The Template Function"
description: "Understanding the template function: The reactive rendering phase of an Anchor component."
keywords:
  - template function
  - reactive rendering
  - fine-grained updates
---

# The Template Function

The `template` function creates a **Reactive Component**. It wraps your render logic in an observer, ensuring that the component automatically re-renders whenever any reactive state accessed within it changes.

## How It Works

`template` is a Higher-Order Component (HOC). When the resulting component renders:
1.  It starts tracking dependencies.
2.  It executes your function to generate JSX.
3.  If any tracked dependency changes later, it re-runs the function to update the view.

```tsx
import { template, mutable } from '@anchorlib/react';

const state = mutable({ count: 0 });

// 1. Create a reactive component
const CounterView = template(() => (
  <div>{state.count}</div>
));

// 2. Use it like any React component
<CounterView />
```

## `render` vs `template`

Anchor provides a `render` utility, which is simply a shorthand for creating an anonymous template and rendering it immediately.

- **`template`**: Returns a **Component** (Function). Use this when you want to define a reusable view or break up a large component.
- **`render`**: Returns a **ReactNode** (JSX). Use this as the return value of `setup` for simple components.

```tsx
// Equivalent to: <AnonymousTemplate />
return render(() => <div>{state.count}</div>);
```

## Props Handling

Templates receive props just like any other React component. The key difference is that **props are reactive**.

### 1. Template Props
The first argument is the props passed directly to the template component.

```tsx
const Greeting = template<{ name: string }>(({ name }) => {
  return <div>Hello, {name}</div>;
});

// Usage
<Greeting name="World" />
```

### 2. Parent Props (Setup Props)
If a template is defined inside a `setup` function, it receives the **Setup Props** (the props passed to the parent component) as its **second argument**. This allows you to access parent props without closing over them.

```tsx
export const UserCard = setup((props) => {
  // Define a template that uses both its own props AND the parent's props
  const Avatar = template<{ size: number }>((templateProps, parentProps) => (
    <img 
      src={parentProps.avatarUrl} // From UserCard props
      width={templateProps.size}  // From <Avatar /> props
    />
  ), 'Avatar');

  return render(() => (
    <div className="card">
      <Avatar size={32} />
    </div>
  ));
});
```

> [!NOTE]
> Unlike `setup`, `template` runs frequently. It's safe to destructure props here because the function re-runs whenever the props change.

## Standalone Templates

You don't have to define templates inside `setup`. You can define them at the top level of your module. This is great for creating small, reusable reactive components that don't need their own setup logic.

```tsx
// components/Badge.tsx
import { template } from '@anchorlib/react';

export const Badge = template<{ count: number }>(({ count }) => (
  <span className="badge">{count}</span>
), 'Badge');
```

## Anti-Patterns

### ❌ No Side Effects in Render
Never mutate state inside a `template` or `render` function. This causes infinite loops and unpredictable behavior.

```tsx
// ❌ WRONG: Mutating state during render
const BadView = template(() => {
  state.count++; // 💥 Infinite Loop!
  return <div>{state.count}</div>;
});
```

If you need to update state, use an **Event Handler** or an **Effect** in the `setup` phase.

## Best Practices

### 1. Balance Granularity
Avoid creating templates that are too large (monolithic) or too small (micro-components).

-   **Too Big**: Wrapping a whole page in one `template` means the entire page re-renders on any small change.
-   **Too Small**: Creating a separate `template` for every single text node (e.g., `const Name = template(...)`) adds unnecessary overhead.

**Goal**: Group relevant logic and UI into a single template. If a section of the UI updates together, it belongs in the same template.

### 2. Provide Display Names
By default, templates created inside `setup` will show up as `Anonymous` or `View` in React DevTools, which makes debugging hard. **Always provide a display name** as the second argument.

```tsx
// ❌ Hard to debug: shows as <View(Anonymous)>
const Header = template(() => <header>...</header>);

// ✅ Easy to debug: shows as <View(Header)>
const Header = template(() => <header>...</header>, 'Header');
```

### 3. Keep Static Layouts Static
If a part of your UI never changes (like a layout wrapper), don't put it inside a `template`. Return it directly from `setup` and only use `template` for the dynamic parts.

```tsx
// ✅ Good: The div never re-renders, only the <Count /> does.
return (
  <div className="card">
    <h1>Static Title</h1>
    <Count />
  </div>
);
```
