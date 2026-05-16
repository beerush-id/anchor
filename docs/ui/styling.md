---
title: 'UI Styling'
description: 'Learn how to manage UI styling in the AIR Stack. Discover patterns for static styling, dynamic styling, and conditional CSS states.'
---

# Styling

Styling scales based on visual reuse and conditional states.

## Static Styling

### Inline Classes (Single-Use)
When a visual combination is used exactly once, keep it inline.

```tsx
<button class="text-white bg-black p-4">Click</button>
```

::: tip Why keep it inline?
Maintaining code is top-down. If you scatter single-use styles into global CSS classes or Components, you force yourself into back-and-forth scanning between files for zero reusability return.
:::

### Local Variable (Local Reuse)
When a visual combination is repeated on the same page, extract it locally.

```tsx
const btnClass = "text-white bg-black p-4";

<button class={btnClass}>Click</button>
<button class={btnClass}>Submit</button>
```

::: tip Why not global?
Extracting locally prevents repetition without polluting the global namespace or introducing the "navigating multiple files" problem for a strictly local visual concern.
:::

### Global CSS (Global Reuse)
When a visual combination is repeated across the application, graduate it to a global CSS class.

```css
.btn {
  @apply text-white bg-black p-4;
}
```

## Dynamic Styling

### Inline Ternary (Single-Use)
When conditional logic is used exactly once, evaluate it inline.

```tsx
<button class={`text-white p-4 ${isActive ? 'bg-black' : 'bg-gray-500'}`}>
  Click
</button>
```

::: tip Why keep it inline?
Maintaining code is top-down. If you scatter single-use logic into functions or global state classes, you force yourself into back-and-forth scanning just to understand how one element reacts.
:::

### Local Function (Local Reuse)
When conditional logic is repeated on the same page, extract it to a local function.

```tsx
const getBtnClass = (isActive: boolean) => 
  `text-white p-4 ${isActive ? 'bg-black' : 'bg-gray-500'}`;

<button class={getBtnClass(true)}>Click</button>
```

::: tip Why not global?
Extracting locally prevents repetition without polluting global state modifiers or introducing the "navigating multiple files" problem for strictly local logic.
:::

### Global CSS State (Global Reuse)
When conditional logic is repeated across the application, map it to global CSS state modifiers.

```css
.btn {
  @apply text-white p-4 bg-gray-500;
}
.btn.is-active {
  @apply bg-black;
}
```

```tsx
<button class={`btn ${isActive ? 'is-active' : ''}`}>
  Click
</button>
```

## Learn More

- [Static UI](./static) — When UI should remain inline, and when it should graduate
- [Reactive UI](./view) — Presenting reactive data without owning it
- [Component](./component) — When a concern needs its own state, behavior, and reactivity
- [Data Components](./data) — Components that own and manage their server data
- [Form Components](./form) — User-driven form components with built-in validation
- [Headless Components](./headless) — Reusable logic units without a view
- [Composition](./composition) — Coordinating autonomous components into complete interfaces
